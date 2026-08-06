import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {readAppContract, type AppContract} from './app-contract-lib';
import {runBrowserVerification} from './verify-browser';

const ROOT_DIR = resolve(import.meta.dir, '..');
const APPS_DIR = join(ROOT_DIR, 'apps');

export interface VerificationResult {
  slug: string;
  success: boolean;
  checks: {
    contract: boolean;
    scaffoldMarkers: boolean;
    dependencyPolicy: boolean;
    appCheck: boolean;
    browserVerification: boolean;
  };
  errors: string[];
}

function walkSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const fullPath = join(dir, entry.name);
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    )
      continue;
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

export function checkScaffoldMarkers(
  appDir: string,
  contract: AppContract,
): string[] {
  const errors: string[] = [];

  if (contract.status === 'scaffold') {
    errors.push('App contract status is still "scaffold" (must be "complete")');
  }

  const sourceFiles = walkSourceFiles(join(appDir, 'src'));
  const e2eFiles = walkSourceFiles(join(appDir, 'e2e'));

  for (const file of [...sourceFiles, ...e2eFiles]) {
    const content = readFileSync(file, 'utf8');
    if (content.includes('readyMessage(')) {
      errors.push(
        `File ${file.replace(ROOT_DIR + '/', '')} still uses template readyMessage helper`,
      );
    }
    if (content.includes('is ready.')) {
      errors.push(
        `File ${file.replace(ROOT_DIR + '/', '')} contains scaffold message "is ready."`,
      );
    }
    if (content.includes('__APP_SLUG__') || content.includes('__APP_TITLE__')) {
      errors.push(
        `File ${file.replace(ROOT_DIR + '/', '')} contains unrendered template placeholders`,
      );
    }
    if (
      content.includes('SCAFFOLD_MARKER') ||
      content.includes('scaffold placeholder test')
    ) {
      errors.push(
        `File ${file.replace(ROOT_DIR + '/', '')} contains scaffold browser spec markers`,
      );
    }
  }

  return errors;
}

export function checkDependencyPolicy(appDir: string): string[] {
  const errors: string[] = [];

  // 1. Lockfile check
  const forbiddenLockfiles = [
    'package-lock.json',
    'bun.lockb',
    'yarn.lock',
    'pnpm-lock.yaml',
  ];
  for (const lockfile of forbiddenLockfiles) {
    if (existsSync(join(appDir, lockfile))) {
      errors.push(
        `App workspace contains forbidden app-local lockfile: ${lockfile} (only single root lockfile allowed)`,
      );
    }
  }

  // 2. package.json scripts check
  const pkgPath = join(appDir, 'package.json');
  if (!existsSync(pkgPath)) {
    errors.push('App workspace is missing package.json');
    return errors;
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const requiredScripts = ['dev', 'build', 'check', 'test'];
    for (const script of requiredScripts) {
      if (!pkg.scripts || !pkg.scripts[script]) {
        errors.push(`App package.json is missing required script: "${script}"`);
      }
    }
  } catch (err) {
    errors.push(
      `App package.json is invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return errors;
}

export async function verifyApp(
  slug: string,
  options: {skipBrowser?: boolean} = {},
): Promise<VerificationResult> {
  const appDir = join(APPS_DIR, slug);
  const result: VerificationResult = {
    slug,
    success: false,
    checks: {
      contract: false,
      scaffoldMarkers: false,
      dependencyPolicy: false,
      appCheck: false,
      browserVerification: false,
    },
    errors: [],
  };

  if (!existsSync(appDir)) {
    result.errors.push(`App workspace apps/${slug} does not exist`);
    return result;
  }

  // 1. Contract validation
  const contractInfo = readAppContract(appDir);
  if (!contractInfo) {
    result.errors.push(`App apps/${slug} is missing app.contract.json`);
    return result;
  }

  const {contract} = contractInfo;
  result.checks.contract = true;

  // 2. Scaffold and starter marker check
  const scaffoldErrors = checkScaffoldMarkers(appDir, contract);
  if (scaffoldErrors.length > 0) {
    result.errors.push(...scaffoldErrors);
  } else {
    result.checks.scaffoldMarkers = true;
  }

  // 3. Dependency policy check
  const depErrors = checkDependencyPolicy(appDir);
  if (depErrors.length > 0) {
    result.errors.push(...depErrors);
  } else {
    result.checks.dependencyPolicy = true;
  }

  // If initial policy checks fail, stop early before running heavy builds/tests
  if (result.errors.length > 0) {
    return result;
  }

  // 4. App check (typecheck, unit tests, build)
  console.log(
    `\nRunning app check (types, unit tests, build) for apps/${slug}...`,
  );
  const checkProc = Bun.spawn(
    ['bun', 'run', '--cwd', `apps/${slug}`, 'check'],
    {
      cwd: ROOT_DIR,
      env: Bun.env,
      stdout: 'inherit',
      stderr: 'inherit',
    },
  );
  const checkExitCode = await checkProc.exited;
  if (checkExitCode !== 0) {
    result.errors.push(
      `App check command failed with exit code ${checkExitCode}`,
    );
    return result;
  }
  result.checks.appCheck = true;

  // 5. Browser smoke test
  if (options.skipBrowser) {
    result.checks.browserVerification = true;
  } else {
    try {
      await runBrowserVerification(slug);
      result.checks.browserVerification = true;
    } catch (err) {
      result.errors.push(
        `Browser verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return result;
    }
  }

  result.success = true;
  return result;
}
