import type {Page} from 'playwright';

export default async function runSmokeTest({page, baseURL, viewport}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}): Promise<void> {
  for (const [slug, title] of [['context', 'Context'], ['retrieval', 'Retrieval'], ['fine-tuning', 'Fine-tuning'], ['train', 'From scratch']] as const) {
    await page.goto(`${baseURL}#${slug}`);
    await page.getByRole('heading', {name: title, exact: true, level: 1}).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`${slug} overflows at ${viewport} width`);
  }
  await page.goto(`${baseURL}#retrieval`);
  await page.getByLabel('Retrieval method').selectOption('lexical');
  await page.getByRole('button', {name: 'Find sources only', exact: true}).click();
  await page.getByRole('heading', {name: '[1] Synthetic email: equipment', exact: true}).waitFor();
  await page.getByRole('textbox', {name: 'Your question', exact: true}).fill('zxqvmeaningless');
  await page.getByRole('button', {name: 'Find sources only', exact: true}).click();
  await page.getByText(/No keyword matches/).first().waitFor();
  await page.goto(`${baseURL}#context`);
  const kit = page.getByRole('link', {name: 'Open the meetup kit'});
  if (!(await kit.getAttribute('href'))?.includes('3dc012b9b020817e93b7dac0365ca614')) throw new Error('Meetup kit link is missing');
  await page.screenshot({path: `apps/building-ai-models-without-coding/test-results/smoke-${viewport}.png`, fullPage: true});
}
