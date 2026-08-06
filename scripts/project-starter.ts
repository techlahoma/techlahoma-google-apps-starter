#!/usr/bin/env bun

// @env bun

import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative as pathRelative,
  resolve,
  sep,
} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAppContract} from './app-contract-lib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Manifests are validated at their use sites.
type JsonObject = Record<string, any>;
type ProfileManifest = {
  schema_version: number;
  id: string;
  description: string;
  files: ProfileFile[];
  verification?: string[];
};
type ProfileFile = {
  source: string;
  target: string;
  render?: boolean;
};
type ProfileChange = {
  target: string;
  content: string;
  state: 'create' | 'same' | 'conflict';
};
type BaselineEntry = {
  path: string;
  policy: 'managed' | 'merge';
  base_sha256: string;
};
type BaselineState = {
  path: string;
  policy: 'managed' | 'merge';
  state:
    | 'source-missing'
    | 'source-dirty'
    | 'new'
    | 'current'
    | 'local-only'
    | 'safe-update'
    | 'manual-reconcile'
    | 'conflict'
    | 'source-removed';
};
type RunResult = {
  returncode: number;
  stdout: string;
  stderr: string;
};
type ParsedArguments = {
  positionals: string[];
  options: Map<string, string | boolean>;
};

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_CONFIG = join(ROOT, '.starter', 'project.json');
const RULESET_RECIPE = join(ROOT, '.github', 'rulesets', 'main.json');
const STARTER_ONLY_PATTERN =
  /\n?<!-- STARTER_ONLY_START -->.*?<!-- STARTER_ONLY_END -->\n?/gs;
const ACTION_SHA_PATTERN = /@[0-9a-f]{40}(?:\s|$)/;
const PROJECT_TOKEN_PATTERN = /__PROJECT_(?:NAME|SLUG|DESCRIPTION)__/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const REQUIRED_CORE_PATHS = [
  '.agents/rules/environment-bootstrap.md',
  '.agents/skills/bootstrap-workspace/SKILL.md',
  '.agents/skills/build-and-launch-demo/SKILL.md',
  '.editorconfig',
  '.gitattributes',
  '.github/CODEOWNERS',
  '.github/ISSUE_TEMPLATE/bug-report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/feature-request.yml',
  '.github/pull_request_template.md',
  '.github/rulesets/main.json',
  '.github/workflows/guardrails.yml',
  '.gitignore',
  '.starter/project.json',
  '.starter/baseline.json',
  'AGENTS.md',
  'apps/AGENTS.md',
  'apps/welcome/package.json',
  'CHATGPT-PROJECT-INSTRUCTIONS.md',
  'PROJECT.md',
  'README.md',
  'SECURITY.md',
  'bunfig.toml',
  'docs/README.md',
  'docs/operations/fresh-machine-setup.md',
  'mise.toml',
  'prek.toml',
  'profiles/README.md',
  'scripts/create-app.ts',
  'scripts/hooks/gitleaks-staged',
  'scripts/project-starter.ts',
  'scripts/setup-doctor-lib.ts',
  'scripts/setup-doctor.ts',
  'scripts/verify.sh',
  'scripts/verify-repository.ts',
  'scripts/workspace-apps.ts',
  'templates/vite-app/package.json',
  'tsconfig.base.json',
] as const;

export class Report {
  errors: string[] = [];
  warnings: string[] = [];
  notes: string[] = [];

  error(message: string): void {
    this.errors.push(message);
  }

  warning(message: string): void {
    this.warnings.push(message);
  }

  note(message: string): void {
    this.notes.push(message);
  }

  print(): void {
    for (const message of this.notes) console.log(`NOTE: ${message}`);
    for (const message of this.warnings) console.error(`WARNING: ${message}`);
    for (const message of this.errors) console.error(`ERROR: ${message}`);
    console.log(
      `summary: ${this.errors.length} error(s), ${this.warnings.length} warning(s), ${this.notes.length} note(s)`,
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function relative(path: string): string {
  return pathRelative(ROOT, path).split(sep).join('/');
}

export function loadJson<T = JsonObject>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(path: string): string | null {
  if (!existsSync(path) || !lstatSync(path).isFile()) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, path);
}

function run(command: string[], cwd = ROOT, check = false): RunResult {
  const [executable, ...arguments_] = command;
  if (!executable) throw new Error('cannot run an empty command');
  const result = spawnSync(executable, arguments_, {
    cwd,
    encoding: 'utf8',
  });
  const returncode = result.status ?? 1;
  const output = {
    returncode,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? errorMessage(result.error ?? ''),
  };
  if (check && returncode !== 0) {
    throw new Error(
      output.stderr.trim() || output.stdout.trim() || `${command[0]} failed`,
    );
  }
  return output;
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  if (lstatSync(root).isFile()) return [root];
  const files: string[] = [];
  for (const entry of readdirSync(root, {withFileTypes: true})) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files.toSorted();
}

function filesMatching(
  root: string,
  predicate: (path: string) => boolean,
): string[] {
  return walkFiles(root).filter(predicate);
}

function isInsideRoot(path: string): boolean {
  const candidate = pathRelative(ROOT, path);
  return (
    candidate === '' ||
    (!candidate.startsWith(`..${sep}`) && candidate !== '..')
  );
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug)
    throw new Error('project name must contain at least one letter or digit');
  return slug;
}

function verifyRequiredPaths(report: Report): void {
  for (const pathText of REQUIRED_CORE_PATHS) {
    if (!existsSync(join(ROOT, pathText)))
      report.error(`required path is missing: ${pathText}`);
  }
}

function verifyJsonFiles(report: Report): void {
  const candidates = [
    PROJECT_CONFIG,
    join(ROOT, '.starter', 'baseline.json'),
    RULESET_RECIPE,
    ...filesMatching(
      join(ROOT, 'profiles'),
      path => basename(path) === 'profile.json',
    ),
    ...filesMatching(join(ROOT, 'profiles'), path =>
      ['.json', '.jsonc'].includes(extname(path)),
    ),
    ...filesMatching(join(ROOT, 'apps'), path =>
      ['.json', '.jsonc'].includes(extname(path)),
    ),
    ...filesMatching(join(ROOT, 'templates'), path =>
      ['.json', '.jsonc'].includes(extname(path)),
    ),
  ];
  for (const path of [...new Set(candidates)].toSorted()) {
    if (!existsSync(path)) continue;
    try {
      loadJson(path);
    } catch (error) {
      report.error(
        `${relative(path)} is not valid JSON: ${errorMessage(error)}`,
      );
    }
  }
}

function verifySbc4(report: Report): void {
  const candidates = [
    join(ROOT, 'README.md'),
    join(ROOT, 'PROJECT.md'),
    join(ROOT, 'SECURITY.md'),
    ...filesMatching(join(ROOT, 'docs'), path => extname(path) === '.md'),
    ...filesMatching(
      join(ROOT, 'apps'),
      path => basename(path) === 'README.md',
    ),
    ...filesMatching(
      join(ROOT, 'templates'),
      path => basename(path) === 'README.md',
    ),
    ...filesMatching(join(ROOT, 'profiles'), path => {
      const pathText = relative(path);
      return (
        extname(path) === '.md' &&
        (/^profiles\/[^/]+\/README\.md$/.test(pathText) ||
          /^profiles\/[^/]+\/files\/docs\/.+\.md$/.test(pathText))
      );
    }),
  ];
  const required = ['`Tease:`', '`Lede:`', '`Why it matters:`', '`Go deeper:`'];
  for (const path of candidates.toSorted()) {
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    const firstLine = lines.find(line => line.trim()) ?? '';
    if (!firstLine.startsWith('# ')) {
      report.error(`${relative(path)} must start with one level-one title`);
    }
    const head = lines.slice(0, 30).join('\n');
    for (const marker of required) {
      if (!head.includes(marker))
        report.error(`${relative(path)} is missing SBC4 marker ${marker}`);
    }
  }
}

function verifyMarkdownTables(report: Report): void {
  const candidates = [
    join(ROOT, 'README.md'),
    join(ROOT, 'PROJECT.md'),
    join(ROOT, 'SECURITY.md'),
    join(ROOT, '.github', 'pull_request_template.md'),
    ...filesMatching(join(ROOT, 'docs'), path => extname(path) === '.md'),
    ...filesMatching(join(ROOT, 'profiles'), path => extname(path) === '.md'),
  ];
  for (const path of candidates.toSorted()) {
    if (!existsSync(path)) continue;
    let expectedPipes: number | null = null;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.startsWith('|') && line.endsWith('|')) {
        const pipeCount = [...line].filter(
          character => character === '|',
        ).length;
        if (expectedPipes === null) expectedPipes = pipeCount;
        else if (pipeCount !== expectedPipes) {
          report.error(
            `${relative(path)}:${index + 1} table row has ${pipeCount - 1} cells; expected ${expectedPipes - 1}`,
          );
        }
      } else {
        expectedPipes = null;
      }
    });
  }
}

function verifyLocalMarkdownLinks(report: Report): void {
  const candidates = [
    join(ROOT, 'README.md'),
    join(ROOT, 'PROJECT.md'),
    join(ROOT, 'SECURITY.md'),
    ...filesMatching(join(ROOT, 'docs'), path => extname(path) === '.md'),
    ...filesMatching(join(ROOT, 'profiles'), path => extname(path) === '.md'),
  ];
  for (const path of candidates.toSorted()) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
      const target = (match[1] ?? '').trim().replace(/^<|>$/g, '');
      if (
        !target ||
        target.startsWith('#') ||
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.includes('PLACEHOLDER') ||
        target.startsWith('__')
      ) {
        continue;
      }
      const pathText = target.split('#', 1)[0] ?? '';
      const resolved = resolve(dirname(path), pathText);
      if (!isInsideRoot(resolved)) {
        report.error(
          `${relative(path)} link escapes repository root: ${target}`,
        );
      } else if (!existsSync(resolved)) {
        report.error(`${relative(path)} has broken local link: ${target}`);
      }
    }
  }
}

function verifyWorkflowPins(report: Report): void {
  const workflows = filesMatching(join(ROOT, '.github', 'workflows'), path =>
    ['.yml', '.yaml'].includes(extname(path)),
  );
  for (const path of workflows) {
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        const stripped = line.trim();
        if (!stripped.startsWith('uses:')) return;
        const reference =
          stripped
            .replace(/^uses:/, '')
            .split('#', 1)[0]
            ?.trim() ?? '';
        if (
          !reference.startsWith('./') &&
          !ACTION_SHA_PATTERN.test(reference)
        ) {
          report.error(
            `${relative(path)}:${index + 1} action is not pinned to a full commit SHA`,
          );
        }
      });
  }
}

function verifyShellSyntax(report: Report): void {
  const candidates = new Set(
    filesMatching(join(ROOT, 'scripts'), path => extname(path) === '.sh'),
  );
  for (const path of filesMatching(
    join(ROOT, 'profiles'),
    candidate =>
      extname(candidate) === '.sh' &&
      candidate.includes(`${sep}files${sep}scripts${sep}`),
  )) {
    candidates.add(path);
  }
  const hook = join(ROOT, 'scripts', 'hooks', 'gitleaks-staged');
  if (existsSync(hook)) candidates.add(hook);
  if (process.platform === 'win32' || !Bun.which('bash')) {
    if (candidates.size > 0) {
      report.warning(
        'bash is unavailable; Unix shell syntax remains enforced in Linux CI',
      );
    }
    return;
  }
  for (const path of [...candidates].toSorted()) {
    const result = run(['bash', '-n', path]);
    if (result.returncode !== 0) {
      report.error(
        `${relative(path)} failed bash syntax validation: ${result.stderr.trim()}`,
      );
    }
  }
}

function verifyPythonSyntax(report: Report): void {
  const candidates = filesMatching(ROOT, path => {
    const pathText = relative(path);
    return (
      extname(path) === '.py' &&
      (pathText.startsWith('scripts/') ||
        pathText.startsWith('tests/') ||
        /^profiles\/[^/]+\/files\/scripts\//.test(pathText))
    );
  });
  if (!Bun.which('python3')) {
    if (candidates.length)
      report.warning(
        'python3 is unavailable; optional Python profile syntax was not checked',
      );
    return;
  }
  const compileScript =
    "import pathlib,sys; p=pathlib.Path(sys.argv[1]); compile(p.read_text(encoding='utf-8'), str(p), 'exec')";
  for (const path of candidates) {
    const result = run(['python3', '-c', compileScript, path]);
    if (result.returncode !== 0) {
      report.error(
        `${relative(path)} failed Python syntax validation: ${result.stderr.trim()}`,
      );
    }
  }
}

function verifyXmlText(content: string): string | null {
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const stack: string[] = [];
  for (const match of stripped.matchAll(/<[^>]+>/g)) {
    const tag = match[0];
    if (tag.startsWith('<!') || tag.endsWith('/>')) continue;
    const name = tag.match(/^<\/?\s*([A-Za-z_][\w:.-]*)/)?.[1];
    if (!name) return `could not parse tag ${tag}`;
    if (tag.startsWith('</')) {
      const opened = stack.pop();
      if (opened !== name)
        return `closing tag ${name} does not match ${opened ?? 'nothing'}`;
    } else {
      stack.push(name);
    }
  }
  return stack.length ? `unclosed tag ${stack.at(-1)}` : null;
}

function verifyXmlFiles(report: Report): void {
  const candidates = filesMatching(
    join(ROOT, 'profiles'),
    path =>
      path.includes(`${sep}files${sep}`) &&
      ['.xml', '.dist'].includes(extname(path)),
  ).filter(path => path.endsWith('.xml') || path.includes('.xml.'));
  for (const path of candidates) {
    const error = verifyXmlText(readFileSync(path, 'utf8'));
    if (error) report.error(`${relative(path)} is not valid XML: ${error}`);
  }
}

function verifyIssueForms(report: Report): void {
  const issueRoot = join(ROOT, '.github', 'ISSUE_TEMPLATE');
  const config = join(issueRoot, 'config.yml');
  if (
    existsSync(config) &&
    !readFileSync(config, 'utf8').includes('blank_issues_enabled: false')
  ) {
    report.error('.github/ISSUE_TEMPLATE/config.yml must disable blank issues');
  }
  for (const name of ['bug-report.yml', 'feature-request.yml']) {
    const path = join(issueRoot, name);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const marker of ['name:', 'description:', 'body:']) {
      if (!content.includes(marker))
        report.error(`${relative(path)} is missing ${marker}`);
    }
    if (
      !content.includes('validations:') ||
      !content.includes('required: true')
    ) {
      report.error(`${relative(path)} must require actionable intake fields`);
    }
  }
}

function verifyProjectConfig(report: Report): JsonObject | null {
  if (!existsSync(PROJECT_CONFIG)) return null;
  let config: JsonObject;
  try {
    config = loadJson(PROJECT_CONFIG);
  } catch {
    return null;
  }
  if (config.schema_version !== 1)
    report.error('.starter/project.json schema_version must be 1');
  if (!Array.isArray(config.profiles))
    report.error('.starter/project.json profiles must be an array');
  if (
    !config.repository ||
    typeof config.repository !== 'object' ||
    Array.isArray(config.repository)
  ) {
    report.error('.starter/project.json repository must be an object');
  }
  return config;
}

function verifyActiveProfiles(report: Report, config: JsonObject | null): void {
  if (!config) return;
  for (const profileName of config.profiles ?? []) {
    if (typeof profileName !== 'string') {
      report.error('active profile names must be strings');
      continue;
    }
    const manifest = join(ROOT, 'profiles', profileName, 'profile.json');
    const addendum = join(ROOT, '.starter', 'addenda', `${profileName}.md`);
    if (!existsSync(manifest))
      report.error(`active profile manifest is missing: ${relative(manifest)}`);
    if (!existsSync(addendum))
      report.error(`active profile addendum is missing: ${relative(addendum)}`);
  }
}

function verifyBaselineManifest(report: Report): void {
  const path = join(ROOT, '.starter', 'baseline.json');
  if (!existsSync(path)) return;
  let manifest: JsonObject;
  try {
    manifest = loadJson(path);
  } catch {
    return;
  }
  if (manifest.schema_version !== 1)
    report.error('.starter/baseline.json schema_version must be 1');
  if (
    !manifest.starter ||
    typeof manifest.starter !== 'object' ||
    Array.isArray(manifest.starter)
  ) {
    report.error('.starter/baseline.json starter must be an object');
  }
  if (
    !Array.isArray(manifest.tracked_roots) ||
    !manifest.tracked_roots.length
  ) {
    report.error(
      '.starter/baseline.json tracked_roots must be a non-empty array',
    );
  }
  if (!Array.isArray(manifest.owned_paths)) {
    report.error('.starter/baseline.json owned_paths must be an array');
    return;
  }
  const seen = new Set<string>();
  for (const entry of manifest.owned_paths) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      report.error('baseline owned path entries must be objects');
      continue;
    }
    const pathText = entry.path;
    if (typeof pathText !== 'string' || !pathText) {
      report.error('baseline owned path needs a non-empty path');
      continue;
    }
    if (isAbsolute(pathText) || pathText.split('/').includes('..')) {
      report.error(`unsafe baseline path: ${pathText}`);
    }
    if (seen.has(pathText))
      report.error(`duplicate baseline path: ${pathText}`);
    seen.add(pathText);
    if (!['managed', 'merge'].includes(entry.policy)) {
      report.error(
        `invalid baseline policy for ${pathText}: ${JSON.stringify(entry.policy)}`,
      );
    }
    if (
      typeof entry.base_sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(entry.base_sha256)
    ) {
      report.error(`invalid baseline SHA-256 for ${pathText}`);
    }
  }
}

function manifestPaths(): string[] {
  return filesMatching(
    join(ROOT, 'profiles'),
    path => basename(path) === 'profile.json',
  );
}

function verifyProfileManifests(report: Report): void {
  const seenIds = new Set<string>();
  for (const manifestPath of manifestPaths()) {
    let manifest: ProfileManifest;
    try {
      manifest = loadJson(manifestPath);
    } catch {
      continue;
    }
    const profileDirectory = dirname(manifestPath);
    if (manifest.id !== basename(profileDirectory)) {
      report.error(
        `${relative(manifestPath)} id must match directory ${JSON.stringify(basename(profileDirectory))}`,
      );
    }
    if (seenIds.has(manifest.id))
      report.error(`duplicate profile id: ${manifest.id}`);
    if (typeof manifest.id === 'string') seenIds.add(manifest.id);
    if (manifest.schema_version !== 1) {
      report.error(`${relative(manifestPath)} schema_version must be 1`);
    }
    const addendum = join(profileDirectory, 'AGENTS.md');
    if (!existsSync(addendum))
      report.error(`profile addendum is missing: ${relative(addendum)}`);
    if (!Array.isArray(manifest.files)) {
      report.error(`${relative(manifestPath)} files must be an array`);
      continue;
    }
    const seenTargets = new Set<string>();
    for (const entry of manifest.files) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        report.error(`${relative(manifestPath)} file entries must be objects`);
        continue;
      }
      if (
        typeof entry.source !== 'string' ||
        typeof entry.target !== 'string'
      ) {
        report.error(
          `${relative(manifestPath)} file entries need source and target`,
        );
        continue;
      }
      const source = join(profileDirectory, entry.source);
      if (!existsSync(source) || !lstatSync(source).isFile()) {
        report.error(`profile source is missing: ${relative(source)}`);
      }
      if (isAbsolute(entry.target) || entry.target.split('/').includes('..')) {
        report.error(
          `unsafe profile target in ${relative(manifestPath)}: ${entry.target}`,
        );
      }
      if (entry.target === '.git' || entry.target.startsWith('.git/')) {
        report.error(`profile cannot target Git internals: ${entry.target}`);
      }
      if (seenTargets.has(entry.target)) {
        report.error(
          `duplicate target ${JSON.stringify(entry.target)} in ${relative(manifestPath)}`,
        );
      }
      seenTargets.add(entry.target);
    }
  }
}

function verifyAppContracts(report: Report): void {
  const contractPaths = [
    join(ROOT, 'templates', 'vite-app', 'app.contract.json'),
    ...filesMatching(
      join(ROOT, 'apps'),
      path => basename(path) === 'app.contract.json',
    ),
  ];
  for (const path of contractPaths) {
    if (!existsSync(path)) continue;
    try {
      const data = loadJson(path);
      const contract = validateAppContract(data);
      const appDir = dirname(path);
      const specPath = join(appDir, contract.browserSpec);
      if (!existsSync(specPath)) {
        report.error(
          `${relative(path)} declares browserSpec "${contract.browserSpec}" which does not exist`,
        );
      }
    } catch (error) {
      report.error(
        `${relative(path)} is invalid app contract: ${errorMessage(error)}`,
      );
    }
  }
}

function verifyAntigravityConfig(report: Report): void {
  const hooksPath = join(ROOT, '.agents', 'hooks.json');
  if (existsSync(hooksPath)) {
    try {
      const data = loadJson(hooksPath);
      if (
        !data ||
        typeof data !== 'object' ||
        !data.hooks ||
        typeof data.hooks !== 'object'
      ) {
        report.error('.agents/hooks.json must contain a "hooks" object');
      }
    } catch (error) {
      report.error(
        `.agents/hooks.json is invalid JSON: ${errorMessage(error)}`,
      );
    }
  }

  const skills = filesMatching(
    join(ROOT, '.agents', 'skills'),
    path => basename(path) === 'SKILL.md',
  );
  for (const path of skills) {
    const content = readFileSync(path, 'utf8');
    if (
      !content.startsWith('---') ||
      !content.includes('name:') ||
      !content.includes('description:')
    ) {
      report.error(
        `${relative(path)} is missing YAML frontmatter with name and description`,
      );
    }
  }
}

function verifyMachineLocalPaths(report: Report): void {
  const markdownFiles = [
    join(ROOT, 'README.md'),
    join(ROOT, 'PROJECT.md'),
    join(ROOT, 'AGENTS.md'),
    ...filesMatching(join(ROOT, 'docs'), path => extname(path) === '.md'),
    ...filesMatching(join(ROOT, 'apps'), path => extname(path) === '.md'),
    ...filesMatching(join(ROOT, '.agents'), path => extname(path) === '.md'),
  ];

  for (const path of markdownFiles) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    if (
      content.includes('file:///Users/') ||
      content.includes('file:///home/')
    ) {
      report.error(`${relative(path)} contains machine-local file:/// URL`);
    }
    if (/\/(?:Users|home)\/[a-zA-Z0-9_-]+\//.test(content)) {
      report.error(
        `${relative(path)} contains absolute user home directory path`,
      );
    }
  }
}

export function verifyRepository(): Report {
  const report = new Report();
  verifyRequiredPaths(report);
  verifyJsonFiles(report);
  verifySbc4(report);
  verifyMarkdownTables(report);
  verifyLocalMarkdownLinks(report);
  verifyWorkflowPins(report);
  verifyShellSyntax(report);
  verifyPythonSyntax(report);
  verifyXmlFiles(report);
  verifyIssueForms(report);
  const config = verifyProjectConfig(report);
  verifyBaselineManifest(report);
  verifyActiveProfiles(report, config);
  verifyProfileManifests(report);
  verifyAppContracts(report);
  verifyAntigravityConfig(report);
  verifyMachineLocalPaths(report);
  if (config?.initialized) {
    for (const path of [join(ROOT, 'README.md'), join(ROOT, 'PROJECT.md')]) {
      const content = readFileSync(path, 'utf8');
      if (PROJECT_TOKEN_PATTERN.test(content)) {
        report.error(`${relative(path)} still contains project tokens`);
      }
      PROJECT_TOKEN_PATTERN.lastIndex = 0;
      if (content.includes('STARTER_ONLY_')) {
        report.error(`${relative(path)} still contains starter-only markers`);
      }
    }
  } else if (config) {
    report.note('template is intentionally uninitialized');
  }
  return report;
}

function projectConfig(): JsonObject {
  return loadJson(PROJECT_CONFIG);
}

function renderTokens(content: string, config: JsonObject): string {
  const replacements: Record<string, string> = {
    __PROJECT_NAME__: String(config.name),
    __PROJECT_SLUG__: String(config.slug),
    __PROJECT_DESCRIPTION__: String(config.description),
    __TODAY__: localToday(),
  };
  for (const [token, value] of Object.entries(replacements)) {
    content = content.replaceAll(token, value);
  }
  return content;
}

function profileManifests(): Map<
  string,
  {directory: string; manifest: ProfileManifest}
> {
  const manifests = new Map<
    string,
    {directory: string; manifest: ProfileManifest}
  >();
  for (const path of manifestPaths()) {
    const manifest = loadJson<ProfileManifest>(path);
    if (typeof manifest.id === 'string') {
      manifests.set(manifest.id, {directory: dirname(path), manifest});
    }
  }
  return manifests;
}

function profileChanges(profileName: string): ProfileChange[] {
  const manifests = profileManifests();
  const selected = manifests.get(profileName);
  if (!selected) throw new Error(`unknown profile: ${profileName}`);
  const config = projectConfig();
  if (!config.initialized)
    throw new Error('initialize the project before applying profiles');
  const entries: ProfileFile[] = [
    {
      source: 'AGENTS.md',
      target: `.starter/addenda/${profileName}.md`,
      render: true,
    },
    ...selected.manifest.files,
  ];
  return entries.map(entry => {
    const source = join(selected.directory, entry.source);
    const target = join(ROOT, entry.target);
    let content = readFileSync(source, 'utf8');
    if (entry.render ?? true) content = renderTokens(content, config);
    const current =
      existsSync(target) && lstatSync(target).isFile()
        ? readFileSync(target, 'utf8')
        : null;
    const state =
      current === null ? 'create' : current === content ? 'same' : 'conflict';
    return {target, content, state};
  });
}

function commandProfile(
  action: string | undefined,
  profiles: string[],
): number {
  try {
    const manifests = profileManifests();
    if (action === 'list') {
      const active = new Set<string>(projectConfig().profiles ?? []);
      for (const [profileName, selected] of manifests) {
        const marker = active.has(profileName) ? 'active' : 'available';
        console.log(
          `${profileName}\t${marker}\t${selected.manifest.description}`,
        );
      }
      return 0;
    }
    if (!['plan', 'apply'].includes(action ?? ''))
      throw new Error('profile action must be list, plan, or apply');
    if (!profiles.length)
      throw new Error('profile plan/apply requires at least one profile');
    const allChanges = new Map<string, ProfileChange[]>();
    for (const profileName of profiles)
      allChanges.set(profileName, profileChanges(profileName));
    let conflicts = 0;
    for (const [profileName, changes] of allChanges) {
      console.log(`profile: ${profileName}`);
      for (const change of changes) {
        console.log(`- ${change.state}: ${relative(change.target)}`);
        if (change.state === 'conflict') conflicts += 1;
      }
    }
    if (action === 'plan') {
      console.log('plan only: no files changed');
      return conflicts ? 1 : 0;
    }
    if (conflicts)
      throw new Error(
        'profile application refused because existing files conflict',
      );
    for (const changes of allChanges.values()) {
      for (const change of changes) {
        if (change.state === 'create')
          atomicWrite(change.target, change.content);
        if (
          ['create', 'same'].includes(change.state) &&
          change.content.startsWith('#!')
        ) {
          chmodSync(change.target, statSync(change.target).mode | 0o111);
        }
      }
    }
    const config = projectConfig();
    const active = new Set<string>(config.profiles ?? []);
    for (const profile of profiles) active.add(profile);
    config.profiles = [...active].toSorted();
    atomicWrite(PROJECT_CONFIG, jsonText(config));
    console.log('applied: local profile files and addenda');
    return 0;
  } catch (error) {
    console.error(`ERROR: ${errorMessage(error)}`);
    return 1;
  }
}

function isOwnedCandidate(path: string, root: string): boolean {
  const pathText = pathRelative(root, path).split(sep).join('/');
  const excluded = new Set(['.starter/baseline.json', '.starter/project.json']);
  const generatedParts = new Set([
    '__pycache__',
    '.DS_Store',
    '.pytest_cache',
    '.starter',
    'coverage',
    'dist',
    'node_modules',
    'vendor',
  ]);
  const generatedSuffixes = new Set(['.pyc', '.pyo']);
  const parts = pathText.split('/');
  return (
    !excluded.has(pathText) &&
    !pathText.includes('.starter/addenda') &&
    !parts.some(part => generatedParts.has(part)) &&
    !generatedSuffixes.has(extname(path))
  );
}

function trackedFiles(manifest: JsonObject, root = ROOT): string[] {
  const results = new Set<string>();
  for (const rootText of manifest.tracked_roots as string[]) {
    const candidate = join(root, rootText);
    if (!existsSync(candidate)) continue;
    if (lstatSync(candidate).isFile()) results.add(candidate);
    else if (lstatSync(candidate).isDirectory()) {
      for (const path of walkFiles(candidate)) results.add(path);
    }
  }
  return [...results].filter(path => isOwnedCandidate(path, root)).toSorted();
}

function baselinePolicy(pathText: string): 'managed' | 'merge' {
  const mergePaths = new Set([
    '.editorconfig',
    '.github/CODEOWNERS',
    '.github/pull_request_template.md',
    '.gitignore',
    'AGENTS.md',
    'CHATGPT-PROJECT-INSTRUCTIONS.md',
    'PROJECT.md',
    'README.md',
    'SECURITY.md',
    'bunfig.toml',
    'mise.toml',
    'prek.toml',
  ]);
  return mergePaths.has(pathText) ? 'merge' : 'managed';
}

export function refreshBaselineManifest(sourceRevision?: string): JsonObject {
  const manifest = loadJson<JsonObject>(
    join(ROOT, '.starter', 'baseline.json'),
  );
  if (sourceRevision !== undefined)
    manifest.starter.source_revision = sourceRevision;
  manifest.owned_paths = trackedFiles(manifest).map(path => {
    const pathText = relative(path);
    return {
      path: pathText,
      policy: baselinePolicy(pathText),
      base_sha256: sha256(path),
    };
  });
  return manifest;
}

function commandBaselineRefresh(
  action: string | undefined,
  sourceRevision?: string,
): number {
  try {
    if (!['plan', 'apply'].includes(action ?? ''))
      throw new Error('baseline-refresh action must be plan or apply');
    const manifest = refreshBaselineManifest(sourceRevision);
    console.log(`owned paths: ${manifest.owned_paths.length}`);
    if (action === 'plan') {
      console.log('plan only: baseline manifest not changed');
      return 0;
    }
    atomicWrite(join(ROOT, '.starter', 'baseline.json'), jsonText(manifest));
    console.log('applied: baseline hashes refreshed locally');
    return 0;
  } catch (error) {
    console.error(`ERROR: ${errorMessage(error)}`);
    return 1;
  }
}

function baselineStates(sourceRoot: string): BaselineState[] {
  const localManifest = loadJson<JsonObject>(
    join(ROOT, '.starter', 'baseline.json'),
  );
  const sourceManifest = loadJson<JsonObject>(
    join(sourceRoot, '.starter', 'baseline.json'),
  );
  const localEntries = new Map<string, BaselineEntry>(
    (localManifest.owned_paths ?? []).map((entry: BaselineEntry) => [
      entry.path,
      entry,
    ]),
  );
  const sourceEntries = new Map<string, BaselineEntry>(
    (sourceManifest.owned_paths ?? []).map((entry: BaselineEntry) => [
      entry.path,
      entry,
    ]),
  );
  const states: BaselineState[] = [];
  for (const pathText of [...sourceEntries.keys()].toSorted()) {
    const incomingEntry = sourceEntries.get(pathText);
    if (!incomingEntry)
      throw new Error(`incoming baseline entry disappeared: ${pathText}`);
    const localEntry = localEntries.get(pathText);
    const localHash = sha256(join(ROOT, pathText));
    const incomingHash = sha256(join(sourceRoot, pathText));
    const baseHash = localEntry?.base_sha256 ?? null;
    const policy = localEntry?.policy ?? incomingEntry.policy ?? 'managed';
    const incomingBase = incomingEntry.base_sha256;
    let state: BaselineState['state'];
    if (incomingHash === null) state = 'source-missing';
    else if (incomingHash !== incomingBase) state = 'source-dirty';
    else if (!localEntry) state = 'new';
    else if (localHash === incomingHash) state = 'current';
    else if (incomingHash === baseHash) state = 'local-only';
    else if (localHash === baseHash) state = 'safe-update';
    else if (policy === 'merge') state = 'manual-reconcile';
    else state = 'conflict';
    states.push({path: pathText, policy, state});
  }
  for (const pathText of [...localEntries.keys()]
    .filter(path => !sourceEntries.has(path))
    .toSorted()) {
    states.push({
      path: pathText,
      policy: localEntries.get(pathText)?.policy ?? 'managed',
      state: 'source-removed',
    });
  }
  return states;
}

function copyFilePreservingMode(source: string, target: string): void {
  mkdirSync(dirname(target), {recursive: true});
  copyFileSync(source, target);
  chmodSync(target, statSync(source).mode);
}

function commandBaseline(action: string | undefined, source?: string): number {
  if (!['audit', 'apply'].includes(action ?? '')) {
    console.error('ERROR: baseline action must be audit or apply');
    return 1;
  }
  if (!source) {
    console.error('ERROR: baseline requires --source');
    return 1;
  }
  const sourceRoot = resolve(source);
  const sourceManifestPath = join(sourceRoot, '.starter', 'baseline.json');
  if (
    !existsSync(sourceManifestPath) ||
    !lstatSync(sourceManifestPath).isFile()
  ) {
    console.error(`ERROR: source does not contain ${sourceManifestPath}`);
    return 1;
  }
  try {
    const states = baselineStates(sourceRoot);
    const blocking = states.filter(item =>
      ['conflict', 'source-dirty', 'source-missing'].includes(item.state),
    );
    const actionable = states.filter(item =>
      ['new', 'safe-update'].includes(item.state),
    );
    for (const item of states)
      console.log(`${item.state}\t${item.policy}\t${item.path}`);
    if (action === 'audit') {
      console.log(
        `audit: ${actionable.length} safe update(s), ${blocking.length} blocking conflict(s)`,
      );
      return blocking.length ? 1 : 0;
    }
    if (blocking.length)
      throw new Error('baseline apply refused because managed files conflict');
    for (const item of actionable) {
      copyFilePreservingMode(
        join(sourceRoot, item.path),
        join(ROOT, item.path),
      );
    }
    const sourceBaseline = loadJson<JsonObject>(sourceManifestPath);
    const localBaseline = loadJson<JsonObject>(
      join(ROOT, '.starter', 'baseline.json'),
    );
    const sourceEntries = new Map<string, BaselineEntry>(
      sourceBaseline.owned_paths.map((entry: BaselineEntry) => [
        entry.path,
        entry,
      ]),
    );
    const localEntries = new Map<string, BaselineEntry>(
      localBaseline.owned_paths.map((entry: BaselineEntry) => [
        entry.path,
        entry,
      ]),
    );
    const mergedEntries: BaselineEntry[] = [];
    const manualReconcile: string[] = [];
    for (const item of states) {
      if (['current', 'new', 'safe-update'].includes(item.state)) {
        const entry = sourceEntries.get(item.path);
        if (entry) mergedEntries.push(entry);
      } else {
        const entry = localEntries.get(item.path);
        if (entry) mergedEntries.push(entry);
        if (item.state === 'manual-reconcile') manualReconcile.push(item.path);
      }
    }
    sourceBaseline.owned_paths = mergedEntries.toSorted((left, right) =>
      left.path.localeCompare(right.path),
    );
    sourceBaseline.manual_reconcile = manualReconcile.toSorted();
    atomicWrite(
      join(ROOT, '.starter', 'baseline.json'),
      jsonText(sourceBaseline),
    );
    console.log(
      'applied: safe baseline updates; merge-policy files needing manual reconciliation were left untouched',
    );
    return 0;
  } catch (error) {
    console.error(`ERROR: ${errorMessage(error)}`);
    return 1;
  }
}

function countPlaceholders(): [string, number][] {
  const results: [string, number][] = [];
  for (const path of [join(ROOT, 'README.md'), join(ROOT, 'PROJECT.md')]) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    const placeholders = content.match(/PLACEHOLDER/g)?.length ?? 0;
    const tokens = content.match(PROJECT_TOKEN_PATTERN)?.length ?? 0;
    if (placeholders + tokens)
      results.push([relative(path), placeholders + tokens]);
  }
  return results;
}

function gitStatus(): string | null {
  const result = run(['git', 'status', '--short', '--branch']);
  return result.returncode === 0 ? result.stdout.trim() : null;
}

function resolveRepo(explicitRepo?: string): string {
  if (explicitRepo) return explicitRepo;
  const result = run(['gh', 'repo', 'view', '--json', 'nameWithOwner']);
  if (result.returncode !== 0) {
    throw new Error(
      'could not resolve GitHub repository; pass --repo OWNER/REPO',
    );
  }
  return JSON.parse(result.stdout).nameWithOwner;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- GitHub returns endpoint-specific JSON that callers validate.
function ghJson(arguments_: string[]): any {
  const result = run(['gh', ...arguments_]);
  if (result.returncode !== 0) {
    throw new Error(
      `gh ${arguments_.join(' ')} failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function settingsState(repo: string): {
  rulesets: JsonObject[] | null;
  permissions: JsonObject;
  rulesetError: string | null;
} {
  let rulesets: JsonObject[] | null = null;
  let rulesetError: string | null = null;
  try {
    rulesets = ghJson(['api', `repos/${repo}/rulesets`]);
  } catch (error) {
    rulesetError = errorMessage(error);
  }
  const permissions = ghJson([
    'api',
    `repos/${repo}/actions/permissions/workflow`,
  ]);
  return {rulesets, permissions, rulesetError};
}

function verifyRemote(report: Report, repo: string, config: JsonObject): void {
  let metadata: JsonObject;
  let workflowPermissions: JsonObject;
  try {
    metadata = ghJson([
      'repo',
      'view',
      repo,
      '--json',
      'nameWithOwner,visibility,defaultBranchRef',
    ]);
    workflowPermissions = ghJson([
      'api',
      `repos/${repo}/actions/permissions/workflow`,
    ]);
  } catch (error) {
    report.error(errorMessage(error));
    return;
  }
  let rulesets: JsonObject[] | null = null;
  let rulesetError: string | null = null;
  try {
    rulesets = ghJson(['api', `repos/${repo}/rulesets`]);
  } catch (error) {
    rulesetError = errorMessage(error);
  }
  const expected = config.repository ?? {};
  const visibility = String(metadata.visibility ?? '').toLowerCase();
  const expectedVisibility = String(
    expected.expected_visibility ?? '',
  ).toLowerCase();
  if (visibility !== expectedVisibility) {
    report.warning(
      `${repo} visibility is ${JSON.stringify(visibility)}; expected ${JSON.stringify(expectedVisibility)}`,
    );
  }
  const defaultBranch = metadata.defaultBranchRef?.name;
  if (defaultBranch !== expected.expected_default_branch) {
    report.warning(
      `${repo} default branch is ${JSON.stringify(defaultBranch)}; expected ${JSON.stringify(expected.expected_default_branch)}`,
    );
  }
  if (rulesets === null) {
    report.warning(
      `${repo} ruleset inspection is unavailable: ${rulesetError}`,
    );
  } else if (
    !new Set(rulesets.map(item => item.name)).has(expected.required_ruleset)
  ) {
    const message = `${repo} is missing ruleset ${JSON.stringify(expected.required_ruleset)}`;
    if (expected.ruleset_mode === 'required') report.error(message);
    else report.warning(message);
  }
  if (workflowPermissions.default_workflow_permissions !== 'read') {
    report.error(`${repo} GitHub Actions default permission is not read-only`);
  }
  if (workflowPermissions.can_approve_pull_request_reviews) {
    report.error(`${repo} workflows can approve pull-request reviews`);
  }
}

function commandVerify(): number {
  const report = verifyRepository();
  report.print();
  return report.errors.length ? 1 : 0;
}

function commandDoctor(options: Map<string, string | boolean>): number {
  const report = verifyRepository();
  const config = verifyProjectConfig(new Report());
  const strict = options.get('strict') === true;
  if (config) {
    if (!config.initialized) {
      if (strict) report.error('project has not been initialized');
      else report.warning('project has not been initialized');
    }
    for (const [path, count] of countPlaceholders()) {
      const message = `${path} contains ${count} unresolved placeholder(s)`;
      if (strict) report.error(message);
      else report.warning(message);
    }
    const active = config.profiles ?? [];
    report.note(
      `active profiles: ${active.length ? active.join(', ') : 'none'}`,
    );
    if (options.get('remote') === true) {
      try {
        verifyRemote(
          report,
          resolveRepo(optionString(options, 'repo')),
          config,
        );
      } catch (error) {
        report.error(errorMessage(error));
      }
    }
  }
  const status = gitStatus();
  if (status) report.note(`git status:\n${status}`);
  report.print();
  return report.errors.length ? 1 : 0;
}

export function renderInitialization(
  name: string,
  description: string,
): Map<string, string> {
  const slug = slugify(name);
  const replacements: Record<string, string> = {
    __PROJECT_NAME__: name,
    __PROJECT_SLUG__: slug,
    __PROJECT_DESCRIPTION__: description,
  };
  const changes = new Map<string, string>();
  for (const path of [join(ROOT, 'README.md'), join(ROOT, 'PROJECT.md')]) {
    let content = readFileSync(path, 'utf8');
    for (const [token, value] of Object.entries(replacements)) {
      content = content.replaceAll(token, value);
    }
    if (basename(path) === 'README.md')
      content = content.replace(STARTER_ONLY_PATTERN, '\n');
    changes.set(path, content);
  }
  const config = loadJson<JsonObject>(PROJECT_CONFIG);
  if (config.initialized) throw new Error('project is already initialized');
  Object.assign(config, {
    initialized: true,
    name,
    slug,
    description,
    initialized_at: localToday(),
  });
  changes.set(PROJECT_CONFIG, jsonText(config));
  return changes;
}

function commandInit(
  action: string | undefined,
  options: Map<string, string | boolean>,
): number {
  const name = optionString(options, 'name');
  const description = optionString(options, 'description');
  if (!['plan', 'apply'].includes(action ?? '') || !name || !description) {
    console.error('ERROR: init requires plan|apply, --name, and --description');
    return 1;
  }
  try {
    const changes = renderInitialization(name, description);
    console.log(`project: ${name}`);
    console.log(`slug: ${slugify(name)}`);
    console.log('local files:');
    for (const path of changes.keys()) console.log(`- ${relative(path)}`);
    if (action === 'plan') {
      console.log('plan only: no files changed');
      return 0;
    }
    for (const [path, content] of changes) atomicWrite(path, content);
    console.log('applied: project initialized locally');
    return 0;
  } catch (error) {
    console.error(`ERROR: ${errorMessage(error)}`);
    return 1;
  }
}

function commandSettings(
  action: string | undefined,
  options: Map<string, string | boolean>,
): number {
  if (!Bun.which('gh')) {
    console.error('ERROR: gh is required for repository settings');
    return 1;
  }
  if (!['plan', 'apply'].includes(action ?? '')) {
    console.error('ERROR: settings action must be plan or apply');
    return 1;
  }
  try {
    const repo = resolveRepo(optionString(options, 'repo'));
    const {rulesets, permissions, rulesetError} = settingsState(repo);
    const recipe = loadJson<JsonObject>(RULESET_RECIPE);
    const matching =
      rulesets?.filter(ruleset => ruleset.name === recipe.name) ?? [];
    const rulesetEffect =
      rulesets === null
        ? `unavailable (${rulesetError})`
        : matching.length
          ? 'update'
          : 'create';
    const permissionsEffect =
      permissions.default_workflow_permissions === 'read' &&
      !permissions.can_approve_pull_request_reviews
        ? 'no-op'
        : 'update';
    console.log(`repository: ${repo}`);
    console.log(`ruleset: ${rulesetEffect} ${JSON.stringify(recipe.name)}`);
    console.log(`workflow permissions: ${permissionsEffect} read-only default`);
    if (action === 'plan') {
      console.log('plan only: no repository settings changed');
      return 0;
    }
    if (optionString(options, 'confirm') !== repo) {
      throw new Error(
        'apply requires --confirm with the exact OWNER/REPO target',
      );
    }
    if (rulesets === null) {
      console.error(
        'WARNING: ruleset skipped because this repository or plan does not expose the rulesets API',
      );
    } else if (matching.length) {
      run(
        [
          'gh',
          'api',
          '--method',
          'PUT',
          `repos/${repo}/rulesets/${matching[0]?.id}`,
          '--input',
          RULESET_RECIPE,
        ],
        ROOT,
        true,
      );
    } else {
      run(
        [
          'gh',
          'api',
          '--method',
          'POST',
          `repos/${repo}/rulesets`,
          '--input',
          RULESET_RECIPE,
        ],
        ROOT,
        true,
      );
    }
    run(
      [
        'gh',
        'api',
        '--method',
        'PUT',
        `repos/${repo}/actions/permissions/workflow`,
        '-f',
        'default_workflow_permissions=read',
        '-F',
        'can_approve_pull_request_reviews=false',
      ],
      ROOT,
      true,
    );
    console.log('applied: repository ruleset and workflow permissions');
    return 0;
  } catch (error) {
    console.error(
      `ERROR: repository settings ${action} failed: ${errorMessage(error)}`,
    );
    return 1;
  }
}

function parseArguments(args: string[]): ParsedArguments {
  const positionals: string[] = [];
  const options = new Map<string, string | boolean>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === undefined) break;
    if (!argument.startsWith('--')) {
      positionals.push(argument);
      continue;
    }
    const key = argument.slice(2);
    const next = args[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, true);
    }
  }
  return {positionals, options};
}

function optionString(
  options: Map<string, string | boolean>,
  name: string,
): string | undefined {
  const value = options.get(name);
  return typeof value === 'string' ? value : undefined;
}

function printUsage(): void {
  console.error(`usage: bun scripts/project-starter.ts <command> [arguments]

commands:
  verify
  doctor [--strict] [--remote] [--repo OWNER/REPO]
  init <plan|apply> --name NAME --description DESCRIPTION
  settings <plan|apply> [--repo OWNER/REPO] [--confirm OWNER/REPO]
  profile <list|plan|apply> [PROFILE...]
  baseline <audit|apply> --source PATH
  baseline-refresh <plan|apply> [--source-revision REVISION]`);
}

export function main(args = Bun.argv.slice(2)): number {
  const command = args[0];
  const parsed = parseArguments(args.slice(1));
  const action = parsed.positionals[0];
  switch (command) {
    case 'verify':
      return commandVerify();
    case 'doctor':
      return commandDoctor(parsed.options);
    case 'init':
      return commandInit(action, parsed.options);
    case 'settings':
      return commandSettings(action, parsed.options);
    case 'profile':
      return commandProfile(action, parsed.positionals.slice(1));
    case 'baseline':
      return commandBaseline(action, optionString(parsed.options, 'source'));
    case 'baseline-refresh':
      return commandBaselineRefresh(
        action,
        optionString(parsed.options, 'source-revision'),
      );
    default:
      printUsage();
      return 2;
  }
}

if (import.meta.main) process.exitCode = main();
