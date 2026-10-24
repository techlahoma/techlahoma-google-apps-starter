import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
  copyFile,
} from 'node:fs/promises';
import {request} from 'node:http';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {CONTENT_SECURITY_POLICY, SECURITY_HEADERS} from './headers.mjs';
import {createStaticServer, portFromEnvironment} from './serve.mjs';
import {applyExport, planExport} from './export-aistudio.mjs';

const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'wp-workshop-tooling-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

async function put(root, path, content) {
  await mkdir(dirname(join(root, path)), {recursive: true});
  await writeFile(join(root, path), content);
}

function get(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request(
      {hostname: '127.0.0.1', port, path, method},
      response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
        response.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function serverFixture(t) {
  const directory = await temporaryDirectory(t);
  const distRoot = join(directory, 'dist');
  await put(distRoot, 'index.html', '<!doctype html><h1>Workshop fixture</h1>');
  await put(distRoot, 'assets/app.js', 'console.log("fixture");');
  await put(distRoot, 'assets/example.wasm', Buffer.from([0, 97, 115, 109]));
  await put(distRoot, 'blueprints/starter.json', '{"fixture":true}');
  await put(distRoot, '.env', 'SYNTHETIC_FIXTURE=must-not-be-served');
  await put(directory, 'outside.txt', 'outside fixture');
  const server = createStaticServer({distRoot});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  return {directory, distRoot, port: server.address().port};
}

test('static server serves exact assets, query strings, HEAD, MIME, and health', async t => {
  const {port} = await serverFixture(t);
  const home = await get(port, '/');
  assert.equal(home.status, 200);
  assert.match(home.headers['content-type'], /^text\/html/);
  assert.match(home.body.toString(), /Workshop fixture/);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(home.headers[name.toLowerCase()], value);
  }
  const script = await get(port, '/assets/app.js?revision=fixture');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /^text\/javascript/);
  const head = await get(port, '/assets/app.js', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), script.body.length);
  assert.equal(
    (await get(port, '/assets/example.wasm')).headers['content-type'],
    'application/wasm',
  );
  assert.match(
    (await get(port, '/blueprints/starter.json')).headers['content-type'],
    /^application\/json/,
  );
  assert.equal((await get(port, '/healthz')).body.toString(), 'ok\n');
  assert.equal((await get(port, '/missing')).status, 404);
  assert.equal((await get(port, '/assets')).status, 404);
  assert.equal((await get(port, '/mcp')).status, 404);
});

test('static server rejects traversal, dotfiles, ambiguous URLs, and wrong methods', async t => {
  const {port} = await serverFixture(t);
  for (const path of [
    '/../outside.txt',
    '/%2e%2e/outside.txt',
    '/assets/../index.html',
    '/.env',
    '/%2eenv',
    '/assets/.hidden',
    '/assets%2fapp.js',
    '/assets%5capp.js',
    '/%00',
    '/%',
    '//example.com/file',
  ]) {
    assert.equal((await get(port, path)).status, 400, path);
  }
  const post = await get(port, '/index.html', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});

test('static server does not follow symlinks outside its distribution', async t => {
  const {directory, distRoot, port} = await serverFixture(t);
  try {
    await symlink(
      join(directory, 'outside.txt'),
      join(distRoot, 'shortcut.txt'),
    );
  } catch (error) {
    if (error.code === 'EPERM')
      return t.skip('Host does not permit test symlinks.');
    throw error;
  }
  assert.equal((await get(port, '/shortcut.txt')).status, 404);
});

test('production port and policy retain the local browser bridge boundary', () => {
  assert.equal(portFromEnvironment(''), 8080);
  assert.equal(portFromEnvironment('3000'), 3000);
  for (const value of ['0', '-1', '65536', '8080evil', '1.5']) {
    assert.throws(() => portFromEnvironment(value), /PORT/);
  }
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /style-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /http:\/\/127\.0\.0\.1:\*/);
  assert.match(CONTENT_SECURITY_POLICY, /ws:\/\/127\.0\.0\.1:\*/);
  assert.doesNotMatch(
    CONTENT_SECURITY_POLICY,
    /upgrade-insecure-requests|unsafe-inline|unsafe-eval|localhost|0\.0\.0\.0/,
  );
});

async function exportFixture(t) {
  const directory = await temporaryDirectory(t);
  const appRoot = join(directory, 'apps/wordpress-playground');
  const outputRoot = join(directory, 'dist/wordpress-playground-aistudio');
  await put(
    appRoot,
    'package.json',
    JSON.stringify({
      version: '0.0.0',
      dependencies: {'@wp-playground/client': '3.1.60'},
      devDependencies: {
        '@types/bun': '1.3.14',
        typescript: '5.9.3',
        vite: '8.0.16',
      },
    }),
  );
  for (const [path, content] of Object.entries({
    'src/main.ts': 'export const fixture = true;',
    'src/style.css': 'body { color: black; }',
    'src/main.test.ts': 'synthetic excluded test',
    'src/__tests__/fixture.ts': 'synthetic excluded test',
    'src/.env': 'SYNTHETIC_FIXTURE=excluded',
    'public/blueprints/starter.json': '{"fixture":true}',
    'public/.env.local': 'SYNTHETIC_FIXTURE=excluded',
    'public/mcp_config.json': '{"syntheticCredential":"excluded"}',
    'public/user-data/post.txt': 'synthetic excluded user data',
    'public/database/site.sqlite': 'synthetic excluded database',
    'public/credentials/key.pem': 'synthetic excluded key',
    'index.html':
      '<!doctype html><script type="module" src="/src/main.ts"></script>',
    'README.md': '# Export fixture',
    'AI_STUDIO_PROMPT.md': '# Prompt fixture',
    '.env': 'SYNTHETIC_FIXTURE=excluded',
    'mcp.json': '{"syntheticCredential":"excluded"}',
    'bun.lock': 'synthetic source lock',
  }))
    await put(appRoot, path, content);
  await mkdir(join(appRoot, 'scripts'), {recursive: true});
  for (const name of ['serve.mjs', 'headers.mjs', 'export-aistudio.mjs']) {
    await copyFile(join(SCRIPT_ROOT, name), join(appRoot, 'scripts', name));
  }
  return {directory, appRoot, outputRoot};
}

test('export plan is read-only and apply produces a standalone project with no private files', async t => {
  const fixture = await exportFixture(t);
  const first = await planExport(fixture);
  assert.deepEqual(await planExport(fixture), first);
  await assert.rejects(readdir(fixture.outputRoot), {code: 'ENOENT'});
  assert.deepEqual(first.copies, [
    'AI_STUDIO_PROMPT.md',
    'index.html',
    'public/blueprints/starter.json',
    'scripts/headers.mjs',
    'scripts/serve.mjs',
    'src/main.ts',
    'src/style.css',
  ]);
  await applyExport(fixture);
  const pkg = JSON.parse(
    await readFile(join(fixture.outputRoot, 'package.json'), 'utf8'),
  );
  assert.equal(pkg.dependencies['@wp-playground/client'], '3.1.60');
  assert.equal(pkg.devDependencies.vite, '8.0.16');
  assert.equal(pkg.devDependencies['@types/bun'], undefined);
  assert.equal(pkg.scripts.dev, 'vite --host 0.0.0.0 --port 3000');
  assert.equal(pkg.scripts.start, 'node scripts/serve.mjs');
  assert.deepEqual(pkg.engines, {node: '>=24.18.0', npm: '>=11.16.0'});
  const readme = await readFile(join(fixture.outputRoot, 'README.md'), 'utf8');
  assert.match(readme, /npm install --package-lock-only/);
  assert.match(readme, /npm ci\nnpm run typecheck\nnpm run build\nnpm start/);
  assert.match(readme, /Review the generated `package-lock\.json`/);
  assert.match(readme, /AI_STUDIO_PROMPT\.md/);
  assert.match(readme, /defaults to port 8080/);
  assert.match(
    readme,
    /source repository's root `bun\.lock` remains canonical/,
  );
  assert.doesNotMatch(readme, /Export fixture|\.\.\/\.\.\/docs/);
  const config = JSON.parse(
    await readFile(join(fixture.outputRoot, 'tsconfig.json'), 'utf8'),
  );
  assert.equal(config.extends, undefined);
  assert.deepEqual(config.compilerOptions.types, ['vite/client']);
  for (const file of [
    '.env',
    'mcp.json',
    'bun.lock',
    'package-lock.json',
    'scripts/export-aistudio.mjs',
  ]) {
    await assert.rejects(readFile(join(fixture.outputRoot, file)), {
      code: 'ENOENT',
    });
  }
  const before = await readFile(
    join(fixture.outputRoot, 'src/main.ts'),
    'utf8',
  );
  await assert.rejects(applyExport(fixture), /Refusing to overwrite/);
  assert.equal(
    await readFile(join(fixture.outputRoot, 'src/main.ts'), 'utf8'),
    before,
  );
});

test('export refuses source overlap, non-exact dependencies, and source symlinks', async t => {
  const fixture = await exportFixture(t);
  await assert.rejects(
    planExport({...fixture, outputRoot: join(fixture.appRoot, 'copy')}),
    /separate directories/,
  );
  const packagePath = join(fixture.appRoot, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  pkg.dependencies['@wp-playground/client'] = '^3.1.60';
  await writeFile(packagePath, JSON.stringify(pkg));
  await assert.rejects(planExport(fixture), /exact version/);
  pkg.dependencies['@wp-playground/client'] = '3.1.60';
  await writeFile(packagePath, JSON.stringify(pkg));
  try {
    await symlink(
      join(fixture.appRoot, '.env'),
      join(fixture.appRoot, 'src/shortcut.ts'),
    );
  } catch (error) {
    if (error.code === 'EPERM')
      return t.skip('Host does not permit test symlinks.');
    throw error;
  }
  await assert.rejects(planExport(fixture), /must not be a symlink/);
});

test('export CLI requires an explicit action and uses its fixed standalone destination', async t => {
  const fixture = await exportFixture(t);
  const script = join(fixture.appRoot, 'scripts/export-aistudio.mjs');
  const invoke = args =>
    spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
  const invalid = invoke([]);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
  const plan = invoke(['plan']);
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(JSON.parse(plan.stdout).target, fixture.outputRoot);
  assert.match(plan.stdout, /package-lock\.json/);
  await assert.rejects(readdir(fixture.outputRoot), {code: 'ENOENT'});
  const apply = invoke(['apply']);
  assert.equal(apply.status, 0, apply.stderr);
  assert.equal(JSON.parse(apply.stdout).applied, true);
  assert.equal(invoke(['apply']).status, 1);
});
