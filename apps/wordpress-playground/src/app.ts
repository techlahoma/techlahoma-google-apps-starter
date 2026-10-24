export const BOOT_TIMEOUT_MS = 120_000;
export const BRIDGE_TIMEOUT_MS = 20_000;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

export type PortResult =
  | {kind: 'missing'}
  | {kind: 'valid'; port: number}
  | {kind: 'invalid'; message: string};

const PORT_ERROR = 'Enter one port number between 1 and 65535.';

/** Only a canonical port is accepted; hosts and URLs are never input here. */
export function parsePort(value: string): PortResult {
  if (value === '') return {kind: 'missing'};
  if (!/^[1-9]\d{0,4}$/.test(value)) {
    return {kind: 'invalid', message: PORT_ERROR};
  }
  const port = Number(value);
  return port <= 65535
    ? {kind: 'valid', port}
    : {kind: 'invalid', message: PORT_ERROR};
}

export function portFromSearch(search: string): PortResult {
  const values = new URLSearchParams(search).getAll('mcp-port');
  if (values.length === 0) return {kind: 'missing'};
  if (values.length !== 1 || values[0] === '') {
    return {
      kind: 'invalid',
      message:
        'The link must contain exactly one valid mcp-port. Enter it below.',
    };
  }
  return parsePort(values[0]!);
}

export function importFileError(file: {
  name: string;
  size: number;
}): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'Choose a WordPress Playground ZIP export.';
  }
  if (file.size === 0) return 'That ZIP file is empty.';
  if (file.size > MAX_IMPORT_BYTES) {
    return 'Choose a ZIP no larger than 100 MiB for this browser demo. Keep your existing backup elsewhere.';
  }
  return null;
}

export function normalizeSiteName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new Error('A site name must contain between 1 and 80 characters.');
  }
  return value.trim();
}
