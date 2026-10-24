import type {
  McpBridgeHandle,
  PlaygroundBridgeConfig,
  startMcpBridge,
} from '@wp-playground/mcp/client';

/**
 * Revoke access immediately, including when upstream's token fetch is pending.
 * Upstream 3.1.58 can open a late socket after stop(); the callbacks must not
 * expose a client in that interval. Already-running PHP cannot be cancelled.
 */
export function createRevocableBridge(
  start: typeof startMcpBridge,
  config: PlaygroundBridgeConfig,
  port: number,
): McpBridgeHandle {
  let active = true;

  function requireConsent(): void {
    if (!active) throw new Error('Local MCP access has been disconnected.');
  }

  const handle = start(
    {
      list: () => (active ? config.list() : []),
      getClient: () => (active ? config.getClient() : undefined),
      rename: async name => {
        requireConsent();
        await config.rename(name);
      },
      saveInBrowser: async () => {
        requireConsent();
        return config.saveInBrowser();
      },
      onConnect: () => {
        if (!active) {
          handle?.stop();
          return;
        }
        config.onConnect?.();
      },
    },
    port,
  );

  return {
    notifySitesChanged: () => {
      if (active) handle?.notifySitesChanged();
    },
    stop: () => {
      active = false;
      handle?.stop();
    },
  };
}
