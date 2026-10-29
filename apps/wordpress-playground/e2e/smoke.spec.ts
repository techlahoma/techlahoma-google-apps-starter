import assert from 'node:assert/strict';
import {join} from 'node:path';
import type {Page} from 'playwright';

/** Local shell/error proof. This deliberately does not claim a real WASM boot. */
export async function runSmokeTest({
  page,
  baseURL,
  viewport,
}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}): Promise<void> {
  const appOrigin = new URL(baseURL).origin;
  const offOriginRequests: string[] = [];
  const bridgeSockets: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== appOrigin) {
      offOriginRequests.push(request.url());
    }
  });
  page.on('websocket', socket => {
    const url = new URL(socket.url());
    if (url.port !== new URL(baseURL).port) bridgeSockets.push(socket.url());
  });

  await page.goto(`${baseURL}?mcp-port=54123`, {waitUntil: 'networkidle'});
  assert.match(await page.locator('h1').innerText(), /WordPress/);
  assert.equal(
    await page.locator('#runtime-status').innerText(),
    'Not started',
  );
  const prompt = await page.locator('#agent-prompt').inputValue();
  assert.match(prompt, /"@wp-playground\/mcp@3\.1\.58"/);
  assert.match(prompt, new RegExp(`--url=${appOrigin}/`));
  assert.doesNotMatch(prompt, /apps\/|\.md\b/);
  assert.equal(await page.locator('#connect-mcp').isDisabled(), true);
  assert.equal(await page.locator('#playground-frame iframe').count(), 0);
  assert.match(
    await page.locator('.memory-notice').innerText(),
    /loses your edits/,
  );
  const firstSiteId = await page.locator('#site-id').innerText();
  assert.match(firstSiteId, /^workshop-[0-9a-f-]{36}$/);
  assert.deepEqual(
    offOriginRequests,
    [],
    'The shell must not contact the runtime or loopback bridge',
  );
  assert.deepEqual(
    bridgeSockets,
    [],
    'A URL parameter must not grant connection consent',
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
    'The shell must fit the viewport',
  );
  await page.screenshot({
    path: join(
      process.cwd(),
      'apps',
      'wordpress-playground',
      'test-results',
      `smoke-${viewport}.png`,
    ),
    fullPage: true,
  });

  await page.goto(
    `${baseURL}?mcp-port=54123&mcp-port=54124&site-slug=${firstSiteId}`,
    {waitUntil: 'networkidle'},
  );
  assert.notEqual(await page.locator('#site-id').innerText(), firstSiteId);
  assert.match(
    await page.locator('#site-notice').innerText(),
    /new, separate site/,
  );
  assert.equal(await page.locator('#connect-mcp').isDisabled(), true);
  assert.deepEqual(offOriginRequests, []);
  assert.deepEqual(bridgeSockets, []);

  // A deliberately unresponsive, successful HTTP fixture isolates our timeout
  // recovery from upstream availability. It is not a passing WordPress runtime.
  await page.route('https://playground.wordpress.net/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Unresponsive runtime test fixture</title>',
    }),
  );
  await page.locator('#start-wordpress').click();
  await page
    .locator(
      '#playground-frame iframe[src^="https://playground.wordpress.net/"]',
    )
    .waitFor();
  await page.locator('#cancel-start').click();
  assert.equal(
    await page.locator('#runtime-status').innerText(),
    'Not started',
  );
  assert.equal(await page.locator('#playground-frame iframe').count(), 0);
  assert.equal(
    await page.locator('#start-wordpress').innerText(),
    'Reload to retry',
  );
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.locator('#start-wordpress').click(),
  ]);
  await page.waitForFunction(
    () =>
      document.querySelector('#runtime-status')?.textContent === 'Not started',
  );
  await page.clock.install();
  await page.locator('#start-wordpress').click();
  await page
    .locator(
      '#playground-frame iframe[src^="https://playground.wordpress.net/"]',
    )
    .waitFor();
  assert.equal(
    await page.locator('#runtime-status').innerText(),
    'Starting WordPress…',
  );
  assert.equal(await page.locator('#connect-mcp').isDisabled(), true);
  await page.clock.fastForward(121_000);
  await page.locator('#runtime-error').waitFor({state: 'visible'});
  assert.match(
    await page.locator('#runtime-error').innerText(),
    /within two minutes/,
  );
  assert.equal(
    await page.locator('#runtime-status').innerText(),
    'Could not start',
  );
  assert.equal(await page.locator('#playground-frame iframe').count(), 0);
  assert.equal(
    await page.locator('#start-wordpress').innerText(),
    'Reload to retry',
  );
  assert.equal(await page.locator('#connect-mcp').isDisabled(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
    'The error state must fit the viewport',
  );
  assert.deepEqual(
    bridgeSockets,
    [],
    'Even a started runtime must not connect MCP automatically',
  );
  assert.equal(
    offOriginRequests.every(
      url => new URL(url).hostname === 'playground.wordpress.net',
    ),
    true,
  );
  await page.screenshot({
    path: join(
      process.cwd(),
      'apps',
      'wordpress-playground',
      'test-results',
      `smoke-error-${viewport}.png`,
    ),
    fullPage: true,
  });
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.locator('#start-wordpress').click(),
  ]);
  await page.waitForFunction(
    () =>
      document.querySelector('#runtime-status')?.textContent === 'Not started',
  );
  assert.equal(
    await page.locator('#runtime-status').innerText(),
    'Not started',
  );
  assert.equal(await page.locator('#playground-frame iframe').count(), 0);
}

export default runSmokeTest;
