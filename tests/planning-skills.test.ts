import {afterEach, describe, expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  planPlanningSkills,
  runPlanningSkills,
} from '../scripts/planning-skills';

const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'planning-skills-test-'));
  roots.push(root);
  // This deliberately synthetic source is never fetched by these tests.
  const commit = 'a'.repeat(40);
  const source = `fixture/skills#${commit}`;
  const content = '# Fixture skill\n';
  const target = join(root, '.agents', 'skills', 'example');
  mkdirSync(target, {recursive: true});
  writeFileSync(join(target, 'SKILL.md'), content);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      skills: {example: {source, path: 'skills/example'}},
      skillsConfig: {agents: ['universal']},
    }),
  );
  writeFileSync(
    join(root, 'skills-lock.json'),
    JSON.stringify({
      lockfileVersion: 1,
      skills: {
        example: {
          spec: source,
          resolved: 'https://github.com/fixture/skills.git',
          ref: commit,
          commit,
          path: 'skills/example',
          integrity: `sha256-${createHash('sha256')
            .update(`SKILL.md\0${content}\0`)
            .digest('base64')}`,
        },
      },
    }),
  );
  return {root, target};
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {recursive: true, force: true});
  }
});

describe('locked planning skills', () => {
  test('plan and check work offline without creating a cache or editing files', async () => {
    const {root, target} = fixture();
    const before = readFileSync(join(root, 'skills-lock.json'));
    expect((await planPlanningSkills(root))[0]?.status).toBe('verified');
    await runPlanningSkills('plan', root);
    await runPlanningSkills('check', root);
    await runPlanningSkills('apply', root);
    expect(readFileSync(join(root, 'skills-lock.json')).equals(before)).toBe(
      true,
    );
    expect(readFileSync(join(target, 'SKILL.md'), 'utf8')).toBe(
      '# Fixture skill\n',
    );
    expect(existsSync(join(root, '.skills'))).toBe(false);
  });

  test('apply preserves edited skills and refuses before creating a cache', async () => {
    const {root, target} = fixture();
    writeFileSync(join(target, 'SKILL.md'), 'User-owned edits\n');
    expect((await planPlanningSkills(root))[0]?.status).toBe('modified');
    await expect(runPlanningSkills('apply', root)).rejects.toThrow(
      'Preserve or move edited skills',
    );
    expect(readFileSync(join(target, 'SKILL.md'), 'utf8')).toBe(
      'User-owned edits\n',
    );
    expect(existsSync(join(root, '.skills'))).toBe(false);
  });

  test('missing installed files and stale locks cannot pass check', async () => {
    const {root, target} = fixture();
    rmSync(target, {recursive: true});
    expect((await planPlanningSkills(root))[0]?.status).toBe('missing');
    await expect(runPlanningSkills('check', root)).rejects.toThrow(
      'Skills are missing',
    );
    const lock = join(root, 'skills-lock.json');
    writeFileSync(
      lock,
      readFileSync(lock, 'utf8').replace('skills/example', 'skills/different'),
    );
    await expect(planPlanningSkills(root)).rejects.toThrow('inconsistent');
    expect(existsSync(join(root, '.skills'))).toBe(false);
  });

  test.skipIf(process.platform === 'win32')(
    'a symlink cannot hide unverified skill content',
    async () => {
      const {root, target} = fixture();
      symlinkSync(join(root, 'package.json'), join(target, 'extra.md'));
      await expect(runPlanningSkills('apply', root)).rejects.toThrow('symlink');
      expect(existsSync(join(root, 'package.json'))).toBe(true);
      expect(existsSync(join(root, '.skills'))).toBe(false);
    },
  );
});
