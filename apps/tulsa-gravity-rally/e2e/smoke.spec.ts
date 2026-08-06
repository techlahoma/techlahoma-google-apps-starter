import {resolve} from 'node:path';
import type {Page} from 'playwright';

const RESULTS_DIR = resolve(import.meta.dir, '../test-results');

export async function runSmokeTest({
  page,
  baseURL,
  viewport,
}: {
  page: Page;
  baseURL: string;
  viewport: 'desktop' | 'phone';
}): Promise<void> {
  const rootUrl = baseURL || 'http://127.0.0.1:5180/';

  if (viewport === 'desktop') {
    await verifyHostAndPhoneFlow(page, rootUrl);
    return;
  }

  await verifyMissingRoomLayout(page, rootUrl);
}

async function verifyHostAndPhoneFlow(
  hostPage: Page,
  baseURL: string,
): Promise<void> {
  await hostPage.setViewportSize({width: 1440, height: 900});
  await hostPage.goto(new URL('/host', baseURL).href, {
    waitUntil: 'domcontentloaded',
  });

  await hostPage.waitForFunction(() => {
    const code = document.getElementById('room-code-display')?.textContent;
    return Boolean(code && /^[A-HJ-NP-Z2-9]{6}$/.test(code));
  });

  const canvas = hostPage.locator('#webgl-canvas');
  await canvas.waitFor({state: 'visible'});
  const bounds = await canvas.boundingBox();
  invariant(bounds !== null, 'Host WebGL canvas has no layout bounds.');
  invariant(bounds.width >= 1200, `Canvas width is only ${bounds.width}px.`);
  invariant(bounds.height >= 650, `Canvas height is only ${bounds.height}px.`);

  invariant(
    (await hostPage.locator('.brand-title').innerText()) ===
      'TULSA GRAVITY RALLY',
    'Host title is missing.',
  );
  await hostPage.waitForFunction(() =>
    document
      .getElementById('qr-code-img')
      ?.getAttribute('src')
      ?.startsWith('data:image/png;base64,'),
  );

  const joinUrl = await hostPage.locator('#join-url-display').innerText();
  const roomCode = (
    await hostPage.locator('#room-code-display').innerText()
  ).trim();
  invariant(
    joinUrl.endsWith(`/room/${roomCode}`),
    `QR join URL is incorrect: expected a /room/${roomCode} suffix, received "${joinUrl}".`,
  );

  await hostPage.locator('#toggle-text-view-btn').click();
  const keyboardSpeedBefore = await readFirstTelemetrySpeed(hostPage);
  await hostPage.keyboard.down('Shift');
  await hostPage.keyboard.down('w');
  try {
    await hostPage.waitForFunction(priorSpeed => {
      const text = document.getElementById('textual-content')?.textContent;
      const speed = Number(text?.match(/Speed:\s*(\d+)/)?.[1] ?? '0');
      return speed > Number(priorSpeed) + 1;
    }, keyboardSpeedBefore);
  } finally {
    await hostPage.keyboard.up('w');
    await hostPage.keyboard.up('Shift');
  }
  await hostPage.locator('#close-text-view-btn').click();

  const browser = hostPage.context().browser();
  invariant(browser !== null, 'Playwright browser is unavailable.');
  const phoneContext = await browser.newContext({
    viewport: {width: 390, height: 844},
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ' +
      'AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const phonePage = await phoneContext.newPage();
  const phoneErrors: string[] = [];
  phonePage.on('console', message => {
    if (message.type() === 'error') phoneErrors.push(message.text());
  });
  phonePage.on('pageerror', error => phoneErrors.push(error.message));

  try {
    await phonePage.goto(new URL(`/room/${roomCode}`, baseURL).href, {
      waitUntil: 'domcontentloaded',
    });
    const rocket = phonePage.locator('.emoji-card[data-id="rocket"]');
    await rocket.waitFor({state: 'visible'});
    await rocket.click();
    try {
      await phonePage
        .locator('#controller-screen')
        .waitFor({state: 'visible', timeout: 10_000});
    } catch {
      const joinError = (
        await phonePage.locator('#join-error-msg').innerText()
      ).trim();
      throw new Error(
        `Phone join failed${joinError ? `: ${joinError}` : ' without a visible error message'}.`,
      );
    }
    await phonePage.waitForFunction(
      () =>
        document.getElementById('status-badge')?.textContent === 'Connected',
    );
    await hostPage.waitForFunction(() =>
      document
        .getElementById('player-roster-grid')
        ?.textContent?.includes('🚀'),
    );

    const gas = phonePage.locator('#gas-btn');
    await gas.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    });
    await phonePage.waitForTimeout(1_200);
    await phonePage.waitForFunction(() => {
      const speed = Number.parseInt(
        document.getElementById('telemetry-speed')?.textContent ?? '0',
        10,
      );
      return speed > 0;
    });
    await gas.dispatchEvent('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    });

    await assertNoHorizontalOverflow(phonePage, 'phone portrait');
    await phonePage.screenshot({
      path: resolve(RESULTS_DIR, 'rally-phone-controller.png'),
      fullPage: true,
    });
    await hostPage.screenshot({
      path: resolve(RESULTS_DIR, 'rally-host-with-player.png'),
      fullPage: true,
    });

    await hostPage.locator('#start-race-btn').click();
    await hostPage.locator('#race-timer-text').waitFor({state: 'visible'});
    invariant(
      await hostPage.locator('#lobby-panel').isHidden(),
      'Lobby remained visible after the host started the race.',
    );
    await hostPage.screenshot({
      path: resolve(RESULTS_DIR, 'rally-race-running.png'),
      fullPage: true,
    });
    invariant(
      phoneErrors.length === 0,
      `Phone console errors: ${phoneErrors.join(' | ')}`,
    );
  } finally {
    await phoneContext.close();
  }
}

async function readFirstTelemetrySpeed(page: Page): Promise<number> {
  await page.waitForFunction(() =>
    document.getElementById('textual-content')?.textContent?.includes('Speed:'),
  );
  return page
    .locator('#textual-content')
    .evaluate(element =>
      Number(element.textContent?.match(/Speed:\s*(\d+)/)?.[1] ?? '0'),
    );
}

async function verifyMissingRoomLayout(
  page: Page,
  baseURL: string,
): Promise<void> {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(new URL('/room/DEM223', baseURL).href, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('.player-error-panel').waitFor({state: 'visible'});
  invariant(
    (await page.locator('.player-error-panel').innerText()).includes(
      'Room does not exist',
    ),
    'Missing-room state did not explain the failure.',
  );
  await assertNoHorizontalOverflow(page, 'phone portrait error state');

  await page.setViewportSize({width: 844, height: 390});
  await assertNoHorizontalOverflow(page, 'phone landscape error state');
  await page.screenshot({
    path: resolve(RESULTS_DIR, 'rally-phone-missing-room.png'),
    fullPage: true,
  });
}

async function assertNoHorizontalOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const {scrollWidth, clientWidth} = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  invariant(
    scrollWidth <= clientWidth,
    `${label} overflows horizontally (${scrollWidth}px > ${clientWidth}px).`,
  );
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export default runSmokeTest;
