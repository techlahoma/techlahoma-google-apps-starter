import {spawnSync} from 'node:child_process';
import {lstatSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT = resolve(import.meta.dir, '..');
const MANAGER = join(ROOT, 'node_modules', 'skills-lock');

interface SkillState {
  name: string;
  source: string;
  commit: string;
  path: string;
  target: string;
  integrity: string;
  status: 'missing' | 'verified' | 'modified';
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object in the skill manifest or lock.');
  }
  return value as Record<string, unknown>;
}

function json(file: string): Record<string, unknown> {
  return object(JSON.parse(readFileSync(file, 'utf8')) as unknown);
}

function directory(path: string): boolean {
  const stat = lstatSync(path, {throwIfNoEntry: false});
  if (!stat) return false;
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Expected a real directory, refusing ${path}`);
  }
  return true;
}

export async function planPlanningSkills(root = ROOT): Promise<SkillState[]> {
  const pkg = json(join(root, 'package.json'));
  const skills = object(pkg.skills);
  const config = object(pkg.skillsConfig);
  if (
    JSON.stringify(config.agents) !== '["universal"]' ||
    config.agentDirs !== undefined
  ) {
    throw new Error('This recipe installs only into .agents/skills.');
  }
  const lock = json(join(root, 'skills-lock.json'));
  const lockedSkills = object(lock.skills);
  if (
    lock.lockfileVersion !== 1 ||
    JSON.stringify(Object.keys(skills).sort()) !==
      JSON.stringify(Object.keys(lockedSkills).sort())
  ) {
    throw new Error('Skill manifest and lock must name the same skills.');
  }
  const {hashTree} = (await import(
    pathToFileURL(join(MANAGER, 'src', 'integrity.mjs')).href
  )) as {hashTree: (path: string) => string};
  const {assertNoSymlinks} = (await import(
    pathToFileURL(join(MANAGER, 'src', 'validate.mjs')).href
  )) as {assertNoSymlinks: (path: string) => void};

  directory(join(root, '.agents'));
  directory(join(root, '.agents', 'skills'));
  return Object.keys(skills)
    .sort()
    .map(name => {
      const entry = object(skills[name]);
      const locked = object(lockedSkills[name]);
      const source = entry.source;
      const path = entry.path;
      const match =
        typeof source === 'string'
          ? /^([A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+)#([a-f0-9]{40})$/.exec(source)
          : null;
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
        !match ||
        !match[1] ||
        !match[2] ||
        typeof source !== 'string' ||
        typeof path !== 'string' ||
        !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path) ||
        locked.spec !== source ||
        locked.commit !== match[2] ||
        locked.ref !== match[2] ||
        locked.resolved !== `https://github.com/${match[1]}.git` ||
        locked.path !== path ||
        typeof locked.integrity !== 'string' ||
        !/^sha256-[A-Za-z0-9+/]{43}=$/.test(locked.integrity)
      ) {
        throw new Error(
          `Unpinned or inconsistent skill manifest/lock: ${name}`,
        );
      }
      const target = join(root, '.agents', 'skills', name);
      let status: SkillState['status'] = 'missing';
      if (directory(target)) {
        assertNoSymlinks(target);
        status =
          hashTree(target) === locked.integrity ? 'verified' : 'modified';
      }
      return {
        name,
        source,
        commit: match[2],
        path,
        target,
        integrity: locked.integrity,
        status,
      };
    });
}

export async function runPlanningSkills(command: string, root = ROOT) {
  if (!['plan', 'apply', 'check'].includes(command)) {
    throw new Error('Usage: bun scripts/planning-skills.ts plan|apply|check');
  }
  const skills = await planPlanningSkills(root);
  console.log(JSON.stringify({command, root, skills}, null, 2));
  if (command === 'plan') return;
  const modified = skills.filter(skill => skill.status === 'modified');
  if (modified.length) {
    throw new Error(
      `Preserve or move edited skills before restoring: ${modified.map(skill => skill.name).join(', ')}`,
    );
  }
  if (skills.every(skill => skill.status === 'verified')) {
    console.log('All installed skill trees match skills-lock.json.');
    return;
  }
  if (command === 'check') {
    throw new Error('Skills are missing. Run skills:plan, then skills:apply.');
  }

  directory(join(root, '.skills'));
  directory(join(root, '.skills', 'cache'));
  const count = Number(process.env.GIT_CONFIG_COUNT ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Invalid inherited GIT_CONFIG_COUNT.');
  }
  const before = readFileSync(join(root, 'skills-lock.json'));
  const result = spawnSync(
    process.execPath,
    [join(MANAGER, 'bin', 'skills-lock.mjs'), 'install', '--frozen'],
    {
      cwd: root,
      stdio: 'inherit',
      timeout: 120_000,
      env: {
        ...process.env,
        SKILLS_LOCK_CACHE: join(root, '.skills', 'cache'),
        GIT_CONFIG_COUNT: String(count + 1),
        [`GIT_CONFIG_KEY_${count}`]: 'core.autocrlf',
        [`GIT_CONFIG_VALUE_${count}`]: 'false',
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Frozen skill installation failed.');
  if (!before.equals(readFileSync(join(root, 'skills-lock.json')))) {
    throw new Error(
      'Frozen installation unexpectedly changed skills-lock.json.',
    );
  }
  await runPlanningSkills('check', root);
}

if (import.meta.main) {
  try {
    const command = process.argv[2];
    if (process.argv.length !== 3 || !command) {
      throw new Error('Expected one command.');
    }
    await runPlanningSkills(command);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
