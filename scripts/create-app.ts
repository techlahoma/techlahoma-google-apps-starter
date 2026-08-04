#!/usr/bin/env bun

import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {
  makeAppPlan,
  renderAppTemplate,
  validateAppDefinition,
} from './create-app-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');
const TEMPLATE_DIR = join(ROOT_DIR, 'templates', 'vite-app');
const APPS_DIR = join(ROOT_DIR, 'apps');
const TEMP_DIR = join(ROOT_DIR, '.starter', 'tmp');

const HELP = `Create a Techlahoma Google Apps Starter workspace

Usage:
  bun run app:create plan --name APP-SLUG --title "App Title"
  bun run app:create apply --name APP-SLUG --title "App Title"

The plan is read-only. Apply creates exactly one new apps/APP-SLUG workspace
from templates/vite-app and refuses to replace an existing path.`;

function parseFlags(args: string[]): {
  name?: string | undefined;
  title?: string | undefined;
} {
  const flags: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name || !['--name', '--title'].includes(name)) {
      throw new Error(`Unknown option: ${name ?? '<missing>'}`);
    }
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`);
    }
    if (name in flags) throw new Error(`Duplicate option: ${name}`);
    flags[name] = value;
  }
  return {name: flags['--name'], title: flags['--title']};
}

async function renderDirectory(
  directory: string,
  definition: {slug: string; title: string},
): Promise<void> {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await renderDirectory(path, definition);
      continue;
    }
    if (!entry.isFile()) continue;
    const content = await readFile(path, 'utf8');
    await writeFile(path, renderAppTemplate(content, definition), 'utf8');
  }
}

async function apply(definition: {slug: string; title: string}): Promise<void> {
  await mkdir(APPS_DIR, {recursive: true});
  await mkdir(TEMP_DIR, {recursive: true});
  const target = join(APPS_DIR, definition.slug);
  try {
    await access(target);
    throw new Error(`Refusing to replace existing apps/${definition.slug}`);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const temporary = join(TEMP_DIR, `${definition.slug}-${randomUUID()}`);
  try {
    await cp(TEMPLATE_DIR, temporary, {recursive: true, errorOnExist: true});
    await renderDirectory(temporary, definition);
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, {recursive: true, force: true});
    throw error;
  }
  console.log(`Created apps/${definition.slug}.`);
  console.log(`Run: bun run --cwd apps/${definition.slug} dev`);
}

async function main(): Promise<void> {
  const [action, ...args] = Bun.argv.slice(2);
  if (!action || action === 'help' || action === '--help') {
    console.log(HELP);
    return;
  }
  if (!['plan', 'apply'].includes(action)) {
    throw new Error('Action must be "plan" or "apply"');
  }

  const flags = parseFlags(args);
  const definition = validateAppDefinition({
    slug: flags.name,
    title: flags.title,
  });
  console.log(
    JSON.stringify({mode: action, ...makeAppPlan(definition)}, null, 2),
  );
  if (action === 'apply') await apply(definition);
}

main().catch((error: unknown) => {
  console.error(
    `app:create: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
