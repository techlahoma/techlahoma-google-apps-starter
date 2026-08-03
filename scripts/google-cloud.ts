#!/usr/bin/env bun

import {rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {
  CONFIG_PATH,
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
const PROJECT_CONFIG = join(ROOT_DIR, CONFIG_PATH);
const FIREBASE_BINARY = './node_modules/.bin/firebase';

const HELP = `Google App Starter cloud lifecycle

Usage:
  bun scripts/google-cloud.ts doctor
  bun scripts/google-cloud.ts config plan --project-id ID --display-name NAME
  bun scripts/google-cloud.ts config apply --project-id ID --display-name NAME
  bun scripts/google-cloud.ts provision plan
  bun scripts/google-cloud.ts provision apply --confirm ID
  bun scripts/google-cloud.ts deploy plan
  bun scripts/google-cloud.ts deploy apply --confirm ID
  bun scripts/google-cloud.ts destroy plan
  bun scripts/google-cloud.ts destroy apply --confirm ID

Optional config flags:
  --environment development|preview|production
  --region us-central1

Only "apply" mutates local or remote state. Remote apply commands require the
exact project ID from the ignored ${CONFIG_PATH} file.`;

interface Flags {
  projectId?: string | undefined;
  displayName?: string | undefined;
  environment?: string | undefined;
  region?: string | undefined;
  confirm?: string | undefined;
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
  };
}

async function readConfig() {
  const file = Bun.file(PROJECT_CONFIG);
  if (!(await file.exists())) {
    throw new Error(
      `${CONFIG_PATH} is missing. Run: bun run google:config apply --project-id ID --display-name NAME`,
    );
  }

  try {
    return validateConfig(JSON.parse(await file.text()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${CONFIG_PATH}: ${message}`, {cause: error});
  }
}

function printPlan(plan: CommandPlan): void {
  console.log(JSON.stringify({mode: 'plan', ...plan}, null, 2));
}

async function executeCommands(commands: string[][]): Promise<void> {
  const [command, ...remaining] = commands;
  if (!command) return;

  const process = Bun.spawn(command, {
    cwd: ROOT_DIR,
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

  await executeCommands(remaining);
}

async function doctor(): Promise<void> {
  const firebaseFile = Bun.file(join(ROOT_DIR, FIREBASE_BINARY));
  const firebasePackage = Bun.file(
    join(ROOT_DIR, 'node_modules/firebase-tools/package.json'),
  );
  const configFile = Bun.file(PROJECT_CONFIG);
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
    const config = await readConfig();
    project = config.project_id;
    configStatus = 'valid';
  }

  console.log(
    JSON.stringify(
      {
        root: ROOT_DIR,
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
    '--project-id',
    '--display-name',
    '--environment',
    '--region',
  ]);
  const config = makeConfig(flags);
  const plan = configPlan(config);
  printPlan(plan);

  if (action === 'plan') return;
  if (action !== 'apply')
    throw new Error('Config action must be "plan" or "apply"');

  const existingFile = Bun.file(PROJECT_CONFIG);
  if (await existingFile.exists()) {
    const existing = await readConfig();
    if (JSON.stringify(existing) === JSON.stringify(config)) {
      console.log(
        `${CONFIG_PATH} already matches the requested configuration.`,
      );
      return;
    }
    throw new Error(
      `Refusing to replace existing ${CONFIG_PATH}; review and remove it explicitly first`,
    );
  }

  const temporaryPath = `${PROJECT_CONFIG}.tmp`;
  await Bun.write(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporaryPath, PROJECT_CONFIG);
  console.log(`Wrote ${CONFIG_PATH} for ${config.project_id}.`);
}

async function remoteAction(
  command: string,
  action: string,
  args: string[],
): Promise<void> {
  if (action !== 'plan' && action !== 'apply') {
    throw new Error(`${command} action must be "plan" or "apply"`);
  }

  const flags = parseFlags(args, ['--confirm']);
  const config = await readConfig();
  const gcloud = Bun.which('gcloud') ?? 'gcloud';
  const plan =
    command === 'provision'
      ? provisionPlan(config, FIREBASE_BINARY)
      : command === 'deploy'
        ? deployPlan(config, FIREBASE_BINARY)
        : destroyPlan(config, gcloud);
  printPlan(plan);

  if (action === 'plan') return;
  requireConfirmation(config, flags.confirm);

  if (
    command !== 'destroy' &&
    !(await Bun.file(join(ROOT_DIR, FIREBASE_BINARY)).exists())
  ) {
    throw new Error('Firebase CLI is missing. Run bun install first.');
  }
  if (command === 'destroy' && !Bun.which('gcloud')) {
    throw new Error('gcloud CLI is required for whole-project teardown');
  }

  await executeCommands(plan.commands);
}

async function main(): Promise<void> {
  const [command, action, ...args] = Bun.argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    console.log(HELP);
    return;
  }
  if (command === 'doctor') {
    if (action || args.length > 0)
      throw new Error('doctor does not accept arguments');
    await doctor();
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
