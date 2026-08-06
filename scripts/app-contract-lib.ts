import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';

export interface RequiredProof {
  primaryFlow: boolean;
  failureOrEmptyPath: boolean;
  phoneWidth: boolean;
  cleanBrowserConsole: boolean;
}

export type Capability =
  'static' | 'browser' | 'firebase-emulator' | 'authentication' | 'database';

export interface AppContract {
  schemaVersion: 1;
  status: 'scaffold' | 'complete';
  capabilities: Capability[];
  browserSpec: string;
  requiredProof: RequiredProof;
}

const ALLOWED_CAPABILITIES = new Set<string>([
  'static',
  'browser',
  'firebase-emulator',
  'authentication',
  'database',
]);

export function validateAppContract(data: unknown): AppContract {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Contract must be an object');
  }

  const obj = data as Record<string, unknown>;

  if (obj.schemaVersion !== 1) {
    throw new Error('Contract schemaVersion must be 1');
  }

  if (obj.status !== 'scaffold' && obj.status !== 'complete') {
    throw new Error('Contract status must be "scaffold" or "complete"');
  }

  if (!Array.isArray(obj.capabilities)) {
    throw new Error('Contract capabilities must be an array');
  }

  for (const cap of obj.capabilities) {
    if (typeof cap !== 'string' || !ALLOWED_CAPABILITIES.has(cap)) {
      throw new Error(`Invalid contract capability: ${String(cap)}`);
    }
  }

  if (typeof obj.browserSpec !== 'string' || !obj.browserSpec.trim()) {
    throw new Error('Contract browserSpec must be a non-empty string');
  }

  if (
    !obj.requiredProof ||
    typeof obj.requiredProof !== 'object' ||
    Array.isArray(obj.requiredProof)
  ) {
    throw new Error('Contract requiredProof must be an object');
  }

  const proof = obj.requiredProof as Record<string, unknown>;
  for (const key of [
    'primaryFlow',
    'failureOrEmptyPath',
    'phoneWidth',
    'cleanBrowserConsole',
  ]) {
    if (typeof proof[key] !== 'boolean') {
      throw new Error(`Contract requiredProof.${key} must be a boolean`);
    }
  }

  return {
    schemaVersion: 1,
    status: obj.status as 'scaffold' | 'complete',
    capabilities: obj.capabilities as Capability[],
    browserSpec: obj.browserSpec as string,
    requiredProof: {
      primaryFlow: proof.primaryFlow as boolean,
      failureOrEmptyPath: proof.failureOrEmptyPath as boolean,
      phoneWidth: proof.phoneWidth as boolean,
      cleanBrowserConsole: proof.cleanBrowserConsole as boolean,
    },
  };
}

export function readAppContract(
  appDir: string,
): {contract: AppContract; path: string} | null {
  const contractPath = join(appDir, 'app.contract.json');
  if (!existsSync(contractPath)) return null;
  const content = readFileSync(contractPath, 'utf8');
  const json = JSON.parse(content);
  return {
    contract: validateAppContract(json),
    path: contractPath,
  };
}
