import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {browserLaunchOptions} from '../../../../scripts/browser-runtime';

const base = Bun.argv[2] ?? 'http://127.0.0.1:5201';
const modelId = Bun.argv[3] ?? 'minicpm5-2b';
if (!['minicpm5-2b', 'qwen3-0.6b'].includes(modelId))
  throw new Error('Choose a supported model');
const browser = await chromium.launchPersistentContext(
  Bun.env.SEMIF_PROOF_PROFILE ?? join(tmpdir(), 'gdg-local-jev-proof-profile'),
  {...browserLaunchOptions, viewport: {width: 1440, height: 1000}},
);
const output = `apps/building-ai-models-without-coding/test-results/local-jev/${modelId}`;
await mkdir(output, {recursive: true});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request =>
    requests.push(
      `${request.method()} ${request.url()} ${request.postData() ?? ''}`,
    ),
  );
  await page.goto(`${base}/#local-jev`);
  await page.getByRole('heading', {name: 'Local Jev', exact: true}).waitFor();
  if ((await page.locator('nav[aria-label="Workshop demos"] a').count()) !== 4)
    throw new Error('Secret route changed visible navigation');
  await page.waitForTimeout(800);
  if (requests.some(request => /\.gguf/.test(request)))
    throw new Error('Weights downloaded without load action');
  const gpu = await page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter || adapter.info.isFallbackAdapter)
      throw new Error('Hardware GPU required');
    return {
      vendor: adapter.info.vendor,
      architecture: adapter.info.architecture,
    };
  });
  console.log(JSON.stringify({stage: 'hardware', ...gpu}));
  await page.locator('#jev-model').selectOption(modelId);
  await page.locator('#jev-load').click();
  let previous = '';
  const started = Date.now();
  while ((await page.locator('meter').count()) !== 2) {
    const status = await page.getByRole('status').last().innerText();
    if (status !== previous) {
      console.log(status);
      previous = status;
    }
    if (await page.getByRole('alert').count())
      throw new Error(await page.getByRole('alert').innerText());
    if (Date.now() - started > 600_000)
      throw new Error('Load/first score exceeded ten minutes');
    await page.waitForTimeout(1000);
  }
  const read = async () => ({
    verdict: await page.locator('.jev-verdict strong').innerText(),
    scores: await page
      .locator('meter')
      .evaluateAll(elements =>
        elements.map(element => Number(element.getAttribute('value'))),
      ),
    timing: await page.locator('.jev-scores > .description').innerText(),
  });
  const first = await read();
  console.log(JSON.stringify({stage: 'first', ...first}));
  await page
    .locator('[data-post="release"]')
    .evaluate(element => element.scrollIntoView({block: 'center'}));
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-post="release"]')
        ?.getAttribute('data-active') === 'true',
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll('meter').length === 2 &&
      document.querySelector('[role="status"]')?.textContent ===
        'Current text scored.',
  );
  const second = await read();
  console.log(JSON.stringify({stage: 'scroll', ...second}));
  const feedResults = [];
  for (const id of ['leadership', 'meetup', 'mixed']) {
    const card = page.locator(`[data-post="${id}"]`);
    const text = await card.locator('p').innerText();
    await card.evaluate(element => element.scrollIntoView({block: 'center'}));
    await page.waitForFunction(
      ({id, text}) =>
        document
          .querySelector(`[data-post="${id}"]`)
          ?.getAttribute('data-active') === 'true' &&
        document.querySelector('.jev-receipt')?.textContent?.includes(text) &&
        document.querySelectorAll('meter').length === 2,
      {id, text},
      {timeout: 120_000},
    );
    feedResults.push({id, ...(await read())});
  }
  await page
    .getByRole('button', {name: 'Try your own text', exact: true})
    .click();
  await page.locator('#jev-draft').fill('');
  await page.waitForTimeout(100);
  if (await page.locator('meter').count())
    throw new Error('Empty input kept obsolete score');
  const marker = 'LOCAL_JEV_PRIVACY_7821';
  await page.locator('#jev-draft').fill(`The export now uses UTC. ${marker}`);
  await page.waitForTimeout(750);
  await page
    .locator('#jev-draft')
    .fill('We empower synergies to unlock an unprecedented future.');
  await page
    .locator('#jev-draft')
    .fill('The CSV export now uses UTC dates. Refresh to update.');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('meter').length === 2 &&
      document.querySelector('[role="status"]')?.textContent ===
        'Current text scored.',
    null,
    {timeout: 120_000},
  );
  const latest = await read();
  if (
    !(await page.locator('.jev-receipt').textContent())?.includes(
      'The CSV export now uses UTC dates. Refresh to update.',
    )
  )
    throw new Error('Result belongs to an obsolete input');
  if (requests.some(request => request.includes(marker)))
    throw new Error('Editor text left the browser');
  await page.getByRole('button', {name: 'Pause', exact: true}).click();
  await page.locator('#jev-draft').fill('A different paused input.');
  await page.waitForTimeout(1000);
  if (await page.locator('meter').count())
    throw new Error('Paused edits show obsolete score');
  await page.getByRole('button', {name: 'Resume', exact: true}).click();
  await page.waitForFunction(
    () => document.querySelectorAll('meter').length === 2,
    null,
    {timeout: 120_000},
  );
  await page.screenshot({path: `${output}/desktop.png`, fullPage: true});
  await page
    .getByRole('button', {name: 'Stop and unload', exact: true})
    .click();
  if (await page.locator('meter').count())
    throw new Error('Unload kept result');
  if (errors.length) throw new Error(errors.join('\n'));
  for (const result of [first, second, latest]) {
    if (
      !result.scores.every(Number.isFinite) ||
      Math.abs(result.scores.reduce((a, b) => a + b, 0) - 1) > 0.00001
    )
      throw new Error('Invalid probabilities');
  }
  const receipt = {
    passed: true,
    modelId,
    gpu,
    first,
    second,
    feedResults,
    latest,
    elapsedMs: Date.now() - started,
    errors,
  };
  await writeFile(`${output}/proof.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
