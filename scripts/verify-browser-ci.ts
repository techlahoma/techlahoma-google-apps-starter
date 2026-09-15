#!/usr/bin/env bun
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {readAppContract} from './app-contract-lib';

/** CI-only transport bridge. Bun still installs, checks and serves the app.
 * The hosted runner's existing Node drives Playwright's Windows pipe protocol.
 * No Node installation, global configuration, or local developer prerequisite.
 */
export async function runCiBrowserDriver(slug: string): Promise<void> {
  if (process.env.CI !== 'true')
    throw new Error('The preinstalled Node browser driver is restricted to CI');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error('Invalid app slug');
  const rootDir = resolve(import.meta.dir, '..');
  const appDir = join(rootDir, 'apps', slug);
  const contract = readAppContract(appDir)?.contract;
  if (!contract) throw new Error(`Missing app contract for ${slug}`);
  const node = spawnSync('node', ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });
  if (node.error || node.status !== 0)
    throw new Error(
      'CI requires the hosted runner preinstalled Node; no software was installed',
    );
  console.log(
    `CI browser driver: Node ${node.stdout.trim()}, app runtime: Bun ${Bun.version}`,
  );

  const temporaryRoot = join(rootDir, '.starter', 'tmp');
  await mkdir(temporaryRoot, {recursive: true});
  const directory = await mkdtemp(join(temporaryRoot, 'browser-ci-'));
  try {
    for (const [entry, name] of [
      [join(rootDir, 'scripts', 'verify-browser.ts'), 'verifier.mjs'],
      [join(appDir, contract.browserSpec || 'e2e/smoke.spec.ts'), 'smoke.mjs'],
    ]) {
      const result = await Bun.build({
        entrypoints: [entry!],
        outdir: directory,
        naming: name!,
        target: 'node',
        packages: 'external',
      });
      if (!result.success)
        throw new AggregateError(result.logs, 'CI browser bundle failed');
    }
    const runner = join(directory, 'run.mjs');
    await writeFile(
      runner,
      "import {runBrowserVerification} from './verifier.mjs';\n" +
        'await runBrowserVerification(process.argv[2], {rootDir: process.argv[3], specPath: process.argv[4]});\n',
    );
    const child = Bun.spawn(
      ['node', runner, slug, rootDir, join(directory, 'smoke.mjs')],
      {cwd: rootDir, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit'},
    );
    const status = await child.exited;
    if (status !== 0)
      throw new Error(`Node browser verification failed with status ${status}`);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const appIndex = args.indexOf('--app');
  runCiBrowserDriver(appIndex >= 0 ? (args[appIndex + 1] ?? '') : '').catch(
    error => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
