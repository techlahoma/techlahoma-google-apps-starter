import {mkdir, readdir, rm} from 'node:fs/promises';
import {isAbsolute, join, relative, resolve} from 'node:path';
import {
  CONFIG_FILENAME,
  type GoogleProjectConfig,
  deriveSiteId,
  validateConfig,
  validateSiteId,
} from './google-cloud-lib';

export const PLACEHOLDER_PROJECT_IDS = new Set([
  'small-google-app-dev',
  'my-google-app-dev',
  'todo-project',
  'placeholder-project',
]);

export type AppDeployStatus =
  'not_configured' | 'site_missing' | 'site_exists' | 'deployed' | 'unknown';

export interface DiscoveredApp {
  slug: string;
  directory: string;
  title: string;
  siteId?: string;
  deployedUrl?: string;
  status?: AppDeployStatus;
}

export interface FirebaseProject {
  projectId: string;
  displayName: string;
  projectNumber?: string;
}

export interface FirebaseHostingSite {
  siteId: string;
  type?: 'DEFAULT_SITE' | 'USER_SITE' | string;
  defaultUrl?: string;
}

export interface DeployReceipt {
  status: 'deployed' | 'deployed_but_unverified' | 'dry_run' | 'failed';
  projectId: string;
  app: string;
  siteId: string;
  deployedUrl: string;
  firebaseConsoleUrl: string;
  verified: boolean;
  verifiedAt?: string;
  error?: string;
}

export interface DeployErrorPayload {
  error: {
    code: string;
    message: string;
    remediation?: string;
    details?: unknown;
  };
}

export class DeployError extends Error {
  code: string;
  remediation?: string | undefined;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    remediation?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'DeployError';
    this.code = code;
    this.remediation = remediation;
    this.details = details;
  }

  toJSON(): DeployErrorPayload {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.remediation ? {remediation: this.remediation} : {}),
        ...(this.details !== undefined ? {details: this.details} : {}),
      },
    };
  }
}

export interface CommandExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandExecutor {
  exec(
    command: string[],
    options?: {cwd?: string; env?: Record<string, string>},
  ): Promise<CommandExecResult>;
}

export class DefaultCommandExecutor implements CommandExecutor {
  async exec(
    command: string[],
    options?: {cwd?: string; env?: Record<string, string>},
  ): Promise<CommandExecResult> {
    const process = Bun.spawn(command, {
      ...(options?.cwd ? {cwd: options.cwd} : {}),
      env: {...Bun.env, NO_UPDATE_NOTIFIER: '1', ...options?.env},
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);

    return {exitCode, stdout, stderr};
  }
}

export function sanitizeFirebaseErrorOutput(output: string): string {
  if (!output || typeof output !== 'string') {
    return '';
  }

  // Strip ANSI color sequences
  // eslint-disable-next-line no-control-regex
  let clean = output.replace(/\u001b\[[0-9;]*m/g, '');

  // Redact Bearer tokens, API keys, and sensitive flags/parameters
  clean = clean.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
  clean = clean.replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]');
  clean = clean.replace(/FIREBASE_TOKEN=\S+/gi, 'FIREBASE_TOKEN=[REDACTED]');
  clean = clean.replace(/access_token=\S+/gi, 'access_token=[REDACTED]');
  clean = clean.replace(/refresh_token=\S+/gi, 'refresh_token=[REDACTED]');

  // Limit output lines and characters to prevent diagnostic log dumps
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  const boundedLines = lines.slice(-25);
  let boundedText = boundedLines.join('\n');

  if (boundedText.length > 2500) {
    boundedText = boundedText.slice(-2500);
  }

  return boundedText.trim();
}

export async function saveDiagnosticReceipt(options: {
  rootDir: string;
  app: string;
  projectId: string;
  siteId: string;
  exitCode: number;
  command: string[];
  firebaseStderr: string;
}): Promise<string> {
  const {rootDir, app, projectId, siteId, exitCode, command, firebaseStderr} =
    options;
  const tmpDir = join(rootDir, '.starter', 'tmp', 'deploy-errors');

  await mkdir(tmpDir, {recursive: true});

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `deploy-error-${app}-${timestampStr}.json`;
  const filePath = join(tmpDir, filename);

  const safeData = {
    timestamp: new Date().toISOString(),
    app,
    projectId,
    siteId,
    exitCode,
    command,
    firebaseStderr,
  };

  await Bun.write(filePath, `${JSON.stringify(safeData, null, 2)}\n`);
  return relative(rootDir, filePath).replace(/\\/g, '/');
}

export function formatAppTitle(
  slug: string,
  pkgJson?: {title?: string; name?: string},
): string {
  if (
    pkgJson?.title &&
    typeof pkgJson.title === 'string' &&
    pkgJson.title.trim()
  ) {
    return pkgJson.title.trim();
  }

  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function discoverApps(rootDir: string): Promise<DiscoveredApp[]> {
  const appsDir = join(rootDir, 'apps');
  try {
    const entries = await readdir(appsDir, {withFileTypes: true});
    const apps: DiscoveredApp[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const directory = join(appsDir, slug);

      const pkgFile = Bun.file(join(directory, 'package.json'));
      const fbFile = Bun.file(join(directory, 'firebase.json'));

      if ((await pkgFile.exists()) && (await fbFile.exists())) {
        let pkgJson: {title?: string; name?: string} | undefined;
        try {
          pkgJson = JSON.parse(await pkgFile.text());
        } catch {
          // ignore error formatting title
        }
        const title = formatAppTitle(slug, pkgJson);
        apps.push({slug, directory, title});
      }
    }

    return apps.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch {
    return [];
  }
}

export function resolveAppTarget(
  appArg: string,
  rootDir: string,
  discoveredApps: DiscoveredApp[],
): DiscoveredApp {
  let cleanArg = appArg.trim();
  if (cleanArg.endsWith('/') || cleanArg.endsWith('\\')) {
    cleanArg = cleanArg.slice(0, -1);
  }

  let targetSlug = cleanArg;
  if (cleanArg.startsWith('./')) {
    cleanArg = cleanArg.slice(2);
  }
  if (cleanArg.startsWith('apps/')) {
    targetSlug = cleanArg.slice(5);
  } else if (isAbsolute(cleanArg)) {
    const rel = relative(join(rootDir, 'apps'), cleanArg);
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
      targetSlug = rel.split('/')[0]!;
    }
  }

  targetSlug = targetSlug.toLowerCase();
  const matched = discoveredApps.find(
    a => a.slug === targetSlug || a.directory === resolve(rootDir, cleanArg),
  );

  if (!matched) {
    throw new DeployError(
      'INVALID_APP',
      `App workspace "${appArg}" was not found under apps/.`,
      `Specify a valid app slug or path, e.g. "numeronym-generator" or "apps/numeronym-generator". Discovered apps: ${discoveredApps.map(a => a.slug).join(', ')}`,
    );
  }

  return matched;
}

export function detectAppFromCwd(
  cwd: string,
  rootDir: string,
  discoveredApps: DiscoveredApp[],
): DiscoveredApp | undefined {
  const appsDir = join(rootDir, 'apps');
  const rel = relative(appsDir, cwd);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
    const slug = rel.split('/')[0];
    return discoveredApps.find(a => a.slug === slug);
  }
  return undefined;
}

export function determineAppStatuses(
  apps: DiscoveredApp[],
  config: GoogleProjectConfig | null,
  existingSites: FirebaseHostingSite[],
  verifiedApps?: Set<string>,
): DiscoveredApp[] {
  if (isPlaceholderConfig(config)) {
    return apps.map(a => ({...a, status: 'not_configured'}));
  }

  const projectId = config!.project_id;

  return apps.map(app => {
    const siteId = config!.sites[app.slug] ?? deriveSiteId(projectId, app.slug);
    const existsRemotely = existingSites.some(s => s.siteId === siteId);

    let status: AppDeployStatus = 'site_missing';
    if (existsRemotely) {
      status = verifiedApps?.has(app.slug) ? 'deployed' : 'site_exists';
    }

    return {
      ...app,
      siteId,
      status,
    };
  });
}

export async function readRootConfig(
  rootDir: string,
): Promise<GoogleProjectConfig | null> {
  const configPath = join(rootDir, CONFIG_FILENAME);
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    return null;
  }

  try {
    const text = await file.text();
    return validateConfig(JSON.parse(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DeployError(
      'INVALID_CONFIG',
      `Root configuration ${CONFIG_FILENAME} is invalid: ${message}`,
      'Fix or remove google.project.json before deploying.',
      {cause: error},
    );
  }
}

export function isPlaceholderConfig(
  config: GoogleProjectConfig | null,
): boolean {
  if (!config) return true;
  if (!config.project_id) return true;
  const lower = config.project_id.toLowerCase();
  return (
    PLACEHOLDER_PROJECT_IDS.has(lower) ||
    lower.includes('todo') ||
    lower.includes('placeholder')
  );
}

export async function writeRootConfig(
  rootDir: string,
  config: GoogleProjectConfig,
): Promise<void> {
  const validated = validateConfig(config);
  const configPath = join(rootDir, CONFIG_FILENAME);
  const temporaryPath = `${configPath}.tmp`;
  await Bun.write(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`);
  const {rename} = await import('node:fs/promises');
  await rename(temporaryPath, configPath);
}

export async function checkFirebaseAuth(
  firebaseBinary: string,
  executor: CommandExecutor,
): Promise<boolean> {
  const res = await executor.exec([firebaseBinary, 'projects:list', '--json']);
  if (res.exitCode !== 0) {
    return false;
  }
  try {
    const parsed = JSON.parse(res.stdout);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.result)) {
      return true;
    }
  } catch {
    // ignore json parse failure
  }
  return false;
}

export async function listFirebaseProjects(
  firebaseBinary: string,
  executor: CommandExecutor,
): Promise<FirebaseProject[]> {
  const res = await executor.exec([firebaseBinary, 'projects:list', '--json']);
  if (res.exitCode !== 0) {
    const sanitized = sanitizeFirebaseErrorOutput(res.stderr || res.stdout);
    throw new DeployError(
      'AUTH_REQUIRED',
      'Failed to query Firebase projects. Firebase CLI authentication is missing or expired.',
      'Run "bun run firebase:login" to authenticate with Firebase.',
      {
        exitCode: res.exitCode,
        command: [firebaseBinary, 'projects:list', '--json'],
        firebaseStderr: sanitized,
      },
    );
  }

  try {
    const data = JSON.parse(res.stdout);
    const rawList = Array.isArray(data.result)
      ? data.result
      : Array.isArray(data)
        ? data
        : [];
    const projects: FirebaseProject[] = [];

    for (const item of rawList) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.projectId === 'string'
      ) {
        projects.push({
          projectId: item.projectId,
          displayName:
            typeof item.displayName === 'string' && item.displayName.trim()
              ? item.displayName.trim()
              : item.projectId,
          projectNumber:
            typeof item.projectNumber === 'string'
              ? item.projectNumber
              : undefined,
        });
      }
    }

    return projects;
  } catch (error) {
    throw new DeployError(
      'FIREBASE_RESPONSE_ERROR',
      'Received invalid response from Firebase CLI when listing projects.',
      'Ensure firebase CLI is up to date.',
      {error},
    );
  }
}

export async function listHostingSites(
  firebaseBinary: string,
  projectId: string,
  executor: CommandExecutor,
): Promise<FirebaseHostingSite[]> {
  const res = await executor.exec([
    firebaseBinary,
    'hosting:sites:list',
    '--project',
    projectId,
    '--json',
  ]);

  if (res.exitCode !== 0) {
    const sanitized = sanitizeFirebaseErrorOutput(res.stderr || res.stdout);
    throw new DeployError(
      'FIREBASE_CLI_ERROR',
      `Failed to list Hosting sites for project ${projectId}.`,
      `Verify project ${projectId} exists and your account has permission.`,
      {
        projectId,
        exitCode: res.exitCode,
        command: [firebaseBinary, 'hosting:sites:list', '--project', projectId],
        firebaseStderr: sanitized,
      },
    );
  }

  try {
    const data = JSON.parse(res.stdout);
    const rawSites = Array.isArray(data.result?.sites)
      ? data.result.sites
      : Array.isArray(data.sites)
        ? data.sites
        : Array.isArray(data.result)
          ? data.result
          : [];

    const sites: FirebaseHostingSite[] = [];
    for (const item of rawSites) {
      if (!item || typeof item !== 'object') continue;
      let siteId: string | undefined;
      if (typeof item.name === 'string' && item.name.includes('/sites/')) {
        siteId = item.name.split('/sites/')[1];
      } else if (typeof item.siteId === 'string') {
        siteId = item.siteId;
      } else if (typeof item.name === 'string') {
        siteId = item.name;
      }

      if (siteId) {
        sites.push({
          siteId,
          type: typeof item.type === 'string' ? item.type : undefined,
          defaultUrl:
            typeof item.defaultUrl === 'string'
              ? item.defaultUrl
              : `https://${siteId}.web.app`,
        });
      }
    }

    return sites;
  } catch (error) {
    throw new DeployError(
      'FIREBASE_RESPONSE_ERROR',
      `Invalid JSON output from firebase hosting:sites:list for ${projectId}.`,
      undefined,
      {error},
    );
  }
}

export function getProtectedDefaultSite(
  sites: FirebaseHostingSite[],
  projectId: string,
): FirebaseHostingSite | undefined {
  return sites.find(s => s.type === 'DEFAULT_SITE' || s.siteId === projectId);
}

export function validateDeploymentSite(
  siteId: string,
  projectId: string,
  defaultSite?: FirebaseHostingSite,
): void {
  validateSiteId(siteId);

  if (siteId === projectId) {
    throw new DeployError(
      'PROTECTED_SITE_REJECTED',
      `Refusing deployment to protected site ID "${siteId}" which equals project ID "${projectId}".`,
      'App deployments must use dedicated secondary Hosting sites.',
    );
  }

  if (defaultSite && siteId === defaultSite.siteId) {
    throw new DeployError(
      'PROTECTED_SITE_REJECTED',
      `Refusing deployment to protected default Hosting site "${siteId}".`,
      'Default Hosting sites are reserved and protected from automated app deployment.',
    );
  }
}

export interface SiteReadinessOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  sleepFn?: (ms: number) => Promise<void>;
  onProgress?: (attempt: number, maxAttempts: number) => void;
}

export async function pollSiteReadiness(
  firebaseBinary: string,
  projectId: string,
  siteId: string,
  executor: CommandExecutor,
  options?: SiteReadinessOptions,
): Promise<FirebaseHostingSite> {
  const maxAttempts = options?.maxAttempts ?? 6;
  const initialDelay = options?.initialDelayMs ?? 300;
  const backoffFactor = options?.backoffFactor ?? 1.5;
  const sleep = options?.sleepFn ?? (ms => new Promise(r => setTimeout(r, ms)));

  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options?.onProgress) {
      options.onProgress(attempt, maxAttempts);
    }

    const res = await executor.exec([
      firebaseBinary,
      'hosting:sites:get',
      siteId,
      '--project',
      projectId,
      '--json',
    ]);

    if (res.exitCode === 0) {
      try {
        const data = JSON.parse(res.stdout);
        const siteObj = data.result ?? data;
        if (siteObj && typeof siteObj === 'object') {
          return {
            siteId,
            type: typeof siteObj.type === 'string' ? siteObj.type : undefined,
            defaultUrl:
              typeof siteObj.defaultUrl === 'string'
                ? siteObj.defaultUrl
                : `https://${siteId}.web.app`,
          };
        }
      } catch {
        // Retry parsing failure
      }
    }

    const sanitized = sanitizeFirebaseErrorOutput(res.stderr || res.stdout);

    // Fail immediately without retrying non-transient errors (auth, quota, forbidden)
    if (
      sanitized.includes('403') ||
      sanitized.includes('PERMISSION_DENIED') ||
      sanitized.includes('AUTH_REQUIRED') ||
      sanitized.includes('unauthenticated') ||
      sanitized.includes('Quota exceeded')
    ) {
      throw new DeployError(
        'SITE_READINESS_FAILED',
        `Site readiness check failed with a non-transient error for site "${siteId}".`,
        'Verify account permissions and Firebase Hosting project status.',
        {
          app: siteId,
          projectId,
          siteId,
          exitCode: res.exitCode,
          command: [
            firebaseBinary,
            'hosting:sites:get',
            siteId,
            '--project',
            projectId,
          ],
          firebaseStderr: sanitized,
        },
      );
    }

    if (attempt < maxAttempts) {
      await sleep(currentDelay);
      currentDelay = Math.round(currentDelay * backoffFactor);
    }
  }

  throw new DeployError(
    'SITE_NOT_READY',
    `Hosting site "${siteId}" did not become ready within the expected propagation window (${maxAttempts} attempts).`,
    'Wait a moment for site creation to complete propagating and retry "bun run deploy".',
    {
      app: siteId,
      projectId,
      siteId,
      attempts: maxAttempts,
    },
  );
}

export async function ensureSiteExists(
  firebaseBinary: string,
  projectId: string,
  siteId: string,
  existingSites: FirebaseHostingSite[],
  executor: CommandExecutor,
  dryRun = false,
  readinessOptions?: SiteReadinessOptions,
): Promise<{created: boolean}> {
  const existing = existingSites.find(s => s.siteId === siteId);
  if (existing) {
    return {created: false};
  }

  if (dryRun) {
    return {created: true};
  }

  const res = await executor.exec([
    firebaseBinary,
    'hosting:sites:create',
    siteId,
    '--project',
    projectId,
    '--non-interactive',
  ]);

  if (res.exitCode !== 0) {
    const sanitized = sanitizeFirebaseErrorOutput(res.stderr || res.stdout);
    throw new DeployError(
      'SITE_CREATION_FAILED',
      `Failed to create Firebase Hosting site "${siteId}" in project "${projectId}".`,
      'Check Firebase Hosting site limits or site name availability.',
      {
        app: siteId,
        projectId,
        siteId,
        exitCode: res.exitCode,
        command: [
          firebaseBinary,
          'hosting:sites:create',
          siteId,
          '--project',
          projectId,
        ],
        firebaseStderr: sanitized,
      },
    );
  }

  await pollSiteReadiness(
    firebaseBinary,
    projectId,
    siteId,
    executor,
    readinessOptions,
  );

  return {created: true};
}

export async function buildAppWorkspace(
  app: DiscoveredApp,
  executor: CommandExecutor,
): Promise<void> {
  const res = await executor.exec([
    'bun',
    'run',
    '--cwd',
    app.directory,
    'build',
  ]);
  if (res.exitCode !== 0) {
    throw new DeployError(
      'BUILD_FAILED',
      `Build failed for app workspace ${app.slug} (${app.directory}).`,
      `Fix build errors in apps/${app.slug} and retry.`,
      {stderr: res.stderr, stdout: res.stdout},
    );
  }
}

export async function deployAppWithTarget(options: {
  rootDir: string;
  firebaseBinary: string;
  projectId: string;
  app: DiscoveredApp;
  siteId: string;
  executor: CommandExecutor;
}): Promise<void> {
  const {rootDir, firebaseBinary, projectId, app, siteId, executor} = options;

  // Verify dist directory exists before deployment
  const distDir = join(app.directory, 'dist');
  if (!(await Bun.file(join(distDir, 'index.html')).exists())) {
    throw new DeployError(
      'MISSING_BUILD_OUTPUT',
      `Build output dist/index.html does not exist for app workspace apps/${app.slug}.`,
      `Run "bun run --cwd apps/${app.slug} build" first.`,
    );
  }

  // Create temporary deploy workspace directory under root scratch/tmp
  const tmpDirName = `.firebase-deploy-tmp-${app.slug}-${Math.random().toString(36).substring(2, 8)}`;
  const tmpDir = join(rootDir, tmpDirName);

  try {
    await mkdir(tmpDir, {recursive: true});

    const firebasercContent = {
      projects: {
        default: projectId,
      },
      targets: {
        [projectId]: {
          hosting: {
            [app.slug]: [siteId],
          },
        },
      },
    };

    const relativeDistPath = relative(tmpDir, distDir).replace(/\\/g, '/');

    const firebaseJsonContent = {
      hosting: {
        target: app.slug,
        public: relativeDistPath,
        ignore: ['**/.*', '**/node_modules/**'],
      },
    };

    await Bun.write(
      join(tmpDir, '.firebaserc'),
      JSON.stringify(firebasercContent, null, 2),
    );
    await Bun.write(
      join(tmpDir, 'firebase.json'),
      JSON.stringify(firebaseJsonContent, null, 2),
    );

    const relFirebaseBinary = relative(
      tmpDir,
      resolve(rootDir, firebaseBinary),
    ).replace(/\\/g, '/');

    const res = await executor.exec(
      [
        relFirebaseBinary.startsWith('.')
          ? relFirebaseBinary
          : `./${relFirebaseBinary}`,
        'deploy',
        '--only',
        `hosting:${app.slug}`,
        '--project',
        projectId,
        '--config',
        'firebase.json',
        '--non-interactive',
      ],
      {cwd: tmpDir},
    );

    if (res.exitCode !== 0) {
      const sanitized = sanitizeFirebaseErrorOutput(res.stderr || res.stdout);
      const safeCmd = [
        'firebase',
        'deploy',
        '--only',
        `hosting:${app.slug}`,
        '--project',
        projectId,
      ];

      const evidencePath = await saveDiagnosticReceipt({
        rootDir,
        app: app.slug,
        projectId,
        siteId,
        exitCode: res.exitCode,
        command: safeCmd,
        firebaseStderr: sanitized,
      });

      throw new DeployError(
        'DEPLOYMENT_FAILED',
        `Firebase CLI deployment failed for app workspace apps/${app.slug} on site ${siteId}.`,
        'Review the Firebase error below.',
        {
          app: app.slug,
          projectId,
          siteId,
          exitCode: res.exitCode,
          command: safeCmd,
          firebaseStderr: sanitized,
          evidencePath,
        },
      );
    }
  } finally {
    try {
      await rm(tmpDir, {recursive: true, force: true});
    } catch {
      // ignore cleanup error
    }
  }
}

export async function fetchHostingSiteReceipt(options: {
  firebaseBinary: string;
  projectId: string;
  app: DiscoveredApp;
  siteId: string;
  executor: CommandExecutor;
  verifyFetch?: (url: string) => Promise<boolean>;
}): Promise<DeployReceipt> {
  const {firebaseBinary, projectId, app, siteId, executor, verifyFetch} =
    options;
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/hosting/sites`;
  let defaultUrl = `https://${siteId}.web.app`;

  const res = await executor.exec([
    firebaseBinary,
    'hosting:sites:get',
    siteId,
    '--project',
    projectId,
    '--json',
  ]);

  if (res.exitCode === 0) {
    try {
      const data = JSON.parse(res.stdout);
      const siteObj = data.result ?? data;
      if (
        siteObj &&
        typeof siteObj.defaultUrl === 'string' &&
        siteObj.defaultUrl.trim()
      ) {
        defaultUrl = siteObj.defaultUrl.trim();
      }
    } catch {
      // fallback to constructed defaultUrl
    }
  }

  let verified = false;
  let verificationError: string | undefined;

  if (verifyFetch) {
    try {
      verified = await verifyFetch(defaultUrl);
      if (!verified) {
        verificationError = `HTTP GET check to ${defaultUrl} failed or returned non-success status code.`;
      }
    } catch (err) {
      verified = false;
      verificationError = err instanceof Error ? err.message : String(err);
    }
  } else {
    // Default fetch implementation
    try {
      const resp = await fetch(defaultUrl, {method: 'GET'});
      verified = resp.ok;
      if (!verified) {
        verificationError = `HTTP request returned status ${resp.status} ${resp.statusText}`;
      }
    } catch (err) {
      verified = false;
      verificationError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    status: verified ? 'deployed' : 'deployed_but_unverified',
    projectId,
    app: app.slug,
    siteId,
    deployedUrl: defaultUrl,
    firebaseConsoleUrl: consoleUrl,
    verified,
    verifiedAt: new Date().toISOString(),
    ...(verificationError ? {error: verificationError} : {}),
  };
}
