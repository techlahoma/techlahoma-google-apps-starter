#!/usr/bin/env bun

import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {verifyApp} from './verify-app-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');
const APPS_DIR = join(ROOT_DIR, 'apps');

async function getChangedAppSlugs(): Promise<string[]> {
  const proc = Bun.spawn(['git', 'status', '--porcelain'], {
    cwd: ROOT_DIR,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  const appSlugs = new Set<string>();
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    // Format: ' M apps/foo/src/main.ts' or '?? apps/bar/'
    const filePath = line.substring(3).trim();
    if (filePath.startsWith('apps/') && filePath !== 'apps/AGENTS.md') {
      const parts = filePath.split('/');
      if (parts.length >= 2 && parts[1]) {
        const slug = parts[1]!;
        // Verify it is a directory under apps/
        if (existsSync(join(APPS_DIR, slug))) {
          appSlugs.add(slug);
        }
      }
    }
  }

  return [...appSlugs].sort();
}

async function main() {
  const args = Bun.argv.slice(2);
  const isChangedMode = args.includes('--changed');

  let targetApps: string[] = [];

  if (isChangedMode) {
    targetApps = await getChangedAppSlugs();
    if (targetApps.length === 0) {
      console.log(
        'agent:finish: No changed or untracked app workspaces found.',
      );
      return;
    }
    console.log(
      `agent:finish: Discovered ${targetApps.length} changed app workspace(s): ${targetApps.join(', ')}`,
    );
  } else {
    // If no flags, list all apps that have contracts or check changed
    targetApps = await getChangedAppSlugs();
    if (targetApps.length === 0) {
      console.log('agent:finish: No changed app workspaces to verify.');
      return;
    }
  }

  const failedApps: string[] = [];

  for (const slug of targetApps) {
    console.log(`\nVerifying changed app: apps/${slug}`);
    const result = await verifyApp(slug);
    if (!result.success) {
      failedApps.push(slug);
      console.error(`\n✗ Completion verification failed for apps/${slug}:`);
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
    } else {
      console.log(`✓ Verification passed for apps/${slug}`);
    }
  }

  if (failedApps.length > 0) {
    console.error(
      `\nagent:finish FAILED: ${failedApps.length} app(s) failed completion verification: ${failedApps.join(', ')}`,
    );
    process.exit(1);
  }

  console.log(
    '\n✓ agent:finish: All changed app workspaces verified successfully.',
  );
}

main().catch(err => {
  console.error(
    `agent:finish unexpected error: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
