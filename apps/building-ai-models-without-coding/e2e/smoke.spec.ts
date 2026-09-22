import type {Page} from 'playwright';

export default async function runSmokeTest({
  page,
  baseURL,
  viewport,
}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}): Promise<void> {
  for (const [slug, title] of [
    ['context', 'Context'],
    ['retrieval', 'Retrieval'],
    ['fine-tuning', 'Fine-tuning'],
    ['train', 'From scratch'],
  ] as const) {
    await page.goto(`${baseURL}#${slug}`);
    await page
      .getByRole('heading', {name: title, exact: true, level: 1})
      .waitFor();
    if (slug === 'fine-tuning') await page.locator('#tuning-baseline').waitFor();
    if (slug === 'train') await page.locator('#rust-run').waitFor();
    await page.locator('.chat-composer').waitFor();
    const geometry = await page.locator('.chat-composer').evaluate(element => {
      const composer = element.getBoundingClientRect();
      const parent = element.parentElement!.getBoundingClientRect();
      const thread = element.parentElement!.querySelector('.chat-thread')!.getBoundingClientRect();
      return {threadHeight: thread.height, composerHeight: composer.height, composerBottom: composer.bottom, parentBottom: parent.bottom, threadBottom: thread.bottom, composerTop: composer.top};
    });
    if (geometry.composerBottom > geometry.parentBottom + 1 || geometry.threadBottom > geometry.composerTop + 1)
      throw new Error(`${slug} composer overlaps conversation or following content at ${viewport}`);
    if (geometry.threadHeight < (viewport === 'desktop' ? 420 : 330))
      throw new Error(`${slug} conversation is too cramped: ${geometry.threadHeight}px`);
    if (geometry.composerHeight > (viewport === 'desktop' ? 230 : 300))
      throw new Error(`${slug} initial composer is too dense: ${geometry.composerHeight}px`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error(`${slug} overflows at ${viewport} width`);
    await page.screenshot({
      path: `apps/building-ai-models-without-coding/test-results/smoke-${slug}-${viewport}.png`,
      fullPage: true,
    });
  }
  await page.goto(`${baseURL}#retrieval`);
  if (!(await page.locator('.demo-system-rail').textContent())?.includes('0 chunks')) throw new Error('Retrieval did not start empty');
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  await page.getByRole('button', {name: 'Preview email: equipment', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Add sample', exact: true}).click();
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  await page.getByLabel('Use retrieval', {exact: true}).check();
  await page.getByLabel('Retrieval method').selectOption('lexical');
  await page
    .getByRole('button', {name: 'Find sources only', exact: true})
    .click();
  await page.locator('summary').filter({hasText: 'Ranked sources'}).last().click();
  await page
    .getByRole('heading', {name: '[1] Synthetic email: equipment', exact: true})
    .waitFor();
  await page.screenshot({
    path: `apps/building-ai-models-without-coding/test-results/smoke-retrieval-results-${viewport}.png`,
    fullPage: true,
  });
  await page
    .getByRole('textbox', {name: 'Your question', exact: true})
    .fill('zxqvmeaningless');
  await page
    .getByRole('button', {name: 'Find sources only', exact: true})
    .click();
  await page
    .getByText(/No keyword matches/)
    .first()
    .waitFor();
  if (await page.locator('.request-receipt').count() !== 2)
    throw new Error('Retrieval did not retain both chat turns');
  await page.goto(`${baseURL}#context`);
  const rail = page.locator('.demo-system-rail');
  await rail.waitFor();
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  if (!(await rail.textContent())?.includes('0 chunks'))
    throw new Error('Live visual did not reflect empty context');
  const equipment = page.getByRole('button', {name: 'Preview email: equipment', exact: true});
  await equipment.focus();
  await page.keyboard.press('Enter');
  const preview = page.getByRole('dialog');
  await preview.waitFor();
  if (!(await preview.textContent())?.includes('Bring a charged laptop')) throw new Error('Preview did not show the actual file');
  await page.screenshot({path: `apps/building-ai-models-without-coding/test-results/file-preview-${viewport}.png`});
  if (!(await rail.textContent())?.includes('0 chunks')) throw new Error('Preview attached a file without Add');
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press('Tab');
    // Native Chromium can visit browser chrome between cycles; underlying
    // application controls must never receive focus while the modal is open.
    if (!(await preview.evaluate(element => element.contains(document.activeElement) || document.activeElement === document.body)))
      throw new Error('Keyboard focus escaped the modal');
  }
  await page.locator('#context-question').evaluate(element => element.focus());
  if (await page.locator('#context-question').evaluate(element => element === document.activeElement))
    throw new Error('Background composer was not inert while preview was open');
  await page.keyboard.press('Escape');
  await preview.waitFor({state:'hidden'});
  if (!(await equipment.evaluate(element => element === document.activeElement))) throw new Error('Preview did not return keyboard focus');
  await equipment.click();
  await preview.getByRole('button', {name:'Add sample',exact:true}).click();
  if (!(await rail.textContent())?.includes('1 chunk'))
    throw new Error('Live visual did not reflect adding a source');
  await equipment.click();
  await preview.getByRole('button', {name:'Remove sample',exact:true}).click();
  if (!(await rail.textContent())?.includes('0 chunks'))
    throw new Error('Live visual did not reflect removing a source');
  await page.locator('summary').filter({hasText: 'Attachments'}).click();
  if (viewport === 'desktop') {
    await page.evaluate(() => window.scrollTo(0, 650));
    const top = await rail.evaluate(element => element.getBoundingClientRect().top);
    if (top < 0 || top > 60) throw new Error(`Diagram did not stick while scrolling: ${top}`);
  }
  const kit = page.getByRole('link', {name: 'Open the meetup kit'});
  if (
    !(await kit.getAttribute('href'))?.includes(
      '3dc012b9b020817e93b7dac0365ca614',
    )
  )
    throw new Error('Meetup kit link is missing');
  await page.screenshot({
    path: `apps/building-ai-models-without-coding/test-results/smoke-${viewport}.png`,
    fullPage: true,
  });
  await page.goto(`${baseURL}#fine-tuning`);
  await page.locator('#tuning-baseline').waitFor();
  if (!(await page.locator('#tuning-baseline').isEnabled()))
    throw new Error('Default model cannot be tried before training');
  const panels = page.locator('#tuning-custom-result article');
  if (await panels.count() !== 0) throw new Error('Empty prediction panels clutter the welcome');
  await page.getByText('What changes inside the model?', {exact: true}).click();
  const terminal = page.locator('#tuning-loss .terminal-viewport');
  await terminal.waitFor();
  await page.waitForTimeout(500);
  if (await terminal.evaluate(element => element.getBoundingClientRect().height) > 300)
    throw new Error('Xterm viewport grew beyond its bound');

  const modelDownloads: string[] = [];
  page.on('request', request => {if (request.url().includes('.gguf')) modelDownloads.push(request.url());});
  await page.goto(`${baseURL}#local-jev`);
  await page.getByRole('heading', {name: 'Local Jev', exact: true}).waitFor();
  if (await page.locator('nav[aria-label="Workshop demos"] a').count() !== 4)
    throw new Error('Secret demo changed the four-stage navigation');
  if (await page.locator('meter').count()) throw new Error('Secret demo fabricated initial scores');
  await page.locator('[data-post="release"]').evaluate(element => element.scrollIntoView({block: 'center'}));
  await page.waitForFunction(() => document.querySelector('[data-post="release"]')?.getAttribute('data-active') === 'true');
  await page.getByRole('button', {name: 'Try your own text', exact: true}).click();
  await page.locator('#jev-draft').fill('A private local editing example.');
  await page.waitForTimeout(700);
  if (modelDownloads.length) throw new Error('Secret demo downloaded a model without consent');
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw new Error(`Local Jev overflows at ${viewport} width`);
  await page.screenshot({path: `apps/building-ai-models-without-coding/test-results/smoke-local-jev-${viewport}.png`, fullPage: true});
}
