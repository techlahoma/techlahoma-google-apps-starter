#!/usr/bin/env bun

import {spawnSync} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

const ROOT_DIR = resolve(import.meta.dir, '..');

function runRequired(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function resolveTool(name: string): string | null {
  const direct = Bun.which(name);
  if (direct) return direct;

  const mise = Bun.which('mise');
  if (!mise) return null;
  const result = spawnSync(mise, ['which', name], {encoding: 'utf8'});
  if (result.status !== 0) return null;
  const path = result.stdout.trim();
  return path || null;
}

function walkShellScripts(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkShellScripts(path));
    else if (entry.isFile() && entry.name.endsWith('.sh')) files.push(path);
  }
  return files;
}

export function verifyRepository(): void {
  runRequired('bun', ['scripts/project-starter.ts', 'verify']);
  runRequired('bun', ['run', 'check']);

  const actionlint = resolveTool('actionlint');
  if (actionlint) runRequired(actionlint, []);
  else
    console.error(
      'verify: actionlint not installed; structural workflow checks passed',
    );

  const shellcheck = resolveTool('shellcheck');
  if (shellcheck) {
    const shellScripts = [
      join(ROOT_DIR, 'scripts', 'verify.sh'),
      join(ROOT_DIR, 'scripts', 'hooks', 'gitleaks-staged'),
      ...walkShellScripts(join(ROOT_DIR, 'profiles')),
    ].filter(existsSync);
    runRequired(shellcheck, shellScripts);
  } else {
    console.error(
      'verify: shellcheck not installed; required shell checks remain enforced in Linux CI',
    );
  }
}

if (import.meta.main) {
  try {
    verifyRepository();
  } catch (error) {
    console.error(
      `verify: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
