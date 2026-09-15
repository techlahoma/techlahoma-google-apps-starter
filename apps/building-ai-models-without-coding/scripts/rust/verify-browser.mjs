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
  await page.goto(base + '/rust/LICENSE-microgpt');
  await page.evaluate(async () => {
    document.body.replaceChildren();
    const {mountRustDemo} = await import('/src/rust-demo.ts');
    mountRustDemo(document.body);
  });
  const run = page.getByRole('button', {name: 'Compile and train'});
  await run.waitFor();
  await page.waitForFunction(
    () => !document.querySelector('textarea').disabled,
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
  const result = await page.locator('body').innerText();
  console.log(result);
  await writeFile('/private/tmp/gdg-rust-browser-proof.txt', result);
  if (
    !result.includes('Rust program completed.') ||
    !result.includes('step   30 /   30') ||
    !result.includes('sample  5:')
  ) {
    throw new Error(
      'Actual Rust compile and 30 training steps did not complete.',
    );
  }
  // Edited syntax errors must reach real compiler diagnostics.
  await page.locator('textarea').fill('fn main() { this is invalid rust; }');
  await run.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[role=status]').textContent.includes('failed'),
    null,
    {timeout: 180_000},
  );
  if (!(await page.locator('pre').innerText()).includes('error'))
    throw new Error('Missing compiler error');
  // Untrusted edited code must not accumulate unbounded stdout/stderr.
  await page
    .locator('textarea')
    .fill(
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
  const floodOutput = await page.locator('pre').innerText();
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
