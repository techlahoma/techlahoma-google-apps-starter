import {browserLaunchOptions} from '../../../../scripts/browser-runtime';
// Project-owned real-browser proof. Requires this app's Vite server.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const base = process.env.RUST_DEMO_URL || 'http://127.0.0.1:5190';
const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage();
  page.on('console', message => console.log(message.text()));
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  await page.goto(base + '/#train');
  const terminal = page.getByLabel('Rust compiler and training output', {
    exact: true,
  });
  const plainOutput = terminal.locator('[data-terminal-plain]');
  const source = page.getByRole('textbox', {
    name: 'Editable Rust model source',
    exact: true,
  });
  const run = page.getByRole('button', {name: 'Compile and train'});
  await run.waitFor();
  await page.waitForFunction(
    () => !document.querySelector('#rust-source').disabled,
  );
  await run.click();
  await page.waitForFunction(
    () =>
      /completed|failed|Stopped/.test(
        document.querySelector('[role=status]').textContent,
      ),
    null,
    {timeout: 300_000},
  );
  const result = await plainOutput.innerText();
  const runStatus = await page.getByRole('status').innerText();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin: base});
  await page.getByRole('button', {name: 'Copy Rust compiler and training output', exact: true}).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  if (copied !== result) throw new Error('Copy altered the raw compiler output');
  await page.locator('.terminal-shell').screenshot({path: 'apps/building-ai-models-without-coding/test-results/rust-annotated-terminal.png'});
  console.log(result);
  await writeFile('/private/tmp/gdg-rust-browser-proof.txt', result);
  if (
    !runStatus.includes('Rust program completed.') ||
    !result.includes('step   30 /   30') ||
    !result.includes('sample  5:')
  ) {
    throw new Error(
      'Actual Rust compile and 30 training steps did not complete.',
    );
  }
  // Edited syntax errors must reach real compiler diagnostics.
  await source.fill('fn main() { this is invalid rust; }');
  await run.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[role=status]').textContent.includes('failed'),
    null,
    {timeout: 180_000},
  );
  if (!(await plainOutput.innerText()).includes('error'))
    throw new Error('Missing compiler error');
  // Untrusted edited code must not accumulate unbounded stdout/stderr.
  await source.fill(
    'fn main() { loop { println!("stdout spam"); eprintln!("stderr spam"); } }',
  );
  const floodStart = Date.now();
  await run.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[role=status]').textContent.includes('failed'),
    null,
    {timeout: 60_000},
  );
  const floodOutput = await plainOutput.innerText();
  if (
    !floodOutput.includes('Output limit exceeded') ||
    !floodOutput.includes('256 KiB')
  ) {
    throw new Error(
      'Infinite mixed stdout/stderr did not stop at its output budget',
    );
  }
  console.log(
    `PASS: infinite mixed stdout/stderr stopped at budget in ${Date.now() - floodStart} ms`,
  );
  // Cancellation must promptly return control, even during compiler preload.
  await run.click();
  await page.getByRole('button', {name: 'Cancel Rust run'}).click();
  if (!(await page.getByRole('status').innerText()).includes('Cancelled'))
    throw new Error('Cancellation failed');
  console.log(
    'PASS: real compile + train; invalid edited Rust; output budget; cancellation.',
  );
} finally {
  await browser.close();
}
