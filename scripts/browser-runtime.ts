import type {LaunchOptions} from 'playwright';

/** Use full Chromium's unified headless mode: no macOS application window.
 * Project-owned suites run through exec, never a node_repl browser launch.
 * If hardware GPU is unavailable, stop and use the connected existing browser.
 * Do not fall back to a fresh headed window or bypass GPU/security blocklists.
 */
export const browserLaunchOptions = {
  channel: 'chromium',
  headless: true,
  chromiumSandbox: true,
  ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
} satisfies LaunchOptions;
