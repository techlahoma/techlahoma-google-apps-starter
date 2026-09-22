import {chromium} from 'playwright';
import {browserLaunchOptions} from '../../../scripts/browser-runtime';

const base = Bun.argv[2] ?? 'http://127.0.0.1:5201';
const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/#retrieval`);
  await page.locator('summary').filter({hasText:'Attachments'}).click();
  await page.getByRole('button',{name:'Preview email: equipment',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Add sample',exact:true}).click();
  await page.locator('summary').filter({hasText:'Attachments'}).click();
  await page.getByLabel('Use retrieval',{exact:true}).check();
  await page.getByLabel('Retrieval method').selectOption('lexical');
  await page.getByRole('button', {name: 'Find sources only', exact: true}).click();
  const receipts = page.locator('.request-receipt');
  await receipts.first().waitFor();
  const frozen = await receipts.first().textContent();
  if (!frozen?.includes('equipment')) throw new Error('Missing source in first receipt');
  const conversation = page.locator('.chat-thread');
  await conversation.evaluate(element => {element.scrollTop = 0;});
  await page.waitForTimeout(100);
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  await page.getByRole('button', {name:'Preview email: equipment',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Remove sample',exact:true}).click();
  if (await receipts.first().textContent() !== frozen) throw new Error('Source edit changed a past receipt');
  if (await conversation.evaluate(element => element.scrollTop) > 1)
    throw new Error('Source edit pulled the reader away from earlier chat history');
  await page.getByRole('button',{name:'Preview document: access',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Add sample',exact:true}).click();
  await page.locator('summary').filter({hasText:'Attachments'}).click();
  await page.getByLabel('Use retrieval',{exact:true}).check();
  await page.getByRole('textbox', {name: 'Your question', exact: true}).fill('zzzznomatches');
  await page.getByRole('button', {name: 'Retrieve and ask', exact: true}).click();
  if (await receipts.count() !== 2) throw new Error('Second request did not preserve history');
  if (!(await page.locator('.demo-system-main').textContent())?.includes('Generation was requested but skipped'))
    throw new Error('Empty retrieval incorrectly describes generation');
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-test.txt', mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic fixture. The example telescope is blue.'),
  });
  const rail = page.locator('.demo-system-rail');
  await page.getByRole('button', {name: 'Preview synthetic-test.txt',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Remove file',exact:true}).click();
  await page.waitForFunction(() => document.activeElement?.matches('details.chat-tools > summary'));
  if (!(await page.locator('summary').filter({hasText:'Attachments'}).evaluate(element => element === document.activeElement)))
    throw new Error('Removing a previewed file did not return focus to Attachments');
  if (!(await rail.textContent())?.includes('1 chunk')) throw new Error('Upload or removal replaced the existing source');
  await page.getByRole('button',{name:'Clear attachments',exact:true}).click();
  if (!(await rail.textContent())?.includes('0 chunks')) throw new Error('Clearing files did not update rail');
  if (await receipts.first().textContent() !== frozen) throw new Error('Upload overwrote receipt');
  await page.screenshot({path: 'apps/building-ai-models-without-coding/test-results/live-state-receipts.png', fullPage: true});
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: frozen per-request receipts, repeated requests, empty retrieval, upload removal, live counts.');
} finally {
  await browser.close();
}
