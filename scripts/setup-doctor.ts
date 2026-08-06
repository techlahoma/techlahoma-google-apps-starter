#!/usr/bin/env bun

import {spawnSync} from 'node:child_process';
import {constants, accessSync, existsSync, readFileSync} from 'node:fs';
import {arch, platform, release} from 'node:os';
import {join, resolve} from 'node:path';
import {
  assessPlatform,
  pinnedBunVersion,
  type DoctorStatus,
} from './setup-doctor-lib';

const ROOT_DIR = resolve(import.meta.dir, '..');

interface Finding {
  id: string;
  status: DoctorStatus;
  summary: string;
  next?: string;
}

function executableVersion(executable: string, args: string[]): string | null {
  const result = spawnSync(executable, args, {encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout.trim().split('\n')[0] ?? null;
}

function add(
  findings: Finding[],
  id: string,
  status: DoctorStatus,
  summary: string,
  next?: string,
): void {
  findings.push({id, status, summary, ...(next ? {next} : {})});
}

async function browserFinding(findings: Finding[]): Promise<void> {
  if (!existsSync(join(ROOT_DIR, 'node_modules'))) {
    add(
      findings,
      'browser',
      'warning',
      'dependencies are not installed, so the Playwright browser cannot be inspected',
      'Run bun install --frozen-lockfile, then bun run browser:install.',
    );
    return;
  }

  try {
    const {chromium} = await import('playwright');
    const executable = chromium.executablePath();
    if (existsSync(executable)) {
      add(
        findings,
        'browser',
        'pass',
        'the pinned Playwright Chromium executable is installed',
      );
    } else {
      add(
        findings,
        'browser',
        'warning',
        'the pinned Playwright package is installed but its Chromium executable is missing',
        'Run bun run browser:install before browser verification.',
      );
    }
  } catch {
    add(
      findings,
      'browser',
      'warning',
      'the Playwright package is not currently resolvable',
      'Run bun install --frozen-lockfile, then bun run browser:install.',
    );
  }
}

async function networkFindings(findings: Finding[]): Promise<void> {
  const endpoints = [
    ['GitHub', 'https://github.com/'],
    ['npm registry', 'https://registry.npmjs.org/-/ping'],
  ] as const;

  for (const [name, url] of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      add(
        findings,
        `network-${name.toLowerCase().replaceAll(' ', '-')}`,
        response.ok ? 'pass' : 'warning',
        `${name} returned HTTP ${response.status}`,
        response.ok
          ? undefined
          : 'Check the documented proxy or firewall path without disabling TLS validation.',
      );
    } catch (error) {
      add(
        findings,
        `network-${name.toLowerCase().replaceAll(' ', '-')}`,
        'warning',
        `${name} could not be reached: ${error instanceof Error ? error.message : String(error)}`,
        'Check the documented proxy or firewall path without disabling TLS validation.',
      );
    }
  }
}

export async function inspectSetup(
  options: {
    network?: boolean;
  } = {},
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const packageJson = JSON.parse(
    readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'),
  ) as {packageManager?: string};
  const expectedBun = pinnedBunVersion(packageJson.packageManager ?? '');
  const platformAssessment = assessPlatform(platform(), arch(), release());

  add(
    findings,
    'platform',
    platformAssessment.status,
    platformAssessment.summary,
  );

  if (expectedBun === null) {
    add(
      findings,
      'bun',
      'fail',
      'package.json does not declare a valid bun@VERSION packageManager',
    );
  } else if (Bun.version === expectedBun) {
    add(findings, 'bun', 'pass', `Bun ${Bun.version} matches package.json`);
  } else {
    add(
      findings,
      'bun',
      'fail',
      `Bun ${Bun.version} does not match the required ${expectedBun}`,
      'Install the exact documented Bun version and restart the terminal.',
    );
  }

  const git = Bun.which('git');
  if (git) {
    add(
      findings,
      'git',
      'pass',
      executableVersion(git, ['--version']) ?? 'Git is installed',
    );
  } else {
    add(
      findings,
      'git',
      'fail',
      'Git is not available on PATH',
      'Use the official OS-native Git installation path in the fresh-machine guide.',
    );
  }

  if (existsSync(join(ROOT_DIR, '.git'))) {
    add(findings, 'checkout', 'pass', 'the workspace is a Git checkout');
  } else {
    add(
      findings,
      'checkout',
      'warning',
      'the workspace is not a Git checkout; changed-app discovery is unavailable',
      'Clone the repository with Git for the complete agent workflow.',
    );
  }

  try {
    accessSync(ROOT_DIR, constants.W_OK);
    add(findings, 'write-access', 'pass', 'the repository root is writable');
  } catch {
    add(
      findings,
      'write-access',
      'fail',
      'the repository root is not writable',
      'Move or clone the repository into a user-owned directory.',
    );
  }

  if (existsSync(join(ROOT_DIR, 'node_modules', '.bun'))) {
    add(
      findings,
      'dependencies',
      'pass',
      'the isolated Bun workspace dependencies are installed',
    );
  } else {
    add(
      findings,
      'dependencies',
      'warning',
      'workspace dependencies are not installed',
      'Run bun install --frozen-lockfile.',
    );
  }

  if (existsSync(join(ROOT_DIR, '.gitattributes'))) {
    add(
      findings,
      'line-endings',
      'pass',
      'repository line endings are governed by .gitattributes',
    );
  } else {
    add(
      findings,
      'line-endings',
      'warning',
      '.gitattributes is missing; Windows Git may rewrite shell files',
    );
  }

  if (platform() === 'win32' && ROOT_DIR.length > 80) {
    add(
      findings,
      'path-length',
      'warning',
      `the repository path is ${ROOT_DIR.length} characters long`,
      'Prefer a short user-owned path such as C:\\src\\techlahoma-google-apps-starter.',
    );
  }

  await browserFinding(findings);

  for (const tool of [
    'mise',
    'actionlint',
    'gitleaks',
    'prek',
    'shellcheck',
    'bash',
  ]) {
    add(
      findings,
      `optional-${tool}`,
      Bun.which(tool) ? 'pass' : 'info',
      Bun.which(tool)
        ? `optional contributor tool ${tool} is available`
        : `optional contributor tool ${tool} is not installed`,
    );
  }

  if (options.network) await networkFindings(findings);
  return findings;
}

function printHuman(findings: Finding[]): void {
  const marks: Record<DoctorStatus, string> = {
    pass: 'PASS',
    info: 'INFO',
    warning: 'WARN',
    fail: 'FAIL',
  };
  for (const finding of findings) {
    console.log(`${marks[finding.status]} ${finding.id}: ${finding.summary}`);
    if (finding.next) console.log(`     Next: ${finding.next}`);
  }
  const totals = findings.reduce(
    (counts, finding) => {
      counts[finding.status]++;
      return counts;
    },
    {pass: 0, info: 0, warning: 0, fail: 0} as Record<DoctorStatus, number>,
  );
  console.log(
    `setup:doctor summary: ${totals.fail} failure(s), ${totals.warning} warning(s), ${totals.info} optional note(s), ${totals.pass} pass(es)`,
  );
}

async function main(): Promise<void> {
  const findings = await inspectSetup({
    network: Bun.argv.includes('--network'),
  });
  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify({findings}, null, 2));
  } else {
    printHuman(findings);
  }
  if (findings.some(finding => finding.status === 'fail')) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
