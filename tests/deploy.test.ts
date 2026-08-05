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
  deployAppWithTarget,
  detectAppFromCwd,
  determineAppStatuses,
  discoverApps,
  ensureSiteExists,
  fetchHostingSiteReceipt,
  getProtectedDefaultSite,
  isPlaceholderConfig,
  listFirebaseProjects,
  listHostingSites,
  pollSiteReadiness,
  resolveAppTarget,
  sanitizeFirebaseErrorOutput,
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

describe('Sanitization, diagnostic evidence, site readiness, and site reuse', () => {
  test('sanitizeFirebaseErrorOutput redacts tokens, API keys, ANSI codes, and bounds output', () => {
    const raw =
      '\u001b[31mError\u001b[0m: Authorization Bearer secret-token-12345 failed for key AIzaSyA1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p. FIREBASE_TOKEN=my-secret-token access_token=xyz';
    const clean = sanitizeFirebaseErrorOutput(raw);

    expect(clean).not.toContain('\u001b[31m');
    expect(clean).not.toContain('secret-token-12345');
    expect(clean).not.toContain('AIzaSyA1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p');
    expect(clean).not.toContain('my-secret-token');
    expect(clean).toContain('Bearer [REDACTED]');
    expect(clean).toContain('[REDACTED_API_KEY]');
    expect(clean).toContain('FIREBASE_TOKEN=[REDACTED]');
    expect(clean).toContain('access_token=[REDACTED]');
  });

  test('pollSiteReadiness succeeds after transient not-found responses with zero delay in test', async () => {
    const executor = new MockCommandExecutor();
    let callsCount = 0;

    executor.setResponse('hosting:sites:get', {
      exitCode: 1,
      stdout: '',
      stderr: 'HTTP 404 Site not found',
    });

    const sleepFn = async () => {};

    const readinessPromise = pollSiteReadiness(
      'firebase',
      'sam-carlton-creative',
      'numeronym-generator-ef4ba1',
      {
        async exec() {
          callsCount++;
          if (callsCount >= 3) {
            return {
              exitCode: 0,
              stdout: JSON.stringify({
                result: {
                  name: 'projects/sam-carlton-creative/sites/numeronym-generator-ef4ba1',
                  type: 'USER_SITE',
                  defaultUrl: 'https://numeronym-generator-ef4ba1.web.app',
                },
              }),
              stderr: '',
            };
          }
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'HTTP 404 Site not found',
          };
        },
      },
      {maxAttempts: 5, initialDelayMs: 10, sleepFn},
    );

    const result = await readinessPromise;
    expect(result.siteId).toBe('numeronym-generator-ef4ba1');
    expect(callsCount).toBe(3);
  });

  test('pollSiteReadiness fails with SITE_NOT_READY when maxAttempts exhausted', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 1,
      stdout: '',
      stderr: 'HTTP 404 Site not found',
    });

    const sleepFn = async () => {};

    try {
      await pollSiteReadiness(
        'firebase',
        'sam-carlton-creative',
        'numeronym-generator-ef4ba1',
        executor,
        {maxAttempts: 3, initialDelayMs: 1, sleepFn},
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('SITE_NOT_READY');
    }
  });

  test('pollSiteReadiness fails immediately without retrying non-transient errors (403/Forbidden)', async () => {
    let callsCount = 0;
    const sleepFn = async () => {};

    const promise = pollSiteReadiness(
      'firebase',
      'sam-carlton-creative',
      'numeronym-generator-ef4ba1',
      {
        async exec() {
          callsCount++;
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'HTTP 403 PERMISSION_DENIED: User does not have permission',
          };
        },
      },
      {maxAttempts: 5, initialDelayMs: 1, sleepFn},
    );

    try {
      await promise;
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('SITE_READINESS_FAILED');
      expect(callsCount).toBe(1); // failed immediately without retrying!
    }
  });

  test('ensureSiteExists reuses existing secondary site without creating or polling', async () => {
    const executor = new MockCommandExecutor();
    const existingSites: FirebaseHostingSite[] = [
      {
        siteId: 'numeronym-generator-ef4ba1',
        type: 'USER_SITE',
        defaultUrl: 'https://numeronym-generator-ef4ba1.web.app',
      },
    ];

    const res = await ensureSiteExists(
      'firebase',
      'sam-carlton-creative',
      'numeronym-generator-ef4ba1',
      existingSites,
      executor,
    );

    expect(res.created).toBe(false);
    expect(executor.calls.length).toBe(0);
  });

  test('determineAppStatuses correctly distinguishes missing, existing, deployed, and unconfigured sites', () => {
    const apps: DiscoveredApp[] = [
      {
        slug: 'numeronym-generator',
        title: 'Numeronym Generator',
        directory: '/apps/numeronym-generator',
      },
      {slug: 'welcome', title: 'Welcome', directory: '/apps/welcome'},
      {slug: 'room-pulse', title: 'Room Pulse', directory: '/apps/room-pulse'},
    ];

    const config = makeConfig({
      projectId: 'sam-carlton-creative',
      displayName: 'Sam Carlton Creative',
      sites: {
        'numeronym-generator': 'numeronym-generator-ef4ba1',
      },
    });

    const existingSites: FirebaseHostingSite[] = [
      {siteId: 'sam-carlton-creative', type: 'DEFAULT_SITE'},
      {siteId: 'numeronym-generator-ef4ba1', type: 'USER_SITE'},
    ];

    const verifiedApps = new Set<string>(['numeronym-generator']);

    const statuses = determineAppStatuses(
      apps,
      config,
      existingSites,
      verifiedApps,
    );

    expect(statuses.find(a => a.slug === 'numeronym-generator')?.status).toBe(
      'deployed',
    );
    expect(statuses.find(a => a.slug === 'welcome')?.status).toBe(
      'site_missing',
    );
  });

  test('REGRESSION TEST (eb995e4 fix): failed firebase deploy surfaces sanitized stderr, saves evidence receipt, and cleans temporary workspace', async () => {
    const testDir = join(
      process.cwd(),
      'tests',
      'fixtures',
      `test-regression-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    );

    await mkdir(join(testDir, 'apps/numeronym-generator/dist'), {
      recursive: true,
    });
    await writeFile(
      join(testDir, 'apps/numeronym-generator/dist/index.html'),
      '<html>Test</html>',
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
      '{}',
    );

    const app: DiscoveredApp = {
      slug: 'numeronym-generator',
      title: 'Numeronym Generator',
      directory: join(testDir, 'apps/numeronym-generator'),
    };

    const failingExecutor: CommandExecutor = {
      async exec(command, options) {
        // Assert temporary .firebaserc and firebase.json contents in cwd
        if (options?.cwd) {
          const firebasercFile = Bun.file(join(options.cwd, '.firebaserc'));
          const firebaseJsonFile = Bun.file(join(options.cwd, 'firebase.json'));

          expect(await firebasercFile.exists()).toBe(true);
          expect(await firebaseJsonFile.exists()).toBe(true);

          const rcData = JSON.parse(await firebasercFile.text());
          const jsonData = JSON.parse(await firebaseJsonFile.text());

          expect(rcData.projects.default).toBe('sam-carlton-creative');
          expect(
            rcData.targets['sam-carlton-creative'].hosting[
              'numeronym-generator'
            ],
          ).toEqual(['numeronym-generator-ef4ba1']);
          expect(jsonData.hosting.target).toBe('numeronym-generator');
        }

        return {
          exitCode: 1,
          stdout: '',
          stderr:
            'Error: Deploy failed due to insufficient hosting release authorization Bearer secret-auth-token-999',
        };
      },
    };

    try {
      await deployAppWithTarget({
        rootDir: testDir,
        firebaseBinary: 'firebase',
        projectId: 'sam-carlton-creative',
        app,
        siteId: 'numeronym-generator-ef4ba1',
        executor: failingExecutor,
      });
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      const deployErr = err as DeployError;
      expect(deployErr.code).toBe('DEPLOYMENT_FAILED');

      const details = deployErr.details as {
        app: string;
        projectId: string;
        siteId: string;
        exitCode: number;
        command: string[];
        firebaseStderr: string;
        evidencePath: string;
      };

      // 1. Surfaced sanitized stderr (redacting secret-auth-token-999)
      expect(details.firebaseStderr).toContain('Bearer [REDACTED]');
      expect(details.firebaseStderr).not.toContain('secret-auth-token-999');

      // 2. Evidence receipt saved on disk under .starter/tmp/deploy-errors/
      expect(details.evidencePath).toBeDefined();
      const evidenceFile = Bun.file(join(testDir, details.evidencePath));
      expect(await evidenceFile.exists()).toBe(true);

      const savedEvidence = JSON.parse(await evidenceFile.text());
      expect(savedEvidence.app).toBe('numeronym-generator');
      expect(savedEvidence.projectId).toBe('sam-carlton-creative');
      expect(savedEvidence.siteId).toBe('numeronym-generator-ef4ba1');
      expect(savedEvidence.exitCode).toBe(1);
      expect(savedEvidence.command).toEqual([
        'firebase',
        'deploy',
        '--only',
        'hosting:numeronym-generator',
        '--project',
        'sam-carlton-creative',
      ]);
      expect(savedEvidence.firebaseStderr).toContain('Bearer [REDACTED]');
      expect(savedEvidence.env).toBeUndefined(); // no env dump!
    }

    // 3. Verify temporary deploy folder was cleaned up
    const entries = await Bun.file(join(testDir, '.firebaserc')).exists();
    expect(entries).toBe(false);

    await rm(testDir, {recursive: true, force: true});
  });
});
