import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SERVER_NAME = 'wordpress-workshop';
// Must match server.port in ../vite.config.ts.
export const DEFAULT_APP_URL = 'http://127.0.0.1:5173/';

/** Antigravity's user-level MCP config, on macOS and Windows alike. */
export function configPath(home = homedir()) {
  return join(home, '.gemini', 'antigravity', 'mcp_config.json');
}

/** Absolute launch entry for this checkout and the Node running this script. */
export function serverEntry(
  nodePath = process.execPath,
  launcher = fileURLToPath(new URL('./mcp.mjs', import.meta.url)),
) {
  return {command: nodePath, args: [launcher, `--url=${DEFAULT_APP_URL}`]};
}

/** Merge only this server's entry; refuse text that is not a JSON object. */
export function mergeConfig(text, entry) {
  const parsed = text.trim() === '' ? {} : JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Existing MCP config is not a JSON object.');
  }
  const servers = parsed.mcpServers ?? {};
  if (typeof servers !== 'object' || Array.isArray(servers)) {
    throw new Error('Existing mcpServers is not a JSON object.');
  }
  const changed =
    JSON.stringify(servers[SERVER_NAME]) !== JSON.stringify(entry);
  return {
    changed,
    config: {...parsed, mcpServers: {...servers, [SERVER_NAME]: entry}},
  };
}

function main() {
  const action = process.argv[2];
  if (action !== 'plan' && action !== 'apply') {
    throw new Error('Usage: node scripts/antigravity-setup.mjs plan|apply');
  }
  const target = configPath();
  let text = '';
  try {
    text = readFileSync(target, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const entry = serverEntry();
  const {changed, config} = mergeConfig(text, entry);
  console.log(`Config: ${target}`);
  console.log(
    `Server: ${SERVER_NAME} -> ${entry.command} ${entry.args.join(' ')}`,
  );
  if (!changed) {
    console.log('Already up to date.');
    return;
  }
  if (action === 'plan') {
    console.log(
      'Would add or update this server; other servers are kept. Run apply to write.',
    );
    return;
  }
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    'Written. Refresh MCP servers in Antigravity (or restart it) to load the tools.',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(
      `antigravity-setup: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
