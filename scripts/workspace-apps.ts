#!/usr/bin/env bun

import {readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';

const ROOT_DIR = resolve(import.meta.dir, '..');
const APPS_DIR = join(ROOT_DIR, 'apps');
const SUPPORTED_COMMANDS = new Set(['build', 'check', 'test', 'typecheck']);

async function appDirectories(): Promise<string[]> {
  const entries = await readdir(APPS_DIR, {withFileTypes: true});
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .toSorted();
}

async function runInApp(app: string, command: string): Promise<void> {
  if (!(await Bun.file(join(APPS_DIR, app, 'package.json')).exists())) {
    throw new Error(`apps/${app} is missing package.json`);
  }
  console.log(`apps:${command}: ${app}`);
  const child = Bun.spawn(['bun', 'run', '--cwd', `apps/${app}`, command], {
    cwd: ROOT_DIR,
    env: Bun.env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`apps/${app} ${command} failed with exit code ${exitCode}`);
  }
}

async function main(): Promise<void> {
  const command = Bun.argv[2] ?? 'check';
  if (!SUPPORTED_COMMANDS.has(command)) {
    throw new Error(
      `Command must be one of: ${[...SUPPORTED_COMMANDS].toSorted().join(', ')}`,
    );
  }
  const apps = await appDirectories();
  if (apps.length === 0) throw new Error('No app workspaces found under apps/');
  for (const app of apps) await runInApp(app, command);
}

main().catch((error: unknown) => {
  console.error(
    `workspace-apps: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
