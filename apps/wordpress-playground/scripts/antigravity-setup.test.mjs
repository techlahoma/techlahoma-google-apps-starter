import assert from 'node:assert/strict';
import {isAbsolute, join} from 'node:path';
import {test} from 'node:test';
import {
  SERVER_NAME,
  configPath,
  mergeConfig,
  serverEntry,
} from './antigravity-setup.mjs';

const entry = {command: '/bin/node', args: ['/repo/mcp.mjs', '--url=x']};

test('targets the user-level Antigravity config', () => {
  assert.equal(
    configPath('/home/u'),
    join('/home/u', '.gemini', 'antigravity', 'mcp_config.json'),
  );
});

test('launch entry uses absolute paths for this checkout', () => {
  const {command, args} = serverEntry();
  assert(isAbsolute(command));
  assert(isAbsolute(args[0]) && args[0].endsWith('mcp.mjs'));
});

test('merges into empty or existing config without dropping servers', () => {
  assert.deepEqual(mergeConfig('', entry).config, {
    mcpServers: {[SERVER_NAME]: entry},
  });
  const existing = JSON.stringify({mcpServers: {other: {command: 'x'}}});
  const {changed, config} = mergeConfig(existing, entry);
  assert.equal(changed, true);
  assert.deepEqual(Object.keys(config.mcpServers), ['other', SERVER_NAME]);
});

test('reports no change when already configured', () => {
  const text = JSON.stringify({mcpServers: {[SERVER_NAME]: entry}});
  assert.equal(mergeConfig(text, entry).changed, false);
});

test('refuses configs that are not JSON objects', () => {
  assert.throws(() => mergeConfig('[]', entry), /not a JSON object/);
  assert.throws(() => mergeConfig('{nope', entry));
});
