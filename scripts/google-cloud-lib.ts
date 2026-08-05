import {createHash} from 'node:crypto';

export const CONFIG_FILENAME = 'google.project.json';

export type Environment = 'development' | 'preview' | 'production';

export interface GoogleProjectConfig {
  schema_version: 1;
  project_id: string;
  display_name: string;
  environment: Environment;
  region: string;
  features: ['hosting'];
  sites: Record<string, string>;
}

export interface CommandPlan {
  effect:
    | 'local-write'
    | 'remote-write'
    | 'deploy'
    | 'destructive-remote-write';
  target: string;
  commands: string[][];
  notes: string[];
}

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const SITE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,28}[a-z0-9]$/;
const REGION_PATTERN = /^[a-z]+-[a-z]+[0-9]$/;
const ENVIRONMENTS = new Set<Environment>([
  'development',
  'preview',
  'production',
]);

export function validateSiteId(siteId: string): string {
  if (typeof siteId !== 'string' || !SITE_ID_PATTERN.test(siteId)) {
    throw new Error(
      `site_id "${siteId}" must be 4-30 lowercase letters, digits, or hyphens; start and end with a letter or digit`,
    );
  }
  return siteId;
}

export function deriveSiteId(projectId: string, appSlug: string): string {
  const hash = createHash('sha256')
    .update(`${projectId}:${appSlug}`)
    .digest('hex')
    .slice(0, 6);

  const cleanSlug = appSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const maxSlugLen = 30 - 1 - hash.length; // 23
  let truncatedSlug = cleanSlug.slice(0, maxSlugLen).replace(/-$/, '');
  if (truncatedSlug.length === 0) {
    truncatedSlug = 'app';
  }

  const siteId = `${truncatedSlug}-${hash}`;
  return validateSiteId(siteId);
}

export function validateConfig(value: unknown): GoogleProjectConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Project config must be a JSON object');
  }

  const candidate = value as Partial<GoogleProjectConfig>;

  if (candidate.schema_version !== 1) {
    throw new Error('schema_version must be 1');
  }

  if (
    typeof candidate.project_id !== 'string' ||
    !PROJECT_ID_PATTERN.test(candidate.project_id)
  ) {
    throw new Error(
      'project_id must be 6-30 lowercase letters, digits, or hyphens; start with a letter and end with a letter or digit',
    );
  }

  if (
    typeof candidate.display_name !== 'string' ||
    candidate.display_name.trim().length < 4 ||
    candidate.display_name.length > 30
  ) {
    throw new Error('display_name must be 4-30 characters');
  }

  if (
    typeof candidate.environment !== 'string' ||
    !ENVIRONMENTS.has(candidate.environment as Environment)
  ) {
    throw new Error('environment must be development, preview, or production');
  }

  if (
    typeof candidate.region !== 'string' ||
    !REGION_PATTERN.test(candidate.region)
  ) {
    throw new Error('region must look like us-central1');
  }

  if (
    !Array.isArray(candidate.features) ||
    candidate.features.length !== 1 ||
    candidate.features[0] !== 'hosting'
  ) {
    throw new Error(
      'features must be exactly ["hosting"] in the simple starter',
    );
  }

  const sites: Record<string, string> = {};
  if (candidate.sites && typeof candidate.sites === 'object') {
    for (const [appSlug, siteId] of Object.entries(candidate.sites)) {
      if (typeof siteId === 'string') {
        sites[appSlug] = validateSiteId(siteId);
      }
    }
  }

  return {
    schema_version: 1,
    project_id: candidate.project_id,
    display_name: candidate.display_name.trim(),
    environment: candidate.environment as Environment,
    region: candidate.region,
    features: ['hosting'],
    sites,
  };
}

export function makeConfig(
  options: {
    projectId?: string | undefined;
    displayName?: string | undefined;
    environment?: string | undefined;
    region?: string | undefined;
    sites?: Record<string, string> | undefined;
    apps?: string[] | undefined;
  },
  existingConfig?: GoogleProjectConfig | undefined,
): GoogleProjectConfig {
  const env = typeof process !== 'undefined' ? process.env : {};
  const projectId =
    options.projectId ?? existingConfig?.project_id ?? env.FIREBASE_PROJECT_ID;
  const displayName =
    options.displayName ??
    existingConfig?.display_name ??
    env.FIREBASE_DISPLAY_NAME;
  const environment =
    options.environment ??
    existingConfig?.environment ??
    env.FIREBASE_ENVIRONMENT ??
    'development';
  const region =
    options.region ??
    existingConfig?.region ??
    env.FIREBASE_REGION ??
    'us-central1';

  const initialConfig = validateConfig({
    schema_version: 1,
    project_id: projectId,
    display_name: displayName,
    environment,
    region,
    features: ['hosting'],
    sites: options.sites ?? existingConfig?.sites ?? {},
  });

  const sites = {...initialConfig.sites};
  if (options.apps) {
    for (const app of options.apps) {
      if (!sites[app]) {
        sites[app] = deriveSiteId(initialConfig.project_id, app);
      }
    }
  }

  return {
    ...initialConfig,
    sites,
  };
}

export function rootConfigPath(): string {
  return CONFIG_FILENAME;
}

export function configPlan(config: GoogleProjectConfig): CommandPlan {
  const configPath = rootConfigPath();
  const siteMappings = Object.entries(config.sites)
    .map(([app, site]) => `  - ${app} => ${site}`)
    .join('\n');

  return {
    effect: 'local-write',
    target: configPath,
    commands: [],
    notes: [
      `Write root configuration for shared Firebase project ${config.project_id}.`,
      `${configPath} is ignored by Git and contains no credentials.`,
      siteMappings ? `Hosting site mappings:\n${siteMappings}` : 'No apps mapped.',
    ],
  };
}

export function provisionPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
): CommandPlan {
  return {
    effect: 'remote-write',
    target: `Firebase and Google Cloud project ${config.project_id}`,
    commands: [
      [
        firebaseBinary,
        'projects:create',
        config.project_id,
        '--display-name',
        config.display_name,
        '--non-interactive',
      ],
    ],
    notes: [
      'Creates one shared Google Cloud project and adds Firebase.',
      'Does not link a billing account or enable paid application services.',
    ],
  };
}

export function sitesPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
  apps: string[],
  selectedApp?: string,
): CommandPlan {
  const targetApps = selectedApp ? [selectedApp] : apps;
  const commands: string[][] = [];
  const notes: string[] = [];

  for (const app of targetApps) {
    const siteId = config.sites[app] ?? deriveSiteId(config.project_id, app);
    commands.push([
      firebaseBinary,
      'hosting:sites:create',
      siteId,
      '--project',
      config.project_id,
      '--non-interactive',
    ]);
    notes.push(`Provision Firebase Hosting site ${siteId} for app ${app}.`);
  }

  return {
    effect: 'remote-write',
    target: `Firebase Hosting site(s) in project ${config.project_id}`,
    commands,
    notes,
  };
}

export function deployPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
  app: string,
): CommandPlan {
  const siteId = config.sites[app] ?? deriveSiteId(config.project_id, app);
  return {
    effect: 'deploy',
    target: `apps/${app} on Firebase Hosting site ${siteId} in project ${config.project_id}`,
    commands: [
      ['bun', 'run', 'build'],
      [
        firebaseBinary,
        'deploy',
        '--only',
        `hosting:${siteId}`,
        '--project',
        config.project_id,
        '--non-interactive',
      ],
    ],
    notes: [
      `Runs from apps/${app}.`,
      `Builds locally, then deploys to site ${siteId} on project ${config.project_id}.`,
    ],
  };
}

export function deployAllPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
  apps: string[],
): CommandPlan {
  const commands: string[][] = [];
  const notes: string[] = [];

  for (const app of apps) {
    const siteId = config.sites[app] ?? deriveSiteId(config.project_id, app);
    commands.push(['bun', 'run', '--cwd', `apps/${app}`, 'build']);
    commands.push([
      firebaseBinary,
      'deploy',
      '--only',
      `hosting:${siteId}`,
      '--project',
      config.project_id,
      '--non-interactive',
    ]);
    notes.push(
      `Build and deploy app workspace apps/${app} to Hosting site ${siteId}.`,
    );
  }

  return {
    effect: 'deploy',
    target: `All apps (${apps.join(', ')}) on Firebase Hosting project ${config.project_id}`,
    commands,
    notes,
  };
}

export function sitesDestroyPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
  app: string,
): CommandPlan {
  const siteId = config.sites[app] ?? deriveSiteId(config.project_id, app);
  return {
    effect: 'destructive-remote-write',
    target: `Firebase Hosting site ${siteId} for app ${app} in project ${config.project_id}`,
    commands: [
      [
        firebaseBinary,
        'hosting:sites:delete',
        siteId,
        '--project',
        config.project_id,
        '--force',
        '--non-interactive',
      ],
    ],
    notes: [
      `Deletes Firebase Hosting site ${siteId} without deleting the shared project.`,
      `Project ${config.project_id} remains intact.`,
    ],
  };
}

export function destroyPlan(
  config: GoogleProjectConfig,
  gcloudBinary: string,
): CommandPlan {
  return {
    effect: 'destructive-remote-write',
    target: `Entire Google Cloud project ${config.project_id}`,
    commands: [
      [gcloudBinary, 'projects', 'delete', config.project_id, '--quiet'],
    ],
    notes: [
      'Deletes the whole shared environment and all contained sites.',
      'Google Cloud normally retains a limited recovery window; do not rely on it as a backup.',
    ],
  };
}

export function requireConfirmation(
  config: GoogleProjectConfig,
  confirmation?: string,
): void {
  if (confirmation !== config.project_id) {
    throw new Error(`Refusing to apply: pass --confirm ${config.project_id}`);
  }
}
