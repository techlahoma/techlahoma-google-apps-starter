#!/usr/bin/env bun

import {rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {
  CONFIG_FILENAME,
  appConfigPath,
  type CommandPlan,
  configPlan,
  deployPlan,
  destroyPlan,
  makeConfig,
  provisionPlan,
  requireConfirmation,
  validateConfig,
} from './google-cloud-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');
const ROOT_FIREBASE_BINARY = './node_modules/.bin/firebase';
const APP_FIREBASE_BINARY = '../../node_modules/.bin/firebase';

const HELP = `Techlahoma Google Apps Starter cloud lifecycle

Usage:
  bun scripts/google-cloud.ts doctor --app APP
  bun scripts/google-cloud.ts config plan --app APP --project-id ID --display-name NAME
  bun scripts/google-cloud.ts config apply --app APP --project-id ID --display-name NAME
  bun scripts/google-cloud.ts provision plan --app APP
  bun scripts/google-cloud.ts provision apply --app APP --confirm ID
  bun scripts/google-cloud.ts deploy plan --app APP
  bun scripts/google-cloud.ts deploy apply --app APP --confirm ID
  bun scripts/google-cloud.ts destroy plan --app APP
  bun scripts/google-cloud.ts destroy apply --app APP --confirm ID

Optional config flags:
  --environment development|preview|production
  --region us-central1

Only "apply" mutates local or remote state. Remote apply commands require the
exact project ID from the selected app's ignored ${CONFIG_FILENAME} file.`;

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

async function resolveApp(app: string | undefined): Promise<{
  slug: string;
  directory: string;
  configPath: string;
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
    configPath: join(ROOT_DIR, appConfigPath(app)),
  };
}

async function readConfig(app: Awaited<ReturnType<typeof resolveApp>>) {
  const file = Bun.file(app.configPath);
  if (!(await file.exists())) {
    throw new Error(
      `${appConfigPath(app.slug)} is missing. Run: bun run google:config apply --app ${app.slug} --project-id ID --display-name NAME`,
    );
  }

  try {
    return validateConfig(JSON.parse(await file.text()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${appConfigPath(app.slug)}: ${message}`, {
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
  const app = await resolveApp(flags.app);
  const firebaseFile = Bun.file(join(ROOT_DIR, ROOT_FIREBASE_BINARY));
  const firebasePackage = Bun.file(
    join(ROOT_DIR, 'node_modules/firebase-tools/package.json'),
  );
  const configFile = Bun.file(app.configPath);
  let project: string | null = null;
  let configStatus = 'not configured';
  let firebaseVersion: string | null = null;

  if (await firebasePackage.exists()) {
    const packageData = JSON.parse(await firebasePackage.text()) as {
      version?: string;
    };
    firebaseVersion = packageData.version ?? null;
  }

  if (await configFile.exists()) {
    const config = await readConfig(app);
    project = config.project_id;
    configStatus = 'valid';
  }

  console.log(
    JSON.stringify(
      {
        root: ROOT_DIR,
        app: app.slug,
        config: configStatus,
        project,
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
    '--app',
    '--project-id',
    '--display-name',
    '--environment',
    '--region',
  ]);
  const app = await resolveApp(flags.app);
  const config = makeConfig(flags);
  const plan = configPlan(config, app.slug);
  printPlan(plan);

  if (action === 'plan') return;
  if (action !== 'apply')
    throw new Error('Config action must be "plan" or "apply"');

  const existingFile = Bun.file(app.configPath);
  if (await existingFile.exists()) {
    const existing = await readConfig(app);
    if (JSON.stringify(existing) === JSON.stringify(config)) {
      console.log(
        `${appConfigPath(app.slug)} already matches the requested configuration.`,
      );
      return;
    }
    throw new Error(
      `Refusing to replace existing ${appConfigPath(app.slug)}; review and remove it explicitly first`,
    );
  }

  const temporaryPath = `${app.configPath}.tmp`;
  await Bun.write(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporaryPath, app.configPath);
  console.log(`Wrote ${appConfigPath(app.slug)} for ${config.project_id}.`);
}

async function remoteAction(
  command: string,
  action: string,
  args: string[],
): Promise<void> {
  if (action !== 'plan' && action !== 'apply') {
    throw new Error(`${command} action must be "plan" or "apply"`);
  }

  const flags = parseFlags(args, ['--app', '--confirm']);
  const app = await resolveApp(flags.app);
  const config = await readConfig(app);
  const gcloud = Bun.which('gcloud') ?? 'gcloud';
  const plan =
    command === 'provision'
      ? provisionPlan(config, APP_FIREBASE_BINARY)
      : command === 'deploy'
        ? deployPlan(config, APP_FIREBASE_BINARY, app.slug)
        : destroyPlan(config, gcloud);
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

  await executeCommands(plan.commands, app.directory);
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
  if (['provision', 'deploy', 'destroy'].includes(command)) {
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
