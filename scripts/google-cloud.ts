#!/usr/bin/env bun

import {readdir, rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {
  CONFIG_FILENAME,
  type CommandPlan,
  configPlan,
  deployAllPlan,
  deployPlan,
  destroyPlan,
  deriveSiteId,
  makeConfig,
  provisionPlan,
  requireConfirmation,
  rootConfigPath,
  sitesDestroyPlan,
  sitesPlan,
  validateConfig,
} from './google-cloud-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');
const ROOT_FIREBASE_BINARY = './node_modules/.bin/firebase';
const APP_FIREBASE_BINARY = '../../node_modules/.bin/firebase';

const HELP = `Techlahoma Google Apps Starter shared cloud lifecycle

Notice:
  For routine app deployments, use the simplified command:
    bun run deploy [APP_OR_DIRECTORY]

Usage:
  bun scripts/google-cloud.ts doctor [--app APP]
  bun scripts/google-cloud.ts config plan --project-id ID --display-name NAME
  bun scripts/google-cloud.ts config apply --project-id ID --display-name NAME
  bun scripts/google-cloud.ts provision plan
  bun scripts/google-cloud.ts provision apply --confirm ID
  bun scripts/google-cloud.ts sites plan [--app APP]
  bun scripts/google-cloud.ts sites apply --confirm ID [--app APP]
  bun scripts/google-cloud.ts deploy plan --app APP (legacy; prefer "bun run deploy")
  bun scripts/google-cloud.ts deploy apply --app APP --confirm ID (legacy; prefer "bun run deploy")
  bun scripts/google-cloud.ts deploy-all plan (legacy; prefer "bun run deploy --all")
  bun scripts/google-cloud.ts deploy-all apply --confirm ID (legacy; prefer "bun run deploy --all")
  bun scripts/google-cloud.ts sites:destroy plan --app APP
  bun scripts/google-cloud.ts sites:destroy apply --app APP --confirm ID
  bun scripts/google-cloud.ts destroy plan
  bun scripts/google-cloud.ts destroy apply --confirm ID

Optional config flags:
  --environment development|preview|production
  --region us-central1

Only "apply" mutates local or remote state. Remote apply commands require the
exact project ID from the root ignored ${CONFIG_FILENAME} file.`;

interface Flags {
  projectId?: string | undefined;
  displayName?: string | undefined;
  environment?: string | undefined;
  region?: string | undefined;
  confirm?: string | undefined;
  app?: string | undefined;
}

function parseFlags(args: string[], allowed: string[]): Flags {
  const flags: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];

    if (!name?.startsWith('--') || !allowed.includes(name)) {
      throw new Error(`Unknown option: ${name ?? '<missing>'}`);
    }
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`);
    }
    if (name in flags) {
      throw new Error(`Duplicate option: ${name}`);
    }

    flags[name] = value;
  }

  return {
    projectId: flags['--project-id'],
    displayName: flags['--display-name'],
    environment: flags['--environment'],
    region: flags['--region'],
    confirm: flags['--confirm'],
    app: flags['--app'],
  };
}

async function discoverApps(): Promise<string[]> {
  const appsDir = join(ROOT_DIR, 'apps');
  try {
    const entries = await readdir(appsDir, {withFileTypes: true});
    const apps: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pkgExists = await Bun.file(
          join(appsDir, entry.name, 'package.json'),
        ).exists();
        const fbExists = await Bun.file(
          join(appsDir, entry.name, 'firebase.json'),
        ).exists();
        if (pkgExists && fbExists) {
          apps.push(entry.name);
        }
      }
    }
    return apps.sort();
  } catch {
    return [];
  }
}

async function resolveApp(app: string | undefined): Promise<{
  slug: string;
  directory: string;
}> {
  if (!app || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(app)) {
    throw new Error('Pass a valid app workspace with --app APP');
  }
  const directory = join(ROOT_DIR, 'apps', app);
  if (!(await Bun.file(join(directory, 'package.json')).exists())) {
    throw new Error(`App workspace does not exist: apps/${app}`);
  }
  if (!(await Bun.file(join(directory, 'firebase.json')).exists())) {
    throw new Error(`App is missing Firebase configuration: apps/${app}`);
  }
  return {
    slug: app,
    directory,
  };
}

async function readRootConfig() {
  const configPath = join(ROOT_DIR, rootConfigPath());
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    throw new Error(
      `${rootConfigPath()} is missing. Run: bun run google:config apply --project-id ID --display-name NAME`,
    );
  }

  try {
    return validateConfig(JSON.parse(await file.text()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${rootConfigPath()}: ${message}`, {
      cause: error,
    });
  }
}

function printPlan(plan: CommandPlan): void {
  console.log(JSON.stringify({mode: 'plan', ...plan}, null, 2));
}

async function executeCommands(
  commands: string[][],
  workingDirectory: string,
): Promise<void> {
  const [command, ...remaining] = commands;
  if (!command) return;

  const process = Bun.spawn(command, {
    cwd: workingDirectory,
    env: {...Bun.env, NO_UPDATE_NOTIFIER: '1'},
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(
      `Command failed with exit code ${exitCode}: ${command.join(' ')}`,
    );
  }

  await executeCommands(remaining, workingDirectory);
}

async function doctor(args: string[]): Promise<void> {
  const flags = parseFlags(args, ['--app']);
  const discoveredApps = await discoverApps();
  const firebaseFile = Bun.file(join(ROOT_DIR, ROOT_FIREBASE_BINARY));
  const firebasePackage = Bun.file(
    join(ROOT_DIR, 'node_modules/firebase-tools/package.json'),
  );
  const configFile = Bun.file(join(ROOT_DIR, rootConfigPath()));

  let project: string | null = null;
  let configStatus = 'not configured';
  let firebaseVersion: string | null = null;
  let sitesMap: Record<string, string> = {};

  if (await firebasePackage.exists()) {
    const packageData = JSON.parse(await firebasePackage.text()) as {
      version?: string;
    };
    firebaseVersion = packageData.version ?? null;
  }

  if (await configFile.exists()) {
    const config = await readRootConfig();
    project = config.project_id;
    configStatus = 'valid';
    sitesMap = config.sites;
    for (const app of discoveredApps) {
      if (!sitesMap[app]) {
        sitesMap[app] = deriveSiteId(config.project_id, app);
      }
    }
  }

  if (flags.app) {
    await resolveApp(flags.app);
  }

  console.log(
    JSON.stringify(
      {
        root: ROOT_DIR,
        config: configStatus,
        project,
        apps: discoveredApps.map(app => ({
          slug: app,
          site_id: sitesMap[app] ?? null,
        })),
        selected_app: flags.app ?? null,
        firebase_cli: {
          installed: await firebaseFile.exists(),
          version: firebaseVersion,
          expected: '15.24.0',
        },
        gcloud_cli: {
          installed: Boolean(Bun.which('gcloud')),
          required_for: 'destroy apply only',
        },
        authentication: 'not checked; doctor makes no cloud request',
      },
      null,
      2,
    ),
  );
}

async function configure(action: string, args: string[]): Promise<void> {
  const flags = parseFlags(args, [
    '--project-id',
    '--display-name',
    '--environment',
    '--region',
  ]);
  const discoveredApps = await discoverApps();
  const configPath = join(ROOT_DIR, rootConfigPath());
  const existingFile = Bun.file(configPath);
  let existingConfig;
  if (await existingFile.exists()) {
    try {
      existingConfig = validateConfig(JSON.parse(await existingFile.text()));
    } catch {
      // Ignored if invalid when updating
    }
  }

  const config = makeConfig({...flags, apps: discoveredApps}, existingConfig);
  const plan = configPlan(config);
  printPlan(plan);

  if (action === 'plan') return;
  if (action !== 'apply') {
    throw new Error('Config action must be "plan" or "apply"');
  }

  const temporaryPath = `${configPath}.tmp`;
  await Bun.write(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporaryPath, configPath);
  console.log(`Wrote ${rootConfigPath()} for project ${config.project_id}.`);
}

async function remoteAction(
  command: string,
  action: string,
  args: string[],
): Promise<void> {
  if (action !== 'plan' && action !== 'apply') {
    throw new Error(`${command} action must be "plan" or "apply"`);
  }

  const allowedFlags = ['--confirm'];
  if (['sites', 'deploy', 'sites:destroy'].includes(command)) {
    allowedFlags.push('--app');
  }

  const flags = parseFlags(args, allowedFlags);
  const config = await readRootConfig();
  const discoveredApps = await discoverApps();
  const gcloud = Bun.which('gcloud') ?? 'gcloud';

  let plan: CommandPlan;
  let workDir = ROOT_DIR;

  if (command === 'provision') {
    plan = provisionPlan(config, ROOT_FIREBASE_BINARY);
  } else if (command === 'sites') {
    if (flags.app) {
      await resolveApp(flags.app);
    }
    plan = sitesPlan(config, ROOT_FIREBASE_BINARY, discoveredApps, flags.app);
  } else if (command === 'deploy') {
    const app = await resolveApp(flags.app);
    workDir = app.directory;
    plan = deployPlan(config, APP_FIREBASE_BINARY, app.slug);
  } else if (command === 'deploy-all') {
    plan = deployAllPlan(config, ROOT_FIREBASE_BINARY, discoveredApps);
  } else if (command === 'sites:destroy' || command === 'site:destroy') {
    const app = await resolveApp(flags.app);
    plan = sitesDestroyPlan(config, ROOT_FIREBASE_BINARY, app.slug);
  } else if (command === 'destroy') {
    plan = destroyPlan(config, gcloud);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  printPlan(plan);

  if (action === 'plan') return;
  requireConfirmation(config, flags.confirm);

  if (
    command !== 'destroy' &&
    !(await Bun.file(join(ROOT_DIR, ROOT_FIREBASE_BINARY)).exists())
  ) {
    throw new Error('Firebase CLI is missing. Run bun install first.');
  }
  if (command === 'destroy' && !Bun.which('gcloud')) {
    throw new Error('gcloud CLI is required for whole-project teardown');
  }

  await executeCommands(plan.commands, workDir);
}

async function main(): Promise<void> {
  const [command, action, ...args] = Bun.argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    console.log(HELP);
    return;
  }
  if (command === 'doctor') {
    await doctor([action, ...args].filter(value => value !== undefined));
    return;
  }
  if (!action) throw new Error(`${command} requires plan or apply`);
  if (command === 'config') {
    await configure(action, args);
    return;
  }
  if (
    [
      'provision',
      'sites',
      'deploy',
      'deploy-all',
      'sites:destroy',
      'site:destroy',
      'destroy',
    ].includes(command)
  ) {
    await remoteAction(command, action, args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(
    `google-cloud: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
