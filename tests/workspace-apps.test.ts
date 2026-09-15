import {afterEach, describe, expect, test} from 'bun:test';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {appDirectories} from '../scripts/workspace-apps';

const directories: string[] = [];

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'workspace-apps-test-'));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, {recursive: true, force: true});
  }
});

describe('Bun app workspace discovery', () => {
  test('selects package workspaces and excludes native demos and loose files', async () => {
    const root = fixture();
    for (const name of ['zebra', 'alpha', 'native-swift']) {
      mkdirSync(join(root, name));
    }
    for (const name of ['zebra', 'alpha']) {
      writeFileSync(join(root, name, 'package.json'), '{"private":true}');
    }
    writeFileSync(join(root, 'native-swift', 'main.swift'), 'print("hello")');
    writeFileSync(join(root, 'README.md'), '# Apps');
    expect(await appDirectories(root)).toEqual(['alpha', 'zebra']);
  });

  test('keeps malformed manifests in the work queue so Bun rejects them', async () => {
    const root = fixture();
    const app = join(root, 'broken');
    mkdirSync(app);
    writeFileSync(join(app, 'package.json'), '{"scripts":');
    expect(await appDirectories(root)).toEqual(['broken']);
    const child = Bun.spawn(['bun', 'run', '--cwd', app, 'check'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(await child.exited).not.toBe(0);
  });
});
