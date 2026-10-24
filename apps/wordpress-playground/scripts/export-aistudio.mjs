import {constants} from 'node:fs';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const APP_ROOT = resolve(dirname(SCRIPT_PATH), '..');
export const EXPORT_ROOT = resolve(
  APP_ROOT,
  '../../dist/wordpress-playground-aistudio',
);

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i;
const EXCLUDED_DIRECTORIES = new Set([
  '__tests__',
  '__snapshots__',
  'test',
  'tests',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  'uploads',
  'database',
  'databases',
  'userdata',
  'user-data',
  'user_data',
  'backups',
  'credentials',
  'secrets',
]);

export const EXPORT_NOTES = Object.freeze([
  'The repository root bun.lock remains the source project dependency lock.',
  'This standalone export has no dependency lock. Generate and review its own package-lock.json before deployment, then use npm ci for repeatable installs.',
  'Review the exported project and validate its typecheck, build, and browser behavior before importing or deploying it.',
]);

function excluded(name) {
  return (
    name.startsWith('.') ||
    EXCLUDED_DIRECTORIES.has(name.toLowerCase()) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(name) ||
    /(?:^|[._-])mcp(?:[._-]?config)?(?:[._-].*)?\.(?:jsonc?|ya?ml)$/i.test(
      name,
    ) ||
    /\.(?:pem|key|p12|pfx|sqlite3?|db|sql)$/i.test(name)
  );
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function contains(parent, child) {
  const path = relative(parent, child);
  return (
    path === '' ||
    (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`))
  );
}

function dependenciesFrom(source, field) {
  const entries = Object.entries(source[field] ?? {})
    .filter(([name]) => name !== '@types/bun')
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  for (const [name, version] of entries) {
    if (typeof version !== 'string' || !EXACT_VERSION.test(version)) {
      throw new Error(
        `Standalone export requires an exact version for ${field}.${name}.`,
      );
    }
  }
  return Object.fromEntries(entries);
}

function generatedFiles(sourcePackage, hasAiStudioPrompt) {
  const dependencies = dependenciesFrom(sourcePackage, 'dependencies');
  const devDependencies = dependenciesFrom(sourcePackage, 'devDependencies');
  for (const name of ['typescript', 'vite']) {
    if (!(name in devDependencies) && !(name in dependencies)) {
      throw new Error(
        `The app must declare an exact ${name} dependency before export.`,
      );
    }
  }
  const packageJson = {
    name: 'wordpress-playground-aistudio',
    private: true,
    version: sourcePackage.version ?? '0.0.0',
    type: 'module',
    engines: {
      node: '>=24.18.0',
      npm: '>=11.16.0',
    },
    scripts: {
      dev: 'vite --host 0.0.0.0 --port 3000',
      build: 'vite build',
      start: 'node scripts/serve.mjs',
      typecheck: 'tsc --noEmit',
    },
    dependencies,
    devDependencies,
  };
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      types: ['vite/client'],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      useDefineForClassFields: true,
      isolatedModules: true,
    },
    include: ['src'],
  };
  const sourceUrl =
    'https://github.com/techlahoma/techlahoma-google-apps-starter/tree/feat/wordpress-playground-workshop/apps/wordpress-playground';
  const furtherReading = hasAiStudioPrompt
    ? '[AI Studio instructions](AI_STUDIO_PROMPT.md) and the'
    : 'The';
  const readme = `# WordPress workshop standalone export

- \`Tease:\` One folder for the workshop launcher.
- \`Lede:\` This export builds a static launcher. WordPress runs in the participant's browser; the Node server serves the built files.
- \`Why it matters:\` The exported project can be evaluated separately from the source Bun monorepo.
- \`Go deeper:\` ${furtherReading} [source project](${sourceUrl}).

## Install and review the dependency lock

Use Node.js 24.18.0 or newer and npm 11.16.0 or newer, matching the [Playground client package requirements](https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/client/package.json).

The source repository's root \`bun.lock\` remains canonical for that project. This export starts without a lockfile. Generate its own npm lock:

\`\`\`sh
npm install --package-lock-only
\`\`\`

Review the generated \`package-lock.json\` before installing dependencies or deploying. Preserve that reviewed lock with the standalone project, then run:

\`\`\`sh
npm ci
npm run typecheck
npm run build
npm start
\`\`\`

The server binds to \`0.0.0.0\`, uses \`PORT\` when supplied, and defaults to port 8080. Open \`http://localhost:8080\` locally. Its health check is \`/healthz\`.

For development, \`npm run dev\` starts Vite on port 3000. Importing or deploying this folder still requires verification in the destination environment.

## Data and credentials

Serving the launcher requires no credentials. Local MCP configuration and user-created WordPress data belong outside this exported project. Keep the MCP bridge on the participant's device; this static server supplies no MCP endpoint or relay.
`;
  return {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `${JSON.stringify(tsconfig, null, 2)}\n`,
    'README.md': readme,
  };
}

async function collectSourceFiles(appRoot) {
  const files = [];
  async function visit(path, required = true) {
    const absolute = join(appRoot, path);
    if (!required && !(await exists(absolute))) return;
    const info = await lstat(absolute);
    if (info.isSymbolicLink())
      throw new Error(`Export source must not be a symlink: ${path}`);
    if (info.isDirectory()) {
      for (const name of (await readdir(absolute)).sort()) {
        if (!excluded(name)) await visit(`${path}/${name}`);
      }
    } else if (info.isFile()) {
      files.push(path);
    } else {
      throw new Error(
        `Export source must be a regular file or directory: ${path}`,
      );
    }
  }
  for (const path of [
    'src',
    'index.html',
    'scripts/serve.mjs',
    'scripts/headers.mjs',
  ]) {
    await visit(path);
  }
  for (const path of ['public', 'AI_STUDIO_PROMPT.md']) {
    await visit(path, false);
  }
  return files.sort();
}

/** Output override supports disposable test fixtures; the CLI uses EXPORT_ROOT. */
export async function planExport({
  appRoot = APP_ROOT,
  outputRoot = EXPORT_ROOT,
} = {}) {
  const source = resolve(appRoot);
  const target = resolve(outputRoot);
  if (contains(source, target) || contains(target, source)) {
    throw new Error(
      'Export source and destination must be separate directories.',
    );
  }
  if (await exists(target))
    throw new Error(`Refusing to overwrite existing export: ${target}`);
  const sourceInfo = await lstat(source);
  if (sourceInfo.isSymbolicLink() || !sourceInfo.isDirectory()) {
    throw new Error('Export source must be a real directory.');
  }
  const packageInfo = await lstat(join(source, 'package.json'));
  if (packageInfo.isSymbolicLink() || !packageInfo.isFile()) {
    throw new Error('App package.json must be a regular file.');
  }
  const sourcePackage = JSON.parse(
    await readFile(join(source, 'package.json'), 'utf8'),
  );
  const files = await collectSourceFiles(source);
  const generated = generatedFiles(
    sourcePackage,
    files.includes('AI_STUDIO_PROMPT.md'),
  );
  return {
    effect: 'local export only',
    source,
    target,
    copies: files,
    generated,
    notes: [...EXPORT_NOTES],
  };
}

export async function applyExport(options = {}) {
  const plan = await planExport(options);
  await mkdir(dirname(plan.target), {recursive: true});
  // Exclusive creation also protects against a destination created after plan.
  await mkdir(plan.target);
  try {
    for (const path of plan.copies) {
      const destination = join(plan.target, path);
      await mkdir(dirname(destination), {recursive: true});
      await copyFile(
        join(plan.source, path),
        destination,
        constants.COPYFILE_EXCL,
      );
    }
    for (const [path, content] of Object.entries(plan.generated)) {
      await writeFile(join(plan.target, path), content, {flag: 'wx'});
    }
  } catch (error) {
    await rm(plan.target, {recursive: true, force: true});
    throw error;
  }
  return {...plan, applied: true};
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  const [action, ...extra] = process.argv.slice(2);
  if (!['plan', 'apply'].includes(action) || extra.length > 0) {
    console.error('Usage: node scripts/export-aistudio.mjs plan|apply');
    process.exitCode = 1;
  } else {
    try {
      const plan = await (action === 'apply' ? applyExport() : planExport());
      console.log(JSON.stringify(plan, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
