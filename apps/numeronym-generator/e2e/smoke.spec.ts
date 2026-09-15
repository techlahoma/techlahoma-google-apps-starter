import type {Page} from 'playwright';
import {join} from 'node:path';

export async function runSmokeTest({
  page,
  baseURL,
  viewport,
}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}): Promise<void> {
  await page.goto(baseURL, {waitUntil: 'networkidle'});
  const expectText = async (selector: string, text: string) => {
    await page.waitForFunction(
      ({selector, text}) =>
        document.querySelector(selector)?.textContent?.trim() === text,
      {selector, text},
    );
  };
  await expectText('h1', 'Numeronym Generator');
  await expectText('#numeronym-output', 'A16Z');
  const input = page.locator('#input-text');
  await input.fill('kubernetes');
  await expectText('#numeronym-output', 'k8s');
  await page.locator('button[data-preset="internationalization"]').click();
  await expectText('#numeronym-output', 'i18n');
  await input.fill('hi');
  await expectText('#numeronym-output', 'hi');
  await page.screenshot({
    path: join(
      process.cwd(),
      'apps',
      'numeronym-generator',
      'test-results',
      `smoke-${viewport}.png`,
    ),
    fullPage: false,
  });
}

export default runSmokeTest;
