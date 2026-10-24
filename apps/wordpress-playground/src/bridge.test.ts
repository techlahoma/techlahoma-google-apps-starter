import {expect, test} from 'bun:test';
import type {PlaygroundClient} from '@wp-playground/client';
import type {PlaygroundBridgeConfig} from '@wp-playground/mcp/client';
import {createRevocableBridge} from './bridge';

test('disconnect revokes access before a delayed upstream socket opens', async () => {
  let suppliedConfig: PlaygroundBridgeConfig | undefined;
  let stopCount = 0;
  let openedCount = 0;
  let renameCount = 0;
  // Only object identity is used; no WordPress methods are simulated.
  const activeClient = {} as PlaygroundClient;
  const bridge = createRevocableBridge(
    config => {
      suppliedConfig = config;
      return {
        stop: () => stopCount++,
        notifySitesChanged: () => {},
      };
    },
    {
      list: () => [
        {slug: 'test-site', name: 'Test', storage: 'none', isActive: true},
      ],
      getClient: () => activeClient,
      rename: async () => {
        renameCount++;
      },
      saveInBrowser: async () => ({slug: 'test-site', storage: 'none'}),
      onConnect: () => openedCount++,
    },
    5400,
  );
  if (!suppliedConfig) throw new Error('Bridge factory did not receive config');
  expect(suppliedConfig.list()).toHaveLength(1);
  expect(suppliedConfig.getClient()).toBe(activeClient);
  bridge.stop();
  expect(suppliedConfig.list()).toEqual([]);
  expect(suppliedConfig.getClient()).toBeUndefined();
  await expect(suppliedConfig.rename('Late rename')).rejects.toThrow(
    'disconnected',
  );
  await expect(suppliedConfig.saveInBrowser()).rejects.toThrow('disconnected');
  suppliedConfig.onConnect?.();
  expect(stopCount).toBe(2);
  expect(openedCount).toBe(0);
  expect(renameCount).toBe(0);
});
