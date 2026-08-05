import {afterEach, beforeEach, describe, expect, test} from 'bun:test';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {
  type CommandExecResult,
  type CommandExecutor,
  DeployError,
  type DiscoveredApp,
  type FirebaseHostingSite,
  type FirebaseProject,
  detectAppFromCwd,
  discoverApps,
  ensureSiteExists,
  fetchHostingSiteReceipt,
  getProtectedDefaultSite,
  isPlaceholderConfig,
  listFirebaseProjects,
  listHostingSites,
  resolveAppTarget,
  validateDeploymentSite,
  writeRootConfig,
} from '../scripts/deploy-lib';
import type {PromptAdapter} from '../scripts/deploy-tui';
import {parseDeployArgs, runDeploy} from '../scripts/deploy';
import {makeConfig} from '../scripts/google-cloud-lib';

class MockCommandExecutor implements CommandExecutor {
  calls: {command: string[]; cwd?: string; env?: Record<string, string>}[] = [];
  responses: Record<string, CommandExecResult> = {};
  defaultResponse: CommandExecResult = {exitCode: 0, stdout: '{}', stderr: ''};

  setResponse(cmdPrefix: string, response: Partial<CommandExecResult>) {
    this.responses[cmdPrefix] = {
      exitCode: response.exitCode ?? 0,
      stdout: response.stdout ?? '',
      stderr: response.stderr ?? '',
    };
  }

  async exec(
    command: string[],
    options?: {cwd?: string; env?: Record<string, string>},
  ): Promise<CommandExecResult> {
    this.calls.push({
      command,
      ...(options?.cwd ? {cwd: options.cwd} : {}),
      ...(options?.env ? {env: options.env} : {}),
    });
    const cmdStr = command.join(' ');
    for (const [prefix, res] of Object.entries(this.responses)) {
      if (cmdStr.includes(prefix)) {
        return res;
      }
    }
    return this.defaultResponse;
  }
}

class MockPromptAdapter implements PromptAdapter {
  selectedApp?: DiscoveredApp;
  selectedProject?: FirebaseProject;
  deployConfirmed = true;
  setupConfirmed = true;
  loginConfirmed = true;

  async selectApp(apps: DiscoveredApp[]): Promise<DiscoveredApp> {
    return this.selectedApp ?? apps[0]!;
  }

  async confirmDeploy(): Promise<boolean> {
    return this.deployConfirmed;
  }

  async selectProject(projects: FirebaseProject[]): Promise<FirebaseProject> {
    return this.selectedProject ?? projects[0]!;
  }

  async confirmSetup(): Promise<boolean> {
    return this.setupConfirmed;
  }

  async confirmLogin(): Promise<boolean> {
    return this.loginConfirmed;
  }
}

describe('Deploy CLI argument parsing', () => {
  test('parses simple app argument', () => {
    const opts = parseDeployArgs(['numeronym-generator']);
    expect(opts.appArg).toBe('numeronym-generator');
    expect(opts.all).toBeUndefined();
  });

  test('parses apps/ path and flags', () => {
    const opts = parseDeployArgs([
      'apps/numeronym-generator',
      '--dry-run',
      '--json',
    ]);
    expect(opts.appArg).toBe('apps/numeronym-generator');
    expect(opts.dryRun).toBe(true);
    expect(opts.json).toBe(true);
  });

  test('parses --all flag', () => {
    const opts = parseDeployArgs(['--all', '--yes']);
    expect(opts.all).toBe(true);
    expect(opts.yes).toBe(true);
  });

  test('throws on ambiguous positional arguments', () => {
    expect(() => parseDeployArgs(['app1', 'app2'])).toThrow(DeployError);
  });

  test('throws on unknown options', () => {
    expect(() => parseDeployArgs(['--invalid-flag'])).toThrow(DeployError);
  });
});

describe('App discovery and resolution', () => {
  const mockApps: DiscoveredApp[] = [
    {
      slug: 'bison-byte-dash',
      directory: '/mock/apps/bison-byte-dash',
      title: 'Bison Byte Dash',
    },
    {
      slug: 'numeronym-generator',
      directory: '/mock/apps/numeronym-generator',
      title: 'Numeronym Generator',
    },
  ];

  test('resolves slug, apps/slug, and ./apps/slug', () => {
    const a1 = resolveAppTarget('numeronym-generator', '/mock', mockApps);
    expect(a1.slug).toBe('numeronym-generator');

    const a2 = resolveAppTarget('apps/numeronym-generator', '/mock', mockApps);
    expect(a2.slug).toBe('numeronym-generator');

    const a3 = resolveAppTarget(
      './apps/numeronym-generator',
      '/mock',
      mockApps,
    );
    expect(a3.slug).toBe('numeronym-generator');
  });

  test('throws error for invalid or unknown app slug', () => {
    expect(() =>
      resolveAppTarget('nonexistent-app', '/mock', mockApps),
    ).toThrow(DeployError);
  });

  test('detects app from cwd when inside apps/ directory', () => {
    const app = detectAppFromCwd(
      '/mock/apps/numeronym-generator/src',
      '/mock',
      mockApps,
    );
    expect(app?.slug).toBe('numeronym-generator');
  });

  test('returns undefined from cwd if at root', () => {
    const app = detectAppFromCwd('/mock', '/mock', mockApps);
    expect(app).toBeUndefined();
  });
});

describe('Firebase project and site safety rules', () => {
  test('identifies protected default site and rejects deployment to site matching project ID', () => {
    const sites: FirebaseHostingSite[] = [
      {
        siteId: 'my-project-dev',
        type: 'DEFAULT_SITE',
        defaultUrl: 'https://my-project-dev.web.app',
      },
      {
        siteId: 'app-site-123',
        type: 'USER_SITE',
        defaultUrl: 'https://app-site-123.web.app',
      },
    ];

    const protectedSite = getProtectedDefaultSite(sites, 'my-project-dev');
    expect(protectedSite?.siteId).toBe('my-project-dev');

    expect(() =>
      validateDeploymentSite('my-project-dev', 'my-project-dev', protectedSite),
    ).toThrow(DeployError);
  });

  test('allows secondary site deployment', () => {
    const sites: FirebaseHostingSite[] = [
      {siteId: 'my-project-dev', type: 'DEFAULT_SITE'},
    ];
    const protectedSite = getProtectedDefaultSite(sites, 'my-project-dev');
    expect(() =>
      validateDeploymentSite(
        'numeronym-a1b2c3',
        'my-project-dev',
        protectedSite,
      ),
    ).not.toThrow();
  });
});

describe('Placeholder configuration detection', () => {
  test('detects missing or placeholder configs', () => {
    expect(isPlaceholderConfig(null)).toBe(true);
    expect(
      isPlaceholderConfig({
        schema_version: 1,
        project_id: 'small-google-app-dev',
        display_name: 'Small Google App',
        environment: 'development',
        region: 'us-central1',
        features: ['hosting'],
        sites: {},
      }),
    ).toBe(true);

    expect(
      isPlaceholderConfig({
        schema_version: 1,
        project_id: 'sam-carlton-creative',
        display_name: 'Sam Carlton Creative',
        environment: 'development',
        region: 'us-central1',
        features: ['hosting'],
        sites: {},
      }),
    ).toBe(false);
  });
});

describe('Firebase CLI interaction via Executor', () => {
  test('lists projects from Firebase CLI', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('projects:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: [
          {projectId: 'p1', displayName: 'Project One'},
          {projectId: 'p2', displayName: 'Project Two'},
        ],
      }),
    });

    const projects = await listFirebaseProjects('firebase', executor);
    expect(projects.length).toBe(2);
    expect(projects[0]!.projectId).toBe('p1');
  });

  test('lists hosting sites from Firebase CLI', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          sites: [
            {name: 'projects/p1/sites/p1', type: 'DEFAULT_SITE'},
            {name: 'projects/p1/sites/site-sec', type: 'USER_SITE'},
          ],
        },
      }),
    });

    const sites = await listHostingSites('firebase', 'p1', executor);
    expect(sites.length).toBe(2);
    expect(sites[0]!.siteId).toBe('p1');
    expect(sites[1]!.siteId).toBe('site-sec');
  });

  test('ensures site creation if not present', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:create', {exitCode: 0, stdout: '{}'});

    const result = await ensureSiteExists(
      'firebase',
      'p1',
      'new-site',
      [],
      executor,
    );
    expect(result.created).toBe(true);
    expect(
      executor.calls.some(c => c.command.includes('hosting:sites:create')),
    ).toBe(true);
  });

  test('fetches site receipt and verifies URL', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://site-sec.web.app',
        },
      }),
    });

    const app: DiscoveredApp = {
      slug: 'numeronym-generator',
      directory: '/app',
      title: 'Numeronym Generator',
    };

    const mockVerifyFetch = async (url: string) =>
      url === 'https://site-sec.web.app';

    const receipt = await fetchHostingSiteReceipt({
      firebaseBinary: 'firebase',
      projectId: 'p1',
      app,
      siteId: 'site-sec',
      executor,
      verifyFetch: mockVerifyFetch,
    });

    expect(receipt.status).toBe('deployed');
    expect(receipt.deployedUrl).toBe('https://site-sec.web.app');
    expect(receipt.verified).toBe(true);
  });

  test('returns deployed_but_unverified when live URL fetch fails', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://site-sec.web.app',
        },
      }),
    });

    const app: DiscoveredApp = {
      slug: 'numeronym-generator',
      directory: '/app',
      title: 'Numeronym Generator',
    };

    const mockVerifyFetch = async () => false;

    const receipt = await fetchHostingSiteReceipt({
      firebaseBinary: 'firebase',
      projectId: 'p1',
      app,
      siteId: 'site-sec',
      executor,
      verifyFetch: mockVerifyFetch,
    });

    expect(receipt.status).toBe('deployed_but_unverified');
    expect(receipt.verified).toBe(false);
  });
});

describe('Execution flow end-to-end with mock executor and test fixture directory', () => {
  const testDir = join(process.cwd(), '.tmp-test-deploy-workspace');

  beforeEach(async () => {
    await mkdir(join(testDir, 'apps/welcome'), {recursive: true});
    await mkdir(join(testDir, 'apps/numeronym-generator/dist'), {
      recursive: true,
    });

    await writeFile(
      join(testDir, 'apps/welcome/package.json'),
      JSON.stringify({name: 'welcome', title: 'Welcome App'}),
    );
    await writeFile(
      join(testDir, 'apps/welcome/firebase.json'),
      JSON.stringify({hosting: {public: 'dist'}}),
    );

    await writeFile(
      join(testDir, 'apps/numeronym-generator/package.json'),
      JSON.stringify({
        name: 'numeronym-generator',
        title: 'Numeronym Generator',
      }),
    );
    await writeFile(
      join(testDir, 'apps/numeronym-generator/firebase.json'),
      JSON.stringify({hosting: {public: 'dist'}}),
    );
    await writeFile(
      join(testDir, 'apps/numeronym-generator/dist/index.html'),
      '<html><body>Demo</body></html>',
    );

    const validConfig = makeConfig({
      projectId: 'sam-carlton-creative',
      displayName: 'Sam Carlton Creative',
      apps: ['welcome', 'numeronym-generator'],
    });
    await writeRootConfig(testDir, validConfig);
  });

  afterEach(async () => {
    await rm(testDir, {recursive: true, force: true});
  });

  test('runs dry run without making remote deployment or config edits', async () => {
    const executor = new MockCommandExecutor();
    const promptAdapter = new MockPromptAdapter();

    await runDeploy({
      appArg: 'numeronym-generator',
      dryRun: true,
      json: true,
      rootDir: testDir,
      executor,
      promptAdapter,
      isTty: false,
    });

    expect(
      executor.calls.some(
        c =>
          c.command.includes('deploy') ||
          c.command.includes('hosting:sites:create'),
      ),
    ).toBe(false);
  });

  test('fails noninteractive run without app argument or --all', async () => {
    const executor = new MockCommandExecutor();
    const promptAdapter = new MockPromptAdapter();

    expect(
      runDeploy({
        rootDir: testDir,
        executor,
        promptAdapter,
        isTty: false,
      }),
    ).rejects.toThrow(DeployError);
  });

  test('interactive mode allows selecting an app and confirming deployment', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          sites: [
            {
              name: 'projects/sam-carlton-creative/sites/sam-carlton-creative',
              type: 'DEFAULT_SITE',
            },
          ],
        },
      }),
    });
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://numeronym-generator-a1b2c3.web.app',
        },
      }),
    });

    const promptAdapter = new MockPromptAdapter();
    const apps = await discoverApps(testDir);
    promptAdapter.selectedApp = apps.find(
      a => a.slug === 'numeronym-generator',
    )!;
    promptAdapter.deployConfirmed = true;

    await runDeploy({
      rootDir: testDir,
      executor,
      promptAdapter,
      isTty: true,
    });

    expect(executor.calls.some(c => c.command.includes('deploy'))).toBe(true);
  });

  test('executes deployment for single app in unattended mode (--yes)', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          sites: [
            {
              name: 'projects/sam-carlton-creative/sites/sam-carlton-creative',
              type: 'DEFAULT_SITE',
            },
          ],
        },
      }),
    });
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://numeronym-generator-a1b2c3.web.app',
        },
      }),
    });

    const promptAdapter = new MockPromptAdapter();

    await runDeploy({
      appArg: 'numeronym-generator',
      yes: true,
      json: true,
      rootDir: testDir,
      executor,
      promptAdapter,
      isTty: false,
    });

    expect(executor.calls.some(c => c.command.includes('deploy'))).toBe(true);
  });

  test('deploy-all builds all apps before deployment', async () => {
    await mkdir(join(testDir, 'apps/welcome/dist'), {recursive: true});
    await writeFile(
      join(testDir, 'apps/welcome/dist/index.html'),
      '<html>Welcome</html>',
    );

    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          sites: [
            {
              name: 'projects/sam-carlton-creative/sites/sam-carlton-creative',
              type: 'DEFAULT_SITE',
            },
          ],
        },
      }),
    });

    const promptAdapter = new MockPromptAdapter();

    await runDeploy({
      all: true,
      yes: true,
      json: true,
      rootDir: testDir,
      executor,
      promptAdapter,
      isTty: false,
    });

    const buildCalls = executor.calls.filter(c => c.command.includes('build'));
    expect(buildCalls.length).toBe(2);

    const firstBuildIdx = executor.calls.findIndex(c =>
      c.command.includes('build'),
    );
    const firstDeployIdx = executor.calls.findIndex(c =>
      c.command.includes('deploy'),
    );
    expect(firstBuildIdx).toBeLessThan(firstDeployIdx);
  });
});
