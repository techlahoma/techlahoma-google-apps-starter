import type {Blueprint, PlaygroundClient} from '@wp-playground/client';
import type {McpBridgeHandle} from '@wp-playground/mcp/client';
import blueprintJson from '../public/blueprint.json';
import {
  agentStartPrompt,
  BOOT_TIMEOUT_MS,
  BRIDGE_TIMEOUT_MS,
  DEFAULT_MCP_PORT,
  importFileError,
  normalizeSiteName,
  portFromSearch,
} from './app';
import {createRevocableBridge} from './bridge';
import './style.css';

const REMOTE_URL = 'https://playground.wordpress.net/remote.html';
// This checked-in fixture is the only blueprint accepted by the launcher.
// Query strings cannot inject code, remote blueprints, hosts, or saved sites.
const blueprint = blueprintJson as Blueprint;

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing workshop element: ${id}`);
  return found as T;
}

const startButton = element<HTMLButtonElement>('start-wordpress');
const cancelStart = element<HTMLButtonElement>('cancel-start');
const runtimeStatus = element<HTMLOutputElement>('runtime-status');
const runtimeError = element<HTMLParagraphElement>('runtime-error');
const runtimeDot = element<HTMLSpanElement>('runtime-dot');
const connectButton = element<HTMLButtonElement>('connect-mcp');
const disconnectButton = element<HTMLButtonElement>('disconnect-mcp');
const bridgeStatus = element<HTMLOutputElement>('bridge-status');
const bridgeDetail = element<HTMLParagraphElement>('bridge-detail');
const exportButton = element<HTMLButtonElement>('export-site');
const importButton = element<HTMLButtonElement>('import-site');
const importInput = element<HTMLInputElement>('import-file');
const fileStatus = element<HTMLOutputElement>('file-status');
const resetButton = element<HTMLButtonElement>('reset-site');
const postsButton = element<HTMLButtonElement>('show-posts');
const viewButton = element<HTMLButtonElement>('show-site');
const frameContainer = element<HTMLDivElement>('playground-frame');
const emptyState = element<HTMLDivElement>('empty-state');
const siteIdOutput = element<HTMLElement>('site-id');
const siteTitle = element<HTMLHeadingElement>('workspace-title');
const agentPrompt = element<HTMLTextAreaElement>('agent-prompt');
const promptStatus = element<HTMLOutputElement>('prompt-status');

type Phase = 'idle' | 'starting' | 'ready' | 'error';
let phase: Phase = 'idle';
let busy = false;
let client: PlaygroundClient | undefined;
// A link from playground_get_website_url may carry its own port.
const linkedPort = portFromSearch(window.location.search);
const bridgePort =
  linkedPort.kind === 'valid' ? linkedPort.port : DEFAULT_MCP_PORT;
let siteId = freshSiteId();
let siteName = 'Agent Workshop demo';
let bootGeneration = 0;
let needsReload = false;
let bootTimer: ReturnType<typeof setTimeout> | undefined;
let bridge: McpBridgeHandle | undefined;
let bridgeGeneration = 0;
let connecting = false;
let bridgeTimer: ReturnType<typeof setTimeout> | undefined;

function freshSiteId(): string {
  // Never reuse a URL's site-slug: every tab owns an independent memory site.
  return `workshop-${crypto.randomUUID()}`;
}

function message(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 300)
    : 'An unexpected error occurred.';
}

function showText(target: HTMLElement, text: string): void {
  target.textContent = text;
  target.hidden = !text;
}

function updateControls(): void {
  const ready = phase === 'ready' && !busy;
  startButton.hidden = phase === 'ready' || phase === 'starting';
  startButton.textContent = needsReload
    ? 'Reload to retry'
    : 'Start WordPress →';
  cancelStart.hidden = phase !== 'starting';
  connectButton.hidden = Boolean(bridge) || connecting;
  connectButton.disabled = !ready;
  disconnectButton.hidden = !bridge && !connecting;
  for (const button of [
    exportButton,
    importButton,
    resetButton,
    postsButton,
    viewButton,
  ]) {
    button.disabled = !ready;
  }
  runtimeDot.dataset.state = phase;
  runtimeStatus.textContent = {
    idle: 'Not started',
    starting: 'Starting WordPress…',
    ready: 'Ready',
    error: 'Could not start',
  }[phase];
  siteIdOutput.textContent = siteId;
  agentPrompt.value = agentStartPrompt(siteId, window.location.origin);
  siteTitle.textContent = siteName;
}

function showEmptyState(title: string, detail: string): void {
  const heading = emptyState.querySelector('h3');
  const paragraph = emptyState.querySelector('p:not(.small-heading)');
  if (heading) heading.textContent = title;
  if (paragraph) paragraph.textContent = detail;
  frameContainer.replaceChildren(emptyState);
}

function disconnectMcp(
  text = 'Disconnected. New MCP access is blocked; a command already running may still finish.',
): void {
  bridgeGeneration++;
  clearTimeout(bridgeTimer);
  bridgeTimer = undefined;
  bridge?.stop();
  bridge = undefined;
  connecting = false;
  bridgeStatus.textContent = text;
  showText(bridgeDetail, '');
  updateControls();
}

function endRuntime(): void {
  // The SDK exposes no cancellation for an unfinished iframe handshake.
  // A full reload before retry discards its pending message/timer loops.
  if (phase === 'starting') needsReload = true;
  bootGeneration++;
  clearTimeout(bootTimer);
  bootTimer = undefined;
  disconnectMcp();
  client = undefined;
  // Removing the frame tears down this tab's disposable runtime.
  frameContainer.replaceChildren();
}

function bootFailed(detail: string): void {
  endRuntime();
  phase = 'error';
  showText(runtimeError, detail);
  showEmptyState(
    'WordPress could not start.',
    'Check your connection and open this app in its own browser tab, then choose Reload to retry.',
  );
  updateControls();
}

async function startWordPress(): Promise<void> {
  if (needsReload) {
    window.location.reload();
    return;
  }
  if (phase === 'starting' || phase === 'ready') return;
  phase = 'starting';
  showText(runtimeError, '');
  updateControls();
  const generation = ++bootGeneration;
  bootTimer = setTimeout(() => {
    if (generation !== bootGeneration) return;
    bootFailed(
      'WordPress did not become ready within two minutes. The hosted runtime or its downloads may be blocked. Open the deployed HTTPS app in a top-level tab, check your connection and browser storage permissions, then retry.',
    );
  }, BOOT_TIMEOUT_MS);

  try {
    // Deferred import keeps the normal shell independent of the WASM runtime.
    const {startPlaygroundWeb} = await import('@wp-playground/client');
    if (generation !== bootGeneration) return;
    const iframe = document.createElement('iframe');
    iframe.title = 'WordPress demo site';
    iframe.allow = 'clipboard-write';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frameContainer.replaceChildren(iframe);
    const startedClient = await startPlaygroundWeb({
      iframe,
      remoteUrl: REMOTE_URL,
      scope: crypto.randomUUID().replaceAll('-', ''),
      blueprint,
      disableProgressBar: false,
    });
    if (generation !== bootGeneration) return;
    clearTimeout(bootTimer);
    bootTimer = undefined;
    client = startedClient;
    phase = 'ready';
    updateControls();
  } catch (error) {
    if (generation !== bootGeneration) return;
    bootFailed(
      `WordPress startup failed. ${message(error)} Open this app in its own tab and retry.`,
    );
  }
}

async function connectMcp(): Promise<void> {
  if (phase !== 'ready' || busy || connecting || bridge) return;
  const generation = ++bridgeGeneration;
  connecting = true;
  bridgeStatus.textContent = `Connecting to your agent on port ${bridgePort}…`;
  showText(
    bridgeDetail,
    'If your browser asks, allow this site to connect to your local network.',
  );
  updateControls();
  bridgeTimer = setTimeout(() => {
    if (generation !== bridgeGeneration) return;
    disconnectMcp(
      'Could not open the bridge within 20 seconds. Check that Antigravity says the WordPress MCP server is running, allow this site to reach your local network if the browser asks, then try Connect again.',
    );
  }, BRIDGE_TIMEOUT_MS);

  try {
    const {startMcpBridge} = await import('@wp-playground/mcp/client');
    if (generation !== bridgeGeneration) return;
    bridge = createRevocableBridge(
      startMcpBridge,
      {
        list: () =>
          client
            ? [{slug: siteId, name: siteName, storage: 'none', isActive: true}]
            : [],
        getClient: () => (phase === 'ready' && !busy ? client : undefined),
        rename: async newName => {
          siteName = normalizeSiteName(newName);
          updateControls();
          bridge?.notifySitesChanged();
        },
        saveInBrowser: async () => {
          throw new Error(
            'This workshop wrapper stores sites in memory only. Use its Export ZIP button to keep your work. Browser persistence is not implemented.',
          );
        },
        onConnect: () => {
          if (generation !== bridgeGeneration) return;
          clearTimeout(bridgeTimer);
          bridgeTimer = undefined;
          bridgeStatus.textContent = `Bridge opened at ${new Date().toLocaleTimeString()}. Verify this site in Antigravity.`;
          showText(
            bridgeDetail,
            'This is the last observed socket opening, not a live health check. The official bridge retries after a dropped connection until you choose Disconnect.',
          );
        },
      },
      bridgePort,
    );
    connecting = false;
    updateControls();
  } catch (error) {
    if (generation !== bridgeGeneration) return;
    disconnectMcp(`Could not start the local bridge. ${message(error)}`);
  }
}

async function exportSite(): Promise<void> {
  if (!client || phase !== 'ready' || busy) return;
  const activeClient = client;
  disconnectMcp('Disconnected for ZIP export. Reconnect when you are ready.');
  busy = true;
  fileStatus.textContent = 'Preparing your ZIP…';
  updateControls();
  try {
    const {zipWpContent} = await import('@wp-playground/client');
    const archive = await zipWpContent(activeClient);
    const bytes = new Uint8Array(archive);
    const url = URL.createObjectURL(
      new Blob([bytes.buffer], {type: 'application/zip'}),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${siteId}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fileStatus.textContent =
      'ZIP download requested. Keep the downloaded file before closing this tab.';
  } catch (error) {
    fileStatus.textContent = `Export failed. ${message(error)} Keep this tab open and try again.`;
  } finally {
    busy = false;
    updateControls();
  }
}

async function importSite(): Promise<void> {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file || !client || phase !== 'ready' || busy) return;
  const validationError = importFileError(file);
  if (validationError) {
    fileStatus.textContent = validationError;
    return;
  }
  if (
    !window.confirm(
      'Replace this tab’s WordPress site with the selected ZIP? This cannot be undone. Cancel and export your current work first if you need it. Only import a ZIP you trust.',
    )
  )
    return;
  const activeClient = client;
  disconnectMcp(
    'Disconnected for ZIP import. Reconnect after checking the restored site.',
  );
  busy = true;
  fileStatus.textContent = 'Importing your ZIP…';
  element<HTMLSpanElement>('site-content-label').textContent = 'IMPORTED ZIP';
  siteName = 'Imported WordPress site';
  updateControls();
  try {
    const {importWordPressFiles} = await import('@wp-playground/client');
    await importWordPressFiles(activeClient, {wordPressFilesZip: file});
    await activeClient.goTo('/wp-admin/');
    fileStatus.textContent =
      'ZIP imported. Sign in to WordPress if requested, check your content, then reconnect MCP.';
  } catch (error) {
    fileStatus.textContent = `Import failed. ${message(error)} The site may be partly changed. Restore your previous ZIP or reset the demo.`;
  } finally {
    busy = false;
    updateControls();
  }
}

async function navigate(path: string): Promise<void> {
  if (!client || phase !== 'ready' || busy) return;
  try {
    await client.goTo(path);
  } catch (error) {
    fileStatus.textContent = `Could not navigate the site. ${message(error)}`;
  }
}

startButton.addEventListener('click', () => void startWordPress());
cancelStart.addEventListener('click', () => {
  endRuntime();
  phase = 'idle';
  showEmptyState(
    'Startup cancelled.',
    'Choose Reload to retry, then Start WordPress when you are ready.',
  );
  updateControls();
});
connectButton.addEventListener('click', () => void connectMcp());
disconnectButton.addEventListener('click', () => disconnectMcp());
exportButton.addEventListener('click', () => void exportSite());
importButton.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => void importSite());
postsButton.addEventListener(
  'click',
  () => void navigate('/wp-admin/edit.php'),
);
viewButton.addEventListener('click', () => void navigate('/'));
resetButton.addEventListener('click', () => {
  if (
    busy ||
    !window.confirm(
      'Discard all edits and start a fresh demo? Export a ZIP first if you need to keep this site.',
    )
  )
    return;
  endRuntime();
  phase = 'idle';
  siteId = freshSiteId();
  siteName = 'Agent Workshop demo';
  element<HTMLSpanElement>('site-content-label').textContent = 'FICTIONAL DEMO';
  fileStatus.textContent = '';
  void startWordPress();
});
async function copyAgentPrompt(status: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(agentPrompt.value);
    showText(status, 'Prompt copied. Paste it into Antigravity.');
  } catch {
    agentPrompt.focus();
    agentPrompt.select();
    showText(
      status,
      'Copy is blocked here. The prompt is selected; copy it manually.',
    );
  }
}
element<HTMLButtonElement>('copy-prompt').addEventListener(
  'click',
  () => void copyAgentPrompt(promptStatus),
);
const workspace = element<HTMLElement>('workspace');
const fullscreenLabel = element<HTMLSpanElement>('fullscreen-label');

/** Expands the workspace in place; moving the iframe would reload WordPress. */
function setExpanded(expanded: boolean): void {
  workspace.classList.toggle('is-fullscreen', expanded);
  document.body.classList.toggle('workspace-expanded', expanded);
  fullscreenLabel.textContent = expanded ? 'Exit full screen' : 'Full screen';
}
element<HTMLButtonElement>('toggle-fullscreen').addEventListener(
  'click',
  () => {
    if (workspace.classList.contains('is-fullscreen')) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setExpanded(false);
      return;
    }
    // Expand first: some embedded browsers never settle requestFullscreen().
    setExpanded(true);
    if (document.fullscreenEnabled) {
      workspace.requestFullscreen().catch(() => {
        // The in-page layout already fills the window.
      });
    }
  },
);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setExpanded(false);
});
document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    !document.fullscreenElement &&
    workspace.classList.contains('is-fullscreen')
  ) {
    setExpanded(false);
  }
});
window.addEventListener('beforeunload', event => {
  if (phase === 'ready' || busy) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', () => disconnectMcp());

if (new URLSearchParams(window.location.search).has('site-slug')) {
  showText(
    element<HTMLParagraphElement>('site-notice'),
    'This app cannot reopen a saved site by ID. This tab has a new, separate site. Return to the original tab or import its ZIP.',
  );
}
updateControls();
