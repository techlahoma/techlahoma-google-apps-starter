#!/usr/bin/env bun
// Optional real proof: bun apps/wordpress-playground/e2e/mcp-roundtrip.ts [--mcp-only]
// Local HTTP only; this cannot prove hosted HTTPS permissions or browser compatibility.
import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import {randomBytes, randomUUID} from 'node:crypto';
import {request} from 'node:http';
import {createServer, type AddressInfo} from 'node:net';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {chromium, type Browser} from 'playwright';
import {browserLaunchOptions} from '../../../scripts/browser-runtime';

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  return value as ObjectValue;
}
async function bounded<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out (${ms} ms)`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function stop(child: ChildProcess | undefined) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  const exited = new Promise<void>(resolve =>
    child.once('exit', () => resolve()),
  );
  child.kill('SIGTERM');
  try {
    await bounded(exited, 3000, 'Owned process shutdown');
  } catch {
    child.kill('SIGKILL');
    await bounded(exited, 3000, 'Owned process kill');
  }
}
function upgradeStatus(url: string, origin: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      headers: {
        Origin: origin,
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
      },
    });
    req.on('response', response => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    req.on('upgrade', (response, socket) => {
      socket.destroy();
      resolve(response.statusCode ?? 0);
    });
    req.on('error', reject);
    req.setTimeout(5000, () =>
      req.destroy(new Error('WebSocket handshake timed out')),
    );
    req.end();
  });
}

async function main() {
  assert(
    process.versions.bun,
    'Run this proof with the repository-pinned Bun.',
  );
  const args = process.argv.slice(2);
  assert(
    args.every(arg => arg === '--mcp-only'),
    'Only --mcp-only is supported.',
  );
  const mcpOnly = args.includes('--mcp-only');
  if (!mcpOnly && process.platform === 'win32') {
    throw new Error(
      'Bun 1.3.14 Windows Playwright pipe limitation: use --mcp-only, then run browser proof on macOS/Linux.',
    );
  }
  const appDir = fileURLToPath(new URL('../', import.meta.url));
  let browser: Browser | undefined;
  let vite: ChildProcess | undefined;
  let mcp: ReturnType<typeof spawn> | undefined;
  let stage = 'startup';
  let processFailure: Error | undefined;
  try {
    let baseURL = 'https://workshop-proof.invalid/';
    if (!mcpOnly) {
      const listener = createServer();
      await new Promise<void>((resolve, reject) => {
        listener.once('error', reject);
        listener.listen(0, '127.0.0.1', resolve);
      });
      const port = (listener.address() as AddressInfo).port;
      await new Promise<void>((resolve, reject) =>
        listener.close(error => (error ? reject(error) : resolve())),
      );
      baseURL = `http://127.0.0.1:${port}/`;
      const viteEntry = fileURLToPath(
        new URL('bin/vite.js', import.meta.resolve('vite/package.json')),
      );
      vite = spawn(
        process.execPath,
        [
          viteEntry,
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort',
        ],
        {
          cwd: appDir,
          stdio: ['ignore', 'ignore', 'inherit'],
          windowsHide: true,
        },
      );
      vite.on('error', error => {
        processFailure = error;
      });
      await bounded(
        (async () => {
          while (true) {
            if (processFailure) throw processFailure;
            if (vite?.exitCode !== null)
              throw new Error('Vite exited before becoming ready.');
            try {
              if (
                (await fetch(baseURL, {signal: AbortSignal.timeout(1000)})).ok
              )
                return;
            } catch {
              /* Booting. */
            }
            await Bun.sleep(200);
          }
        })(),
        15000,
        'Vite startup',
      );
    }
    stage = 'MCP stdio and bridge authentication';
    mcp = spawn(
      'node',
      [
        fileURLToPath(new URL('../scripts/mcp.mjs', import.meta.url)),
        `--url=${baseURL}`,
      ],
      {cwd: appDir, stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true},
    );
    mcp.on('error', error => {
      processFailure = error;
    });
    assert(mcp.stdin && mcp.stdout);
    const input = mcp.stdin;
    const lines = createInterface({input: mcp.stdout})[Symbol.asyncIterator]();
    let sequence = 0;
    async function rpc(
      method: string,
      params: ObjectValue,
    ): Promise<ObjectValue> {
      const id = ++sequence;
      input.write(`${JSON.stringify({jsonrpc: '2.0', id, method, params})}\n`);
      return bounded(
        (async () => {
          while (true) {
            const line = await lines.next();
            assert(
              !line.done,
              processFailure?.message ?? 'MCP stdout closed before a response.',
            );
            const message = object(JSON.parse(line.value));
            if (message.id !== id) continue;
            assert(
              !message.error,
              `MCP ${method} failed: ${JSON.stringify(message.error)}`,
            );
            return object(message.result);
          }
        })(),
        60000,
        `MCP ${method}`,
      );
    }
    async function tool(name: string, arguments_: ObjectValue = {}) {
      const result = await rpc('tools/call', {name, arguments: arguments_});
      assert(
        !result.isError,
        `Tool ${name} failed: ${JSON.stringify(result.content)}`,
      );
      assert(Array.isArray(result.content));
      const text = object(result.content[0]).text;
      assert(typeof text === 'string');
      return object(JSON.parse(text));
    }
    await rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: {name: 'workshop-real-proof', version: '1.0.0'},
    });
    input.write(
      `${JSON.stringify({jsonrpc: '2.0', method: 'notifications/initialized'})}\n`,
    );
    const {url} = await tool('playground_get_website_url');
    assert(typeof url === 'string');
    const launch = new URL(url);
    assert.equal(launch.origin, new URL(baseURL).origin);
    const port = Number(launch.searchParams.get('mcp-port'));
    assert(Number.isInteger(port) && port > 0 && port <= 65535);
    const endpoint = `http://127.0.0.1:${port}`;
    const tokenResponse = await fetch(`${endpoint}/bridge-token`, {
      headers: {Origin: launch.origin},
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(tokenResponse.status, 200);
    assert.equal(
      tokenResponse.headers.get('access-control-allow-origin'),
      launch.origin,
    );
    const {token} = object(await tokenResponse.json());
    assert(typeof token === 'string' && token.length > 0);
    for (const headers of [{Origin: 'https://unrelated-proof.invalid'}, {}]) {
      assert.equal(
        (
          await fetch(`${endpoint}/bridge-token`, {
            headers,
            signal: AbortSignal.timeout(5000),
          })
        ).status,
        403,
      );
    }
    assert.equal(
      await upgradeStatus(`${endpoint}/?token=invalid`, launch.origin),
      401,
    );
    assert.equal(
      await upgradeStatus(
        `${endpoint}/?token=${encodeURIComponent(token)}`,
        'https://unrelated-proof.invalid',
      ),
      403,
    );
    assert.equal(
      await upgradeStatus(
        `${endpoint}/?token=${encodeURIComponent(token)}`,
        launch.origin,
      ),
      101,
    );
    console.log(
      'PASS: actual MCP stdio, configured origin, token endpoint, and WebSocket authentication.',
    );
    if (mcpOnly) return;
    stage = 'real browser and WordPress boot';
    browser = await chromium.launch({...browserLaunchOptions, timeout: 30000});
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.locator('#start-wordpress').click();
    await page
      .locator('#runtime-status')
      .filter({hasText: /^Ready/})
      .waitFor({timeout: 120000});
    const siteId = (await page.locator('#site-id').textContent())?.trim();
    assert(siteId, 'The app must expose its real session site ID.');
    await page.locator('#connect-mcp').click();
    await bounded(
      (async () => {
        while (true) {
          const {sites} = await tool('playground_list_sites');
          assert(Array.isArray(sites));
          if (sites.some(site => object(site).siteId === siteId)) return;
          await Bun.sleep(250);
        }
      })(),
      30000,
      'Browser site registration',
    );
    stage = 'draft creation and persisted REST readback';
    const title = `MCP real proof ${randomUUID()}`;
    const content = '<p>Created through the real local MCP bridge.</p>';
    const created = await tool('playground_request', {
      siteId,
      url: '/wp-json/wp/v2/posts',
      method: 'POST',
      body: {title, content, status: 'draft'},
    });
    assert.equal(created.httpStatusCode, 201);
    assert(typeof created.text === 'string');
    const postId = object(JSON.parse(created.text)).id;
    assert(typeof postId === 'number' && postId > 0);
    const read = await tool('playground_request', {
      siteId,
      url: `/wp-json/wp/v2/posts/${postId}?context=edit&_fields=id,status,title,content`,
    });
    assert.equal(read.httpStatusCode, 200);
    assert(typeof read.text === 'string');
    const post = object(JSON.parse(read.text));
    assert.equal(post.id, postId);
    assert.equal(post.status, 'draft');
    assert.equal(object(post.title).raw, title);
    assert.equal(String(object(post.content).raw).trim(), content);
    console.log(
      JSON.stringify({
        result: 'PASS local real roundtrip',
        browser: browser.version(),
        siteId,
        postId,
        status: post.status,
      }),
    );
  } catch (error) {
    throw new Error(
      `FAILED / UNVERIFIED at ${stage}: ${error instanceof Error ? error.message : String(error)}`,
      {cause: error},
    );
  } finally {
    await Promise.all([
      browser
        ? bounded(browser.close(), 10000, 'Owned browser close')
        : undefined,
      stop(mcp),
      stop(vite),
    ]);
  }
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
