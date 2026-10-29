import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const PLAYGROUND_VERSION = '3.1.58';

/** Accept an intentional app origin; never accept credentials or bridge tokens. */
export function validateAppUrl(value) {
  const url = new URL(value);
  const localHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error(
      'Use HTTPS for a hosted app, or HTTP on localhost/127.0.0.1 for development.',
    );
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'Use the app origin at / with no credentials, query, or fragment.',
    );
  }
  return url.href;
}

/** A fixed bridge port lets a hosted page connect without a ?mcp-port link. */
export function validatePort(value) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1024 || port > 65535) {
    throw new Error('Use a --port= between 1024 and 65535.');
  }
  return port;
}

export function checkNode(version) {
  const [major, minor] = version.split('.').map(Number);
  if (
    !Number.isInteger(major) ||
    !Number.isInteger(minor) ||
    major < 24 ||
    (major === 24 && minor < 18)
  ) {
    throw new Error(
      'The pinned Playground MCP requires Node >=24.18.0. Run this launcher with node.',
    );
  }
}

async function main() {
  checkNode(process.versions.node);
  if (process.versions.bun)
    throw new Error('Run the MCP launcher with Node, not Bun.');
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.error(
      'Usage: node scripts/mcp.mjs [--check] --url=https://YOUR-APP-HOST/ [--port=7811]',
    );
    return;
  }
  const urls = args.filter(arg => arg.startsWith('--url='));
  const ports = args.filter(arg => arg.startsWith('--port='));
  if (
    urls.length !== 1 ||
    ports.length > 1 ||
    args.some(
      arg =>
        arg !== '--check' &&
        !arg.startsWith('--url=') &&
        !arg.startsWith('--port='),
    )
  ) {
    throw new Error(
      'Supply exactly one --url= argument. Optional: --port=, --check.',
    );
  }
  const url = validateAppUrl(urls[0].slice('--url='.length));
  const port = ports.length
    ? validatePort(ports[0].slice('--port='.length))
    : undefined;
  const manifest = JSON.parse(
    readFileSync(
      fileURLToPath(import.meta.resolve('@wp-playground/mcp/package.json')),
      'utf8',
    ),
  );
  if (manifest.version !== PLAYGROUND_VERSION) {
    throw new Error(
      `Expected @wp-playground/mcp ${PLAYGROUND_VERSION}; found ${manifest.version}. Install the root lockfile.`,
    );
  }
  if (args.includes('--check')) {
    console.error(
      `Ready: Node ${process.versions.node}; Playground MCP ${manifest.version}; app ${url}${port ? `; port ${port}` : ''}`,
    );
    return;
  }
  const entry = import.meta.resolve('@wp-playground/mcp');
  const ajvEntry = import.meta.resolve('ajv');
  const {registerHooks} = await import('node:module');
  // The published 3.1.58 entry imports ajv without declaring it. Redirect only
  // that exact importer/specifier to this app's explicit, locked dependency.
  // All other resolution uses Node's default. No upstream files, transport,
  // browser settings, or repository linker settings are changed.
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(
        specifier === 'ajv' && context.parentURL === entry
          ? ajvEntry
          : specifier,
        context,
      );
    },
  });
  process.argv = [
    process.execPath,
    fileURLToPath(entry),
    `--url=${url}`,
    ...(port ? [`--port=${port}`] : []),
  ];
  try {
    // Keep stdout reserved for MCP JSON-RPC; the upstream module owns stdio.
    await import(entry);
  } finally {
    hook.deregister();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(error => {
    console.error(
      `wordpress-workshop MCP: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
