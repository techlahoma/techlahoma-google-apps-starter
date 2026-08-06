import {test, expect, type Page} from '@playwright/test';

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
  const title = await page.title();
  expect(title).toBeDefined();
}

export default runSmokeTest;

test.describe('Tulsa Gravity Rally E2E Smoke', () => {
  test('page loads successfully', async ({page, baseURL}) => {
    await runSmokeTest({
      page,
      baseURL: baseURL || 'http://127.0.0.1:5180/',
      viewport: 'desktop',
    });
  });
});
