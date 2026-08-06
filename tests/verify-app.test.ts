import {describe, expect, test} from 'bun:test';
import {join} from 'node:path';
import {
  checkScaffoldMarkers,
  checkDependencyPolicy,
} from '../scripts/verify-app-lib';
import {validateAppContract} from '../scripts/app-contract-lib';

describe('completion orchestrator & verification checks', () => {
  const rootDir = join(import.meta.dir, '..');
  const templateDir = join(rootDir, 'templates', 'vite-app');

  test('scaffold template contract fails completion check due to scaffold status', () => {
    const contract = validateAppContract({
      schemaVersion: 1,
      status: 'scaffold',
      capabilities: ['static'],
      browserSpec: 'e2e/smoke.spec.ts',
      requiredProof: {
        primaryFlow: true,
        failureOrEmptyPath: true,
        phoneWidth: true,
        cleanBrowserConsole: true,
      },
    });

    const errors = checkScaffoldMarkers(templateDir, contract);
    expect(errors.some(e => e.includes('scaffold'))).toBe(true);
  });

  test('detects scaffold markers in template files', () => {
    const contract = validateAppContract({
      schemaVersion: 1,
      status: 'complete', // Force status to complete to test marker detection
      capabilities: ['static'],
      browserSpec: 'e2e/smoke.spec.ts',
      requiredProof: {
        primaryFlow: true,
        failureOrEmptyPath: true,
        phoneWidth: true,
        cleanBrowserConsole: true,
      },
    });

    const errors = checkScaffoldMarkers(templateDir, contract);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some(
        e =>
          e.includes('readyMessage') ||
          e.includes('is ready.') ||
          e.includes('scaffold'),
      ),
    ).toBe(true);
  });

  test('passes dependency policy for valid workspace without app-local lockfiles', () => {
    const errors = checkDependencyPolicy(
      join(rootDir, 'apps', 'numeronym-generator'),
    );
    expect(errors.length).toBe(0);
  });
});
