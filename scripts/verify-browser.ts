#!/usr/bin/env bun

import {chromium, type Page} from 'playwright';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {readAppContract} from './app-contract-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');
const APPS_DIR = join(ROOT_DIR, 'apps');

interface Options {
  appSlug: string;
}

function parseArgs(): Options {
  const args = Bun.argv.slice(2);
  let appSlug = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--app' && args[i + 1]) {
      appSlug = args[i + 1]!;
      i++;
    }
  }
  if (!appSlug) {
    console.error('Error: --app <slug> is required');
    console.error('Usage: bun run app:browser:verify --app <slug>');
    process.exit(1);
  }
  return {appSlug};
}

async function findAvailablePort(startPort = 5180): Promise<number> {
  for (let port = startPort; port < startPort + 50; port++) {
    try {
      const server = Bun.serve({
        port,
        fetch() {
          return new Response('ok');
        },
      });
      void server.stop(true);
      return port;
    } catch {
      // Port in use, try next
    }
  }
  throw new Error('Could not find an available port for Vite server');
}

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304 || res.status === 200) return;
    } catch {
      // Server not ready yet
    }
    await new Promise(r => {
      setTimeout(r, 200);
    });
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

export async function runBrowserVerification(slug: string): Promise<void> {
  const appDir = join(APPS_DIR, slug);
  console.log(`\n=== Browser Verification: apps/${slug} ===`);

  if (!existsSync(appDir)) {
    throw new Error(`App workspace apps/${slug} does not exist`);
  }

  const contractInfo = readAppContract(appDir);
  if (!contractInfo) {
    throw new Error(`App apps/${slug} is missing app.contract.json`);
  }

  const {contract} = contractInfo;
  const specRelPath = contract.browserSpec || 'e2e/smoke.spec.ts';
  const specAbsPath = join(appDir, specRelPath);

  if (!existsSync(specAbsPath)) {
    throw new Error(`Browser spec file missing: apps/${slug}/${specRelPath}`);
  }

  const specContent = readFileSync(specAbsPath, 'utf8');
  if (
    specContent.includes('scaffold placeholder test') ||
    specContent.includes('SCAFFOLD_MARKER')
  ) {
    if (contract.status === 'complete') {
      throw new Error(
        `App apps/${slug} contract is status "complete" but browser spec contains unremoved scaffold markers`,
      );
    }
  }

  const port = await findAvailablePort();
  const baseURL = `http://127.0.0.1:${port}/`;
  console.log(`Starting Vite dev server for apps/${slug} on port ${port}...`);

  const devProcess = Bun.spawn(
    [
      'bun',
      'run',
      '--cwd',
      `apps/${slug}`,
      'dev',
      '--port',
      String(port),
      '--host',
      '127.0.0.1',
    ],
    {
      cwd: ROOT_DIR,
      env: Bun.env,
      stdout: 'ignore',
      stderr: 'inherit',
    },
  );

  let browser;
  const testResultsDir = join(appDir, 'test-results');
  mkdirSync(testResultsDir, {recursive: true});

  try {
    await waitForServer(baseURL);
    console.log(`Vite server ready at ${baseURL}`);

    browser = await chromium.launch({headless: true});

    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];
    const failedRequests: string[] = [];

    function attachMonitors(page: Page) {
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(`[Console Error] ${msg.text()}`);
        }
      });
      page.on('pageerror', err => {
        pageErrors.push(err);
      });
      page.on('response', res => {
        if (res.status() >= 400) {
          failedRequests.push(`[HTTP ${res.status()}] ${res.url()}`);
        }
      });
      page.on('requestfailed', req => {
        failedRequests.push(
          `[Failed Request] ${req.url()} (${req.failure()?.errorText || 'failed'})`,
        );
      });
    }

    // Try importing custom smoke test runner from spec file if exported
    let customModule: Record<string, unknown> | null = null;
    try {
      customModule = (await import(specAbsPath)) as Record<string, unknown>;
    } catch {
      // Standard spec file without export runner
    }

    const runSpecFn = (customModule?.default || customModule?.runSmokeTest) as
      | ((args: {
          page: Page;
          baseURL: string;
          viewport: 'desktop' | 'phone';
        }) => Promise<void>)
      | undefined;

    // 1. Desktop Verification (1440x900)
    console.log('Testing Desktop Viewport (1440x900)...');
    const desktopContext = await browser.newContext({
      viewport: {width: 1440, height: 900},
    });
    const desktopPage = await desktopContext.newPage();
    attachMonitors(desktopPage);

    if (typeof runSpecFn === 'function') {
      await runSpecFn({page: desktopPage, baseURL, viewport: 'desktop'});
    } else {
      await desktopPage.goto(baseURL, {waitUntil: 'networkidle'});
      await desktopPage.screenshot({
        path: join(testResultsDir, 'smoke-desktop.png'),
      });
    }
    await desktopContext.close();

    // 2. Phone Verification (390x844)
    console.log('Testing Phone Viewport (390x844)...');
    const phoneContext = await browser.newContext({
      viewport: {width: 390, height: 844},
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    const phonePage = await phoneContext.newPage();
    attachMonitors(phonePage);

    if (typeof runSpecFn === 'function') {
      await runSpecFn({page: phonePage, baseURL, viewport: 'phone'});
    } else {
      await phonePage.goto(baseURL, {waitUntil: 'networkidle'});
      await phonePage.screenshot({
        path: join(testResultsDir, 'smoke-phone.png'),
      });
    }
    await phoneContext.close();

    // Verification Checks
    const totalFailures: string[] = [];
    if (consoleErrors.length > 0) {
      totalFailures.push(
        `Console Errors (${consoleErrors.length}):\n  ${consoleErrors.join('\n  ')}`,
      );
    }
    if (pageErrors.length > 0) {
      totalFailures.push(
        `Page Uncaught Errors (${pageErrors.length}):\n  ${pageErrors.map(e => e.message).join('\n  ')}`,
      );
    }
    if (failedRequests.length > 0) {
      totalFailures.push(
        `Failed Network Requests (${failedRequests.length}):\n  ${failedRequests.join('\n  ')}`,
      );
    }

    if (totalFailures.length > 0) {
      throw new Error(
        `Browser verification failed for apps/${slug}:\n\n${totalFailures.join('\n\n')}`,
      );
    }

    console.log(
      `✓ Browser verification passed for apps/${slug} (Desktop 1440x900 & Phone 390x844, clean console & requests)`,
    );
  } catch (error) {
    console.error(
      `✗ Browser verification failed for apps/${slug}:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    if (browser) await browser.close();
    devProcess.kill();
  }
}

async function main() {
  const {appSlug} = parseArgs();
  await runBrowserVerification(appSlug);
}

if (import.meta.main) {
  main().catch(err => {
    console.error(
      `app:browser:verify error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
}
