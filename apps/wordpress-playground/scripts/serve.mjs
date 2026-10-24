import {readFile, lstat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SECURITY_HEADERS} from './headers.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const DIST_ROOT = resolve(dirname(SCRIPT_PATH), '../dist');

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.php': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
});

function reply(request, response, status, message, extraHeaders = {}) {
  const body = Buffer.from(message);
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

function requestPath(rawUrl) {
  if (!rawUrl?.startsWith('/') || rawUrl.startsWith('//')) return null;
  const rawPath = rawUrl.split('?')[0];
  if (/%2f|%5c/i.test(rawPath)) return null;
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (/[\\\u0000-\u001f\u007f#]/.test(path) || path.includes('//')) return null;
  if (path === '/') return '/index.html';
  const segments = path.slice(1).split('/');
  if (segments.some(segment => !segment || segment.startsWith('.')))
    return null;
  return path;
}

async function regularFileInside(root, pathname) {
  const target = resolve(root, `.${pathname}`);
  const fromRoot = relative(root, target);
  if (
    isAbsolute(fromRoot) ||
    fromRoot === '..' ||
    fromRoot.startsWith(`..${sep}`)
  ) {
    return null;
  }
  let current = root;
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return null;
  const segments = fromRoot.split(sep);
  for (let index = 0; index < segments.length; index += 1) {
    current = join(current, segments[index]);
    const info = await lstat(current);
    if (info.isSymbolicLink()) return null;
    if (index < segments.length - 1 && !info.isDirectory()) return null;
    if (index === segments.length - 1 && !info.isFile()) return null;
  }
  return target;
}

/** The root argument is for local tests. The executable always serves app/dist. */
export function createStaticServer({distRoot = DIST_ROOT} = {}) {
  const root = resolve(distRoot);
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply(request, response, 405, 'Method not allowed\n', {
        Allow: 'GET, HEAD',
      });
      return;
    }

    const pathname = requestPath(request.url);
    if (pathname === null) {
      reply(request, response, 400, 'Invalid path\n');
      return;
    }
    if (pathname === '/healthz') {
      reply(request, response, 200, 'ok\n');
      return;
    }

    try {
      const file = await regularFileInside(root, pathname);
      if (!file) {
        reply(request, response, 404, 'Not found\n');
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        'Cache-Control': 'no-cache',
        'Content-Type':
          MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': body.length,
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const missing = error?.code === 'ENOENT' || error?.code === 'ENOTDIR';
      reply(
        request,
        response,
        missing ? 404 : 500,
        missing ? 'Not found\n' : 'Server error\n',
      );
    }
  });
}

export function portFromEnvironment(value = process.env.PORT) {
  if (value === undefined || value === '') return 8080;
  if (!/^\d+$/.test(value))
    throw new Error('PORT must be an integer from 1 to 65535.');
  const port = Number(value);
  if (port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535.');
  return port;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    const port = portFromEnvironment();
    const server = createStaticServer();
    server.on('error', error => {
      console.error(`Static server failed: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '0.0.0.0', () => {
      console.log(`WordPress workshop launcher listening on 0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
