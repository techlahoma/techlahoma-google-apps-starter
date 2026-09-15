import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {browserLaunchOptions} from './browser-runtime';

const url = 'https://gdg-model-workshop.web.app/#fine-tuning';
const output = 'test-results/live-training-proof';
await mkdir(output, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const start = Date.now();
  await page.goto(url, {waitUntil: 'networkidle', timeout: 60000});
  await page
    .getByRole('button', {name: 'Train and compare', exact: true})
    .click();
  let failure = '';
  try {
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tuning-status')
          ?.textContent?.startsWith('Training and reload complete.'),
      undefined,
      {timeout: 300000},
    );
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  const result = await page.evaluate(() => ({
    status: document.querySelector('#tuning-status')?.textContent ?? '',
    rows: Array.from(
      document.querySelectorAll('#tuning-results tbody tr'),
      row =>
        Array.from(row.querySelectorAll('td'), cell => cell.textContent ?? ''),
    ),
    losses: document.querySelector('#tuning-loss')?.textContent ?? '',
  }));
  const losses = result.losses
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => Number(line.split('mean pre-update batch loss ')[1]));
  const passed =
    !failure &&
    errors.length === 0 &&
    result.rows.length === 3 &&
    losses.length === 200 &&
    losses.every(Number.isFinite) &&
    result.status.startsWith('Training and reload complete.');
  await page.screenshot({path: `${output}/live.png`, fullPage: true});
  const receipt = {
    url,
    expectedSourceRevision: Bun.env.WORKSHOP_EXPECTED_REVISION ?? null,
    observedAt: new Date().toISOString(),
    elapsedSeconds: (Date.now() - start) / 1000,
    timingNote:
      'Concurrent local verification may affect timing; this is not a performance benchmark.',
    passed,
    failure,
    errors,
    ...result,
    lossCount: losses.length,
    allLossesFinite: losses.every(Number.isFinite),
  };
  await writeFile(
    `${output}/receipt.json`,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {...receipt, losses: `${losses.length} recorded losses`},
      null,
      2,
    ),
  );
  if (!passed) process.exitCode = 1;
} finally {
  await browser.close();
}
