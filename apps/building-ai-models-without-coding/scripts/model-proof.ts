import {browserLaunchOptions} from '../../../scripts/browser-runtime';
import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
const output = '.starter/cache/model-proof';
await mkdir(output, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions);
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
const started = Date.now();
try {
  await page.goto('http://127.0.0.1:5191/#context');
  await page.getByRole('button', {name: 'Ask Gemma', exact: true}).click();
  let previous = '';
  for (let step = 0; step < 600; step++) {
    const status = await page.getByRole('status').last().textContent();
    if (status !== previous) {
      console.log(status);
      previous = status ?? '';
    }
    if (
      await page
        .getByRole('button', {name: 'Ask Gemma', exact: true})
        .isEnabled()
    )
      break;
    await page.waitForTimeout(1000);
  }
  const contextStatus = await page.getByRole('status').last().textContent();
  const contextAnswer = await page.locator('.answer').textContent();
  await page.screenshot({path: `${output}/context.png`, fullPage: true});
  await page.goto('http://127.0.0.1:5191/#retrieval');
  await page
    .getByRole('button', {name: 'Find sources only', exact: true})
    .click();
  previous = '';
  for (let step = 0; step < 600; step++) {
    const status = await page.getByRole('status').last().textContent();
    if (status !== previous) {
      console.log(status);
      previous = status ?? '';
    }
    if (
      await page
        .getByRole('button', {name: 'Find sources only', exact: true})
        .isEnabled()
    )
      break;
    await page.waitForTimeout(1000);
  }
  const retrievalStatus = await page.getByRole('status').last().textContent();
  await page
    .getByText('Evaluation · check retrieval on synthetic examples', {
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {name: 'Run retrieval checks', exact: true})
    .click();
  await page
    .getByRole('button', {name: 'Run retrieval checks', exact: true})
    .waitFor({state: 'visible'});
  for (let step = 0; step < 300; step++) {
    if (
      await page
        .getByRole('button', {name: 'Run retrieval checks', exact: true})
        .isEnabled()
    )
      break;
    await page.waitForTimeout(1000);
  }
  const evaluation = await page
    .locator('details')
    .filter({hasText: 'Evaluation · check retrieval'})
    .locator('pre')
    .textContent();
  const sources = await page
    .getByRole('region', {name: 'Retrieved sources'})
    .textContent();
  await page.getByRole('button', {name: 'Ask Gemma', exact: true}).click();
  for (let step = 0; step < 300; step++) {
    if (
      await page
        .getByRole('button', {name: 'Ask Gemma', exact: true})
        .isEnabled()
    )
      break;
    await page.waitForTimeout(1000);
  }
  const ragStatus = await page.getByRole('status').last().textContent();
  const ragAnswer = await page.locator('.answer').textContent();
  await page.screenshot({path: `${output}/retrieval.png`, fullPage: true});
  const receipt = {
    started: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    contextStatus,
    contextAnswer,
    retrievalStatus,
    sources,
    evaluation,
    ragStatus,
    ragAnswer,
    errors,
  };
  await writeFile(`${output}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
  if (
    !contextStatus?.startsWith('Finished locally') ||
    !contextAnswer?.trim() ||
    !retrievalStatus?.startsWith('Retrieved 3 sources') ||
    !ragStatus?.startsWith('Finished locally') ||
    !ragAnswer?.trim()
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
