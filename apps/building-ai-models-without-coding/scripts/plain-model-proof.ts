import {chromium} from 'playwright';
import {writeFile, mkdir} from 'node:fs/promises';
import {browserLaunchOptions} from '../../../scripts/browser-runtime';

const base = Bun.argv[2] ?? 'http://127.0.0.1:5202';
const browser = await chromium.launch(browserLaunchOptions);
const output =
  'apps/building-ai-models-without-coding/test-results/plain-model';
await mkdir(output, {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors: string[] = [];
  const observations = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['context', 'retrieval']) {
    await page.goto(`${base}/#${route}`);
    const hardware = await page.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      if (!adapter || adapter.info.isFallbackAdapter)
        throw new Error('Hardware WebGPU required');
      return {
        vendor: adapter.info.vendor,
        architecture: adapter.info.architecture,
      };
    });
    const rail = page.locator('.demo-system-rail');
    await rail.waitFor();
    if (!(await rail.textContent())?.includes('0 chunks'))
      throw new Error(`${route} carried files from another route`);
    const question = 'What should I bring?';
    await page
      .getByRole('textbox', {name: 'Your question', exact: true})
      .fill(question);
    async function ask(label: string) {
      const button = page.getByRole('button', {name: label, exact: true});
      await button.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="status"]')
            ?.textContent?.startsWith('Finished locally'),
        null,
        {timeout: 300_000},
      );
      if (!(await button.isEnabled()))
        throw new Error('Model controls did not recover');
    }
    await ask('Ask Gemma');
    const receipts = page.locator('.request-receipt');
    const baseline = await receipts.first().textContent();
    const plainPrompt = await receipts
      .first()
      .locator('pre')
      .last()
      .textContent();
    if (plainPrompt !== question)
      throw new Error(`${route} baseline added hidden context: ${plainPrompt}`);
    await page.locator('summary').filter({hasText: 'Attachments'}).click();
    await page
      .getByRole('button', {name: 'Preview email: equipment', exact: true})
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', {name: 'Add sample', exact: true})
      .click();
    await page.locator('summary').filter({hasText: 'Attachments'}).click();
    if (route === 'retrieval')
      await page.getByLabel('Use retrieval', {exact: true}).check();
    await ask(route === 'retrieval' ? 'Retrieve and ask' : 'Ask Gemma');
    if (
      (await receipts.count()) !== 2 ||
      (await receipts.first().textContent()) !== baseline
    )
      throw new Error('Adding context mutated or lost the baseline receipt');
    const suppliedPrompt = await receipts
      .last()
      .locator('pre')
      .last()
      .textContent();
    if (!suppliedPrompt?.includes('Bring a charged laptop'))
      throw new Error('Selected file did not enter prompt');
    observations.push({
      route,
      hardware,
      plainPrompt,
      suppliedPrompt,
      status: await page.getByRole('status').last().textContent(),
    });
    await page.screenshot({path: `${output}/${route}.png`, fullPage: true});
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(
    `${output}/proof.json`,
    JSON.stringify({passed: true, observations, errors}, null, 2),
  );
  console.log(JSON.stringify({passed: true, observations, errors}));
} finally {
  await browser.close();
}
