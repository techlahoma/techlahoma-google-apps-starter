export const CONFIG_FILENAME = 'google.project.json';

export type Environment = 'development' | 'preview' | 'production';

export interface GoogleProjectConfig {
  schema_version: 1;
  project_id: string;
  display_name: string;
  environment: Environment;
  region: string;
  features: ['hosting'];
}

export interface CommandPlan {
  effect:
    'local-write' | 'remote-write' | 'deploy' | 'destructive-remote-write';
  target: string;
  commands: string[][];
  notes: string[];
}

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const REGION_PATTERN = /^[a-z]+-[a-z]+[0-9]$/;
const ENVIRONMENTS = new Set<Environment>([
  'development',
  'preview',
  'production',
]);

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

  return {
    schema_version: 1,
    project_id: candidate.project_id,
    display_name: candidate.display_name.trim(),
    environment: candidate.environment as Environment,
    region: candidate.region,
    features: ['hosting'],
  };
}

export function makeConfig(options: {
  projectId?: string | undefined;
  displayName?: string | undefined;
  environment?: string | undefined;
  region?: string | undefined;
}): GoogleProjectConfig {
  return validateConfig({
    schema_version: 1,
    project_id: options.projectId,
    display_name: options.displayName,
    environment: options.environment ?? 'development',
    region: options.region ?? 'us-central1',
    features: ['hosting'],
  });
}

export function appConfigPath(app: string): string {
  return `apps/${app}/${CONFIG_FILENAME}`;
}

export function configPlan(
  config: GoogleProjectConfig,
  app: string,
): CommandPlan {
  const configPath = appConfigPath(app);
  return {
    effect: 'local-write',
    target: configPath,
    commands: [],
    notes: [
      `Write local configuration for ${config.project_id} and app ${app}.`,
      `${configPath} is ignored by Git and contains no credentials.`,
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
      'Creates one Google Cloud project and adds Firebase.',
      'Does not link a billing account or enable paid application services.',
    ],
  };
}

export function deployPlan(
  config: GoogleProjectConfig,
  firebaseBinary: string,
  app: string,
): CommandPlan {
  return {
    effect: 'deploy',
    target: `apps/${app} on Firebase Hosting project ${config.project_id}`,
    commands: [
      ['bun', 'run', 'build'],
      [
        firebaseBinary,
        'deploy',
        '--only',
        'hosting',
        '--project',
        config.project_id,
        '--non-interactive',
      ],
    ],
    notes: [
      `Runs from apps/${app}.`,
      'Builds locally, then deploys only the static Hosting surface.',
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
      'Deletes the whole environment, not selected resources.',
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
