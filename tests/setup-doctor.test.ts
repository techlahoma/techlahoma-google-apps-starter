import {describe, expect, test} from 'bun:test';
import {
  assessPlatform,
  pinnedBunVersion,
  windowsBuild,
} from '../scripts/setup-doctor-lib';

describe('fresh-machine setup diagnostics', () => {
  test('reads the pinned Bun version from packageManager', () => {
    expect(pinnedBunVersion('bun@1.3.14')).toBe('1.3.14');
    expect(pinnedBunVersion('npm@11.0.0')).toBeNull();
  });

  test('recognizes the native Windows 10 1809 baseline', () => {
    expect(windowsBuild('10.0.17763')).toBe(17763);
    expect(assessPlatform('win32', 'x64', '10.0.17763').status).toBe('pass');
    expect(assessPlatform('win32', 'x64', '10.0.17134').status).toBe('fail');
  });

  test('requires 64-bit Windows without requiring WSL', () => {
    expect(assessPlatform('win32', 'ia32', '10.0.22631').status).toBe('fail');
    expect(assessPlatform('win32', 'arm64', '10.0.26100').status).toBe('pass');
  });

  test('recognizes the effective Apple Silicon macOS baseline', () => {
    expect(assessPlatform('darwin', 'arm64', '22.0.0').status).toBe('pass');
    expect(assessPlatform('darwin', 'arm64', '21.6.0').status).toBe('fail');
    expect(assessPlatform('darwin', 'x64', '24.6.0').status).toBe('warning');
  });
});
