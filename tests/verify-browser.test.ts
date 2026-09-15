import {afterEach, describe, expect, test} from 'bun:test';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadBrowserSmokeRunner} from '../scripts/verify-browser';

const temporaryDirectories: string[] = [];

function specFile(source: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'browser-runner-test-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'smoke.ts');
  writeFileSync(path, source);
  return path;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {recursive: true, force: true});
  }
});

describe('browser smoke runner loading', () => {
  test('accepts default and named callable runners', async () => {
    for (const source of [
      'export default async function () {}',
      'export async function runSmokeTest() {}',
    ]) {
      expect(
        typeof (await loadBrowserSmokeRunner(specFile(source), true)),
      ).toBe('function');
    }
  });

  test('preserves import errors for complete and scaffold apps', async () => {
    for (const requireRunner of [true, false]) {
      await expect(
        loadBrowserSmokeRunner(
          specFile('throw new Error("broken smoke dependency"); export {};'),
          requireRunner,
        ),
      ).rejects.toThrow('broken smoke dependency');
    }
  });

  test('rejects missing runners for complete apps', async () => {
    await expect(
      loadBrowserSmokeRunner(specFile('export const unrelated = true;'), true),
    ).rejects.toThrow('must export a callable');
  });

  test('rejects non-callable exports instead of silently skipping them', async () => {
    for (const source of [
      'export default "not a runner";',
      'export default null;',
      'export const runSmokeTest = {};',
      'export default false; export async function runSmokeTest() {}',
    ]) {
      await expect(
        loadBrowserSmokeRunner(specFile(source), true),
      ).rejects.toThrow('must export a callable');
    }
  });

  test('allows screenshot fallback only for scaffold without a runner', async () => {
    expect(
      await loadBrowserSmokeRunner(specFile('export {};'), false),
    ).toBeNull();
  });
});
