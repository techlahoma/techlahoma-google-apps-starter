import {chromium} from 'playwright';
import {runSmokeTest} from './smoke.spec';

const baseURL = Bun.env.RALLY_LIVE_BASE_URL;

if (!baseURL) {
  throw new Error(
    'Set RALLY_LIVE_BASE_URL to an explicitly authorized Firebase Hosting URL.',
  );
}

const parsedBaseUrl = new URL(baseURL);
if (parsedBaseUrl.protocol !== 'https:') {
  throw new Error('Live verification requires an HTTPS base URL.');
}

const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 1440, height: 900},
});
const page = await context.newPage();
const browserErrors: string[] = [];

page.on('console', message => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', error => browserErrors.push(error.message));

try {
  await runSmokeTest({
    page,
    baseURL: parsedBaseUrl.href,
    viewport: 'desktop',
  });
  if (browserErrors.length > 0) {
    throw new Error(`Browser errors: ${browserErrors.join(' | ')}`);
  }
  console.log(`Verified live rally behavior at ${parsedBaseUrl.origin}.`);
} finally {
  await context.close();
  await browser.close();
}
