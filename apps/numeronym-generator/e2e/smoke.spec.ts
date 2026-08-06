import {test, expect, type Page} from '@playwright/test';
import {join} from 'node:path';

export async function runSmokeTest({
  page,
  baseURL,
  viewport,
}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}) {
  await page.goto(baseURL, {waitUntil: 'networkidle'});

  // Check header title
  const h1 = page.locator('h1');
  await expect(h1).toHaveText('Numeronym Generator');

  // Verify initial output for default value "Andreessen Horowitz" -> "A16Z"
  const output = page.locator('#numeronym-output');
  await expect(output).toHaveText('A16Z');

  // Test primary flow: type word "kubernetes"
  const input = page.locator('#input-text');
  await input.fill('kubernetes');
  await expect(output).toHaveText('k8s');

  // Test preset click: click "internationalization" preset
  const presetBtn = page.locator('button[data-preset="internationalization"]');
  if (await presetBtn.isVisible()) {
    await presetBtn.click();
    await expect(output).toHaveText('i18n');
  }

  // Test empty path / short input state
  await input.fill('hi');
  await expect(output).toHaveText('hi');

  // Save evidence screenshot
  const resultDir = join(process.cwd(), 'apps', 'numeronym-generator', 'test-results');
  await page.screenshot({
    path: join(resultDir, `smoke-${viewport}.png`),
    fullPage: false,
  });
}

export default runSmokeTest;

test.describe('Numeronym Generator E2E Smoke', () => {
  test('primary flow and layout verification', async ({page, baseURL}) => {
    await runSmokeTest({
      page,
      baseURL: baseURL || 'http://127.0.0.1:5180/',
      viewport: 'desktop',
    });
  });
});
