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
      return {composerBottom: composer.bottom, parentBottom: parent.bottom, threadBottom: thread.bottom, composerTop: composer.top};
    });
    if (geometry.composerBottom > geometry.parentBottom + 1 || geometry.threadBottom > geometry.composerTop + 1)
      throw new Error(`${slug} composer overlaps conversation or following content at ${viewport}`);
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
  await page.getByLabel('Retrieval method').selectOption('lexical');
  await page
    .getByRole('button', {name: 'Find sources only', exact: true})
    .click();
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
  while (await page.locator('button[aria-pressed="true"]').count()) {
    await page.locator('button[aria-pressed="true"]').first().click();
  }
  if (!(await rail.textContent())?.includes('0 chunks'))
    throw new Error('Live visual did not reflect empty context');
  const equipment = page.getByRole('button', {name: /email: equipment/});
  await equipment.click();
  if (!(await rail.textContent())?.includes('1 chunk'))
    throw new Error('Live visual did not reflect adding a source');
  await equipment.click();
  if (!(await rail.textContent())?.includes('0 chunks'))
    throw new Error('Live visual did not reflect removing a source');
  await page.getByRole('button', {name: 'Restore samples', exact: true}).click();
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
  if (await panels.count() !== 2) throw new Error('Missing default/tuned columns');
  if (await panels.first().evaluate(element => element.getBoundingClientRect().height) > 260)
    throw new Error('Prediction panel is too tall before use');
  await page.getByText('What changes inside the model?', {exact: true}).click();
  const terminal = page.locator('#tuning-loss .terminal-viewport');
  await terminal.waitFor();
  await page.waitForTimeout(500);
  if (await terminal.evaluate(element => element.getBoundingClientRect().height) > 300)
    throw new Error('Xterm viewport grew beyond its bound');
}
