import {describe, expect, test} from 'bun:test';
import {loadJson} from '../scripts/project-starter';
import {validateAppContract} from '../scripts/app-contract-lib';
import {join} from 'node:path';

describe('app contract schema and library', () => {
  const rootDir = join(import.meta.dir, '..');
  const templateContractPath = join(
    rootDir,
    'templates',
    'vite-app',
    'app.contract.json',
  );

  test('validates template app.contract.json', () => {
    const json = loadJson(templateContractPath);
    const contract = validateAppContract(json);
    expect(contract.schemaVersion).toBe(1);
    expect(contract.status).toBe('scaffold');
    expect(contract.capabilities).toContain('static');
    expect(contract.capabilities).toContain('browser');
    expect(contract.browserSpec).toBe('e2e/smoke.spec.ts');
  });

  test('rejects contract with invalid status', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'in-progress',
      capabilities: ['static'],
      browserSpec: 'e2e/smoke.spec.ts',
      requiredProof: {
        primaryFlow: true,
        failureOrEmptyPath: true,
        phoneWidth: true,
        cleanBrowserConsole: true,
      },
    };
    expect(() => validateAppContract(invalid)).toThrow('status');
  });

  test('rejects contract with missing required proof fields', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'complete',
      capabilities: ['static'],
      browserSpec: 'e2e/smoke.spec.ts',
      requiredProof: {
        primaryFlow: true,
      },
    };
    expect(() => validateAppContract(invalid)).toThrow('requiredProof');
  });
});
