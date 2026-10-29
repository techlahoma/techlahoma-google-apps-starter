export const BOOT_TIMEOUT_MS = 120_000;
export const BRIDGE_TIMEOUT_MS = 20_000;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

export type PortResult =
  | {kind: 'missing'}
  | {kind: 'valid'; port: number}
  | {kind: 'invalid'; message: string};

const PORT_ERROR = 'Enter one port number between 1 and 65535.';

/** Only a canonical port is accepted; hosts and URLs are never input here. */
export function parsePort(value: string): PortResult {
  if (value === '') return {kind: 'missing'};
  if (!/^[1-9]\d{0,4}$/.test(value)) {
    return {kind: 'invalid', message: PORT_ERROR};
  }
  const port = Number(value);
  return port <= 65535
    ? {kind: 'valid', port}
    : {kind: 'invalid', message: PORT_ERROR};
}

export function portFromSearch(search: string): PortResult {
  const values = new URLSearchParams(search).getAll('mcp-port');
  if (values.length === 0) return {kind: 'missing'};
  if (values.length !== 1 || values[0] === '') {
    return {
      kind: 'invalid',
      message:
        'The link must contain exactly one valid mcp-port. Enter it below.',
    };
  }
  return parsePort(values[0]!);
}

export function importFileError(file: {
  name: string;
  size: number;
}): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'Choose a WordPress Playground ZIP export.';
  }
  if (file.size === 0) return 'That ZIP file is empty.';
  if (file.size > MAX_IMPORT_BYTES) {
    return 'Choose a ZIP no larger than 100 MiB for this browser demo. Keep your existing backup elsewhere.';
  }
  return null;
}

export function normalizeSiteName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new Error('A site name must contain between 1 and 80 characters.');
  }
  return value.trim();
}

/** Fixed so the agent configures the server and nobody copies a port. */
export const DEFAULT_MCP_PORT = 7811;
export const MCP_PACKAGE = '@wp-playground/mcp@3.1.58';

/** A self-contained Antigravity prompt; it assumes no checkout or files. */
export function agentStartPrompt(siteId: string, origin: string): string {
  const appUrl = `${origin.replace(/\/+$/, '')}/`;
  const config = JSON.stringify(
    {
      mcpServers: {
        'wordpress-workshop': {
          command: 'npx',
          args: [
            '-y',
            MCP_PACKAGE,
            `--url=${appUrl}`,
            `--port=${DEFAULT_MCP_PORT}`,
          ],
        },
      },
    },
    null,
    2,
  );
  return [
    `I'm in the WordPress Agent Workshop at ${appUrl}. WordPress runs in my browser tab there. Connect to it and help me update the site.`,
    '',
    '1. Add this MCP server to your MCP configuration, keeping any servers already there, then enable or refresh it:',
    '',
    config,
    '',
    '   It needs Node.js 24.18 or newer. If Node is missing or older, stop and tell me how to install it. Do not install anything without asking me.',
    '2. When the server is running, tell me to choose Connect agent on the workshop page.',
    `3. After I say I'm connected, call playground_list_sites and use the site whose siteId is ${siteId}. If it is not listed, stop and tell me. Do not open a new Playground tab; that creates a separate site.`,
    '4. First task: create a WordPress draft announcing this fictional event. Never publish or schedule it.',
    '   - Title: Build a small website with agents',
    '   - Organizer: Demo Developer Group, a fictional group',
    '   - When: March 14, 2030, 6:00–7:30 p.m. Central Time',
    '   - Venue: to be announced. Registration: not available yet. Do not invent either.',
    '   - Cost: free. Audience: anyone who can use a browser; no coding needed. Bring a laptop and charger.',
    '   Label it as a fictional workshop example, include AGENT-SKILLS-DEMO in the body, use heading, paragraph, and list blocks, and assign an Events category (create it if missing).',
    '5. Read the saved draft back, tell me its title and post ID, and open it in the editor. Then ask me what to change on the site next.',
  ].join('\n');
}
