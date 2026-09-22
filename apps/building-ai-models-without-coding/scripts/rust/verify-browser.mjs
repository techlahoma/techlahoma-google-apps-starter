import {browserLaunchOptions} from '../../../../scripts/browser-runtime';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const base = process.env.RUST_DEMO_URL || 'http://127.0.0.1:5190';
const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage();
  const stages = [];
  page.on('console', message => {
    const match = message.text().match(/\[playground\] stages: (\{.*?\})/);
    if (match) stages.push(JSON.parse(match[1]));
  });
  await page.goto(base + '/#train');
  const source = page.locator('#rust-source');
  const run = page.locator('#rust-run');
  const plainOutput = () => page.locator('[data-terminal-plain]').last();
  const idle = () =>
    page.waitForFunction(
      () =>
        !document.querySelector('#rust-run').disabled,
      null,
      {timeout: 300_000},
    );
  await page.waitForFunction(
    () =>
      !!document.querySelector('#rust-source') &&
      !document.querySelector('#rust-source').disabled,
  );
  const originalSource = await source.inputValue();
  await run.click();
  await idle();
  const training = await plainOutput().textContent();
  if (
    !training.includes('step   30 /   30') ||
    !training.includes('Saved trained checkpoint') ||
    !training.includes('sample  5:')
  )
    throw new Error('Training/checkpoint missing');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin: base});
  await page.getByText('Actual compiler and model output', {exact: true}).first().click();
  await page.getByRole('button', {name: 'Copy Rust compiler and training output', exact: true}).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  if (copied !== training) throw new Error('Copy altered raw compiler output');
  await page.locator('.chat-turn').last().screenshot({path: 'apps/building-ai-models-without-coding/test-results/rust-chat-training.png'});
  const replies = [];
  for (const prefix of ['build', 'learn']) {
    await page.getByLabel('Character prefix', {exact: true}).fill(prefix);
    await page
      .getByRole('button', {name: 'Continue text', exact: true})
      .click();
    await idle();
    const output = await plainOutput().textContent();
    if (
      !output.includes('Loaded trained checkpoint; no training') ||
      output.includes('step    1 /')
    )
      throw new Error('Prompt retrained or did not load checkpoint');
    const continuation = output.match(/^continuation: (.*)$/m)?.[1];
    if (!continuation?.startsWith(prefix))
      throw new Error('Prefix was not actually fed to the model');
    replies.push(continuation);
  }
  if (
    replies[0] === replies[1] ||
    stages[1]?.compileMs !== 0 ||
    stages[2]?.compileMs !== 0
  )
    throw new Error('Prompt reused fabricated output or recompiled');
  await page.screenshot({path: 'apps/building-ai-models-without-coding/test-results/rust-chat-continuations.png', fullPage: true});
  await page.getByLabel('Character prefix', {exact: true}).fill('🙂');
  await page.getByRole('button', {name: 'Continue text', exact: true}).click();
  await idle();
  if (!(await plainOutput().textContent()).includes('Unsupported character'))
    throw new Error('Unsupported character silently accepted');
  await run.click();
  await idle();
  if (!(await plainOutput().textContent()).includes('step   30 /   30'))
    throw new Error('Repeat training failed');
  if ((await page.locator('.chat-turn').count()) !== 5)
    throw new Error('Conversation history was lost');
  await page.getByText('Edit source and CLI tools', {exact: true}).click();
  await source.fill('fn main() { this is invalid rust; }');
  await run.click();
  await idle();
  if (
    !(await plainOutput().textContent()).includes('error') ||
    !(await page
      .getByRole('button', {name: 'Continue text', exact: true, includeHidden: true})
      .isDisabled())
  )
    throw new Error('Compiler failure left stale model active');
  await source.fill(
    'fn main() { loop { println!("stdout spam"); eprintln!("stderr spam"); } }',
  );
  await run.click();
  await idle();
  if (!(await plainOutput().textContent()).includes('Output limit exceeded'))
    throw new Error('Output budget missing');
  await source.fill(originalSource);
  await run.click();
  // Cancel while real rustc is executing in the disposable worker.
  await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('Compiling + linking'), null, {timeout: 60_000});
  await page.getByRole('button', {name: 'Cancel Rust run'}).click();
  if (!(await page.getByRole('status').innerText()).includes('Cancelled'))
    throw new Error('Cancellation failed');
  await writeFile(
    '/private/tmp/gdg-rust-browser-proof.txt',
    JSON.stringify(
      {
        training,
        replies,
        stages,
        passed: [
          'training',
          'two prompt continuations without compile/train',
          'unsupported character',
          'repeat training',
          'preserved turns',
          'invalid source',
          'output budget',
          'cancel during actual compiler execution',
          'raw clipboard copy',
        ],
      },
      null,
      2,
    ),
  );
  console.log('PASS', JSON.stringify({replies, stages}));
} finally {
  await browser.close();
}
