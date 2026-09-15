import {chromium, type Locator} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {browserLaunchOptions} from '../../../scripts/browser-runtime';

const baseURL = 'https://gdg-model-workshop.web.app/';
const expectedSourceRevision = Bun.env.WORKSHOP_EXPECTED_REVISION ?? null;
const phoneOnly = process.argv.includes('--phone-only');
const receiptName = phoneOnly ? 'receipt-phone.json' : 'receipt.json';
const output = 'apps/building-ai-models-without-coding/test-results/live-proof';
await mkdir(output, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions);
const context = await browser.newContext({viewport: {width: 390, height: 844}});
const page = await context.newPage();
const errors: {kind: string; message: string; page: string}[] = [];
const flows: Record<string, unknown> = {};
const started = new Date().toISOString();
page.on('pageerror', error =>
  errors.push({kind: 'pageerror', message: error.message, page: page.url()}),
);
page.on('console', message => {
  if (message.type() === 'error')
    errors.push({kind: 'console', message: message.text(), page: page.url()});
});
page.on('response', response => {
  if (response.status() >= 400)
    errors.push({
      kind: 'http',
      message: `${response.status()} ${response.url()}`,
      page: page.url(),
    });
});
page.on('requestfailed', request =>
  errors.push({
    kind: 'network',
    message: `${request.failure()?.errorText} ${request.url()}`,
    page: page.url(),
  }),
);
async function finish(button: Locator, timeoutMs = 300_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let previous = '';
  while (Date.now() < deadline) {
    const status = await page.getByRole('status').last().innerText();
    if (status !== previous) {
      console.log(status.slice(0, 300));
      previous = status;
    }
    if (await button.isEnabled()) return status;
    await page.waitForTimeout(1000);
  }
  throw new Error(`Timed out: ${previous}`);
}
async function run(
  name: string,
  task: () => Promise<Record<string, unknown>>,
): Promise<void> {
  const start = Date.now();
  try {
    flows[name] = {...(await task()), elapsedMs: Date.now() - start};
  } catch (error) {
    flows[name] = {
      passed: false,
      error: String(error),
      elapsedMs: Date.now() - start,
    };
    process.exitCode = 1;
  }
  await writeFile(
    `${output}/${receiptName}`,
    JSON.stringify(
      {
        started,
        baseURL,
        expectedSourceRevision,
        browser: browser.version(),
        flows,
        errors,
      },
      null,
      2,
    ),
  );
}
try {
  await run('phone-deep-links', async () => {
    const routes = [];
    for (const [route, title] of Object.entries({
      context: 'Context',
      retrieval: 'Retrieval',
      'fine-tuning': 'Fine-tuning',
      train: 'From scratch',
    })) {
      const response = await page.goto(`${baseURL}#${route}`);
      await page
        .getByRole('heading', {name: title, level: 1, exact: true})
        .waitFor();
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const http = response?.status();
      routes.push({route, title, http, overflow});
      await page.screenshot({
        path: `${output}/phone-${route}.png`,
        fullPage: true,
      });
      if ((http !== undefined && http !== 200) || overflow)
        throw new Error(`Route ${route}: HTTP ${http}, overflow=${overflow}`);
    }
    return {passed: true, viewport: {width: 390, height: 844}, routes};
  });
  if (!phoneOnly) {
    await page.setViewportSize({width: 1280, height: 900});
    await run('context', async () => {
      await page.goto(`${baseURL}#context`);
      const button = page.getByRole('button', {name: 'Ask Gemma', exact: true});
      await button.click();
      const status = await finish(button);
      const answer = await page.locator('.answer').innerText();
      await page.screenshot({
        path: `${output}/context-result.png`,
        fullPage: true,
      });
      if (!status.startsWith('Finished locally') || !answer.trim())
        throw new Error(`${status}\n${answer}`);
      return {
        passed: true,
        status,
        question: 'What should I bring?',
        answer,
        qualityScope:
          'Runtime proof; inspect this small model output for omissions.',
      };
    });
    await run('rag', async () => {
      await page.goto(`${baseURL}#retrieval`);
      const button = page.getByRole('button', {name: 'Ask Gemma', exact: true});
      await button.click();
      const status = await finish(button);
      const answer = await page.locator('.answer').innerText();
      const sources = await page
        .getByRole('region', {name: 'Retrieved sources'})
        .innerText();
      await page.screenshot({path: `${output}/rag-result.png`, fullPage: true});
      if (
        !status.startsWith('Finished locally') ||
        !answer.trim() ||
        !sources.includes('Synthetic email: equipment')
      )
        throw new Error(`${status}\n${answer}\n${sources}`);
      return {
        passed: true,
        status,
        question: 'What should I bring?',
        answer,
        sources,
      };
    });
    await run('rust', async () => {
      await page.goto(`${baseURL}#train`);
      const button = page.getByRole('button', {
        name: 'Compile and train',
        exact: true,
      });
      await page
        .getByText(
          'Ready. Change the dataset or training steps, then compile and train.',
          {exact: true},
        )
        .waitFor();
      await button.click();
      const status = await finish(button, 600_000);
      const stdout = await page
        .getByLabel('Rust compiler and training output', {exact: true})
        .innerText();
      await page.screenshot({
        path: `${output}/rust-result.png`,
        fullPage: true,
      });
      if (
        !status.startsWith('Rust program completed') ||
        !/step\s+30\s*\/\s*30/.test(stdout)
      )
        throw new Error(`${status}\n${stdout}`);
      return {passed: true, status, stdout};
    });
  }
} finally {
  await browser.close();
  await writeFile(
    `${output}/${receiptName}`,
    JSON.stringify(
      {
        started,
        finished: new Date().toISOString(),
        baseURL,
        expectedSourceRevision,
        flows,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({flows, errors}));
}
