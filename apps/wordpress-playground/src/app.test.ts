import {describe, expect, test} from 'bun:test';
import {
  importFileError,
  MAX_IMPORT_BYTES,
  normalizeSiteName,
  parsePort,
  portFromSearch,
} from './app';

describe('local bridge address boundary', () => {
  test('accepts the full valid port range', () => {
    for (const port of [1, 5400, 65535]) {
      expect(parsePort(String(port))).toEqual({kind: 'valid', port});
    }
  });

  test('rejects hosts, injection strings, nonintegers and ambiguous numbers', () => {
    for (const value of [
      '0',
      '65536',
      '-1',
      '12.5',
      '1e3',
      ' 5400',
      '05400',
      '127.0.0.1:5400',
      'https://example.com',
      '5400/path',
      '5400?token=bad',
    ]) {
      expect(parsePort(value).kind).toBe('invalid');
    }
  });

  test('an absent port does not imply a connection target', () => {
    expect(portFromSearch('')).toEqual({kind: 'missing'});
    expect(portFromSearch('?other=5400')).toEqual({kind: 'missing'});
  });

  test('rejects empty and repeated URL parameters, including identical repeats', () => {
    for (const search of [
      '?mcp-port=',
      '?mcp-port=5400&mcp-port=5400',
      '?mcp-port=5400&mcp-port=5401',
      '?mcp-port=%20%35%34%30%30',
    ]) {
      expect(portFromSearch(search).kind).toBe('invalid');
    }
    expect(portFromSearch('?mcp-port=5400')).toEqual({
      kind: 'valid',
      port: 5400,
    });
  });
});

describe('user-controlled imports and names', () => {
  test('requires a nonempty bounded ZIP', () => {
    expect(importFileError({name: 'demo.ZIP', size: 10})).toBeNull();
    expect(importFileError({name: 'demo.json', size: 10})).not.toBeNull();
    expect(importFileError({name: 'empty.zip', size: 0})).not.toBeNull();
    expect(
      importFileError({name: 'large.zip', size: MAX_IMPORT_BYTES + 1}),
    ).not.toBeNull();
  });

  test('validates bridge rename values before showing them as text', () => {
    expect(normalizeSiteName('  My demo  ')).toBe('My demo');
    for (const value of ['', '   ', null, {}, 'a'.repeat(81)]) {
      expect(() => normalizeSiteName(value)).toThrow();
    }
  });
});
