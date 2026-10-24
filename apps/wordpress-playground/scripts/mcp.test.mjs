import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkNode, validateAppUrl} from './mcp.mjs';

test('accepts explicit secure origins and local development', () => {
  assert.equal(
    validateAppUrl('https://example.web.app'),
    'https://example.web.app/',
  );
  assert.equal(
    validateAppUrl('http://127.0.0.1:5173/'),
    'http://127.0.0.1:5173/',
  );
});

test('rejects public cleartext hosts and URL-carried credentials or tokens', () => {
  for (const value of [
    'http://example.com/',
    'http://127.0.0.1.evil.example/',
    'https://user:secret@example.com/',
    'https://example.com/?mcp-port=1234',
    'https://example.com/#token',
    'https://example.com/nested/',
    'file:///etc/passwd',
    'javascript:alert(1)',
  ])
    assert.throws(() => validateAppUrl(value), value);
});

test('rejects older runtimes before starting a bridge', () => {
  assert.throws(() => checkNode('22.20.0'));
  assert.throws(() => checkNode('24.17.9'));
  assert.throws(() => checkNode('invalid'));
  checkNode('24.18.0');
  checkNode('26.0.0');
});
