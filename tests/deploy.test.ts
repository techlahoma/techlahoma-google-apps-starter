import {afterEach, beforeEach, describe, expect, test} from 'bun:test';
import {mkdir, rm, symlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {
  type CommandExecResult,
  type CommandExecutor,
  DeployError,
  type DiscoveredApp,
  type FirebaseHostingSite,
  type FirebaseProject,
  classifySecondarySites,
  createNewFirebaseProject,
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
  resolveAppHostingConfig,
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

class StrictMockCommandExecutor implements CommandExecutor {
  calls: {command: string[]; cwd?: string; env?: Record<string, string>}[] = [];
  bundleAsserted = false;

  async exec(
    command: string[],
    options?: {cwd?: string; env?: Record<string, string>},
  ): Promise<CommandExecResult> {
    this.calls.push({
      command,
      ...(options?.cwd ? {cwd: options.cwd} : {}),
      ...(options?.env ? {env: options.env} : {}),
    });

    if (command.includes('deploy') && options?.cwd) {
      const fbJsonFile = Bun.file(join(options.cwd, 'firebase.json'));
      const indexFile = Bun.file(join(options.cwd, 'public/index.html'));

      if (await fbJsonFile.exists()) {
        const data = JSON.parse(await fbFileToText(fbJsonFile));
        const pub = data.hosting?.public;

        if (
          typeof pub === 'string' &&
          (pub.startsWith('..') || pub.includes('/apps/'))
        ) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `Error: ${pub} is outside of project directory`,
          };
        }

        if (
          pub === 'public' &&
          data.hosting?.target === 'workshop-app' &&
          (await indexFile.exists())
        ) {
          this.bundleAsserted = true;
        }
      }
    }

    return {exitCode: 0, stdout: '{}', stderr: ''};
  }
}

async function fbFileToText(
  file: ReturnType<typeof Bun.file>,
): Promise<string> {
  return await file.text();
}

class MockPromptAdapter implements PromptAdapter {
  selectedApp?: DiscoveredApp;
  selectedProject?: FirebaseProject;
  deployConfirmed = true;
  setupConfirmed = true;
  loginConfirmed = true;
  setupMode: 'existing' | 'new' | 'cancel' = 'existing';
  newProjectDetails = {
    projectId: 'new-project',
    displayName: 'New Greenfield Project',
  };
  createConfirmed = true;
  adoptConfirmed = true;

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

  async selectSetupMode(): Promise<'existing' | 'new' | 'cancel'> {
    return this.setupMode;
  }

  async promptNewProjectDetails(): Promise<{
    projectId: string;
    displayName: string;
  }> {
    return this.newProjectDetails;
  }

  async confirmProjectCreation(): Promise<boolean> {
    return this.createConfirmed;
  }

  async confirmAdoptExistingSite(): Promise<boolean> {
    return this.adoptConfirmed;
  }
}

describe('Deploy CLI argument parsing', () => {
  test('parses simple app argument', () => {
    const opts = parseDeployArgs(['workshop-app']);
    expect(opts.appArg).toBe('workshop-app');
    expect(opts.all).toBeUndefined();
  });

  test('parses apps/ path and flags', () => {
    const opts = parseDeployArgs([
      'apps/workshop-app',
      '--dry-run',
      '--yes',
      '--json',
    ]);
    expect(opts.appArg).toBe('apps/workshop-app');
    expect(opts.dryRun).toBe(true);
    expect(opts.yes).toBe(true);
    expect(opts.json).toBe(true);
  });

  test('parses --all flag', () => {
    const opts = parseDeployArgs(['--all']);
    expect(opts.all).toBe(true);
  });

  test('throws on ambiguous positional arguments', () => {
    expect(() => parseDeployArgs(['app1', 'app2'])).toThrow(DeployError);
  });

  test('throws on unknown options', () => {
    expect(() => parseDeployArgs(['--foo'])).toThrow(DeployError);
  });
});

describe('App discovery and resolution', () => {
  const testDir = join(process.cwd(), '.tmp-test-deploy-discovery');

  beforeEach(async () => {
    await mkdir(join(testDir, 'apps/workshop-app'), {recursive: true});
    await writeFile(
      join(testDir, 'apps/workshop-app/package.json'),
      JSON.stringify({name: 'workshop-app', title: 'Workshop App'}),
    );
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: 'dist'}}),
    );
  });

  afterEach(async () => {
    await rm(testDir, {recursive: true, force: true});
  });

  test('resolves slug, apps/slug, and ./apps/slug', async () => {
    const apps = await discoverApps(testDir);
    expect(apps.length).toBe(1);
    expect(apps[0]?.slug).toBe('workshop-app');
    expect(apps[0]?.title).toBe('Workshop App');

    expect(resolveAppTarget('workshop-app', testDir, apps).slug).toBe(
      'workshop-app',
    );
    expect(resolveAppTarget('apps/workshop-app', testDir, apps).slug).toBe(
      'workshop-app',
    );
    expect(resolveAppTarget('./apps/workshop-app', testDir, apps).slug).toBe(
      'workshop-app',
    );
  });

  test('throws error for invalid or unknown app slug', async () => {
    const apps = await discoverApps(testDir);
    expect(() => resolveAppTarget('unknown-app', testDir, apps)).toThrow(
      DeployError,
    );
  });

  test('detects app from cwd when inside apps/ directory', async () => {
    const apps = await discoverApps(testDir);
    const inside = join(testDir, 'apps/workshop-app/src');
    const detected = detectAppFromCwd(inside, testDir, apps);
    expect(detected?.slug).toBe('workshop-app');
  });

  test('returns undefined from cwd if at root', async () => {
    const apps = await discoverApps(testDir);
    const detected = detectAppFromCwd(testDir, testDir, apps);
    expect(detected).toBeUndefined();
  });
});

describe('Firebase project and site safety rules', () => {
  test('identifies protected default site and rejects deployment to site matching project ID', () => {
    const sites: FirebaseHostingSite[] = [
      {siteId: 'existing-project', type: 'DEFAULT_SITE'},
      {siteId: 'workshop-app-123456', type: 'USER_SITE'},
    ];
    const defaultSite = getProtectedDefaultSite(sites, 'existing-project');
    expect(defaultSite?.siteId).toBe('existing-project');

    expect(() =>
      validateDeploymentSite(
        'existing-project',
        'existing-project',
        defaultSite,
      ),
    ).toThrow(DeployError);
  });

  test('allows secondary site deployment', () => {
    const sites: FirebaseHostingSite[] = [
      {siteId: 'existing-project', type: 'DEFAULT_SITE'},
    ];
    const defaultSite = getProtectedDefaultSite(sites, 'existing-project');

    expect(() =>
      validateDeploymentSite(
        'existing-secondary-site',
        'existing-project',
        defaultSite,
      ),
    ).not.toThrow();
  });
});

describe('Placeholder configuration detection', () => {
  test('detects missing or placeholder configs', () => {
    expect(isPlaceholderConfig(null)).toBe(true);
    expect(
      isPlaceholderConfig(
        makeConfig({
          projectId: 'small-google-app-dev',
          displayName: 'Placeholder',
        }),
      ),
    ).toBe(true);
    expect(
      isPlaceholderConfig(
        makeConfig({
          projectId: 'existing-project',
          displayName: 'Valid Project',
        }),
      ),
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
          {projectId: 'existing-project', displayName: 'Existing Project'},
        ],
      }),
    });

    const projects = await listFirebaseProjects('firebase', executor);
    expect(projects.length).toBe(1);
    expect(projects[0]?.projectId).toBe('existing-project');
  });

  test('lists hosting sites from Firebase CLI', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:list', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          sites: [
            {
              name: 'projects/existing-project/sites/existing-project',
              type: 'DEFAULT_SITE',
            },
          ],
        },
      }),
    });

    const sites = await listHostingSites(
      'firebase',
      'existing-project',
      executor,
    );
    expect(sites.length).toBe(1);
    expect(sites[0]?.siteId).toBe('existing-project');
  });

  test('ensures site creation if not present', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {siteId: 'workshop-app-123456', type: 'USER_SITE'},
      }),
    });

    const res = await ensureSiteExists(
      'firebase',
      'existing-project',
      'workshop-app-123456',
      [],
      executor,
    );
    expect(res.created).toBe(true);
  });

  test('fetches site receipt and verifies URL', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://workshop-app-123456.web.app',
        },
      }),
    });

    const mockVerifyFetch = async () => true;

    const app: DiscoveredApp = {
      slug: 'workshop-app',
      title: 'Workshop App',
      directory: '/apps/workshop-app',
    };
    const receipt = await fetchHostingSiteReceipt({
      firebaseBinary: 'firebase',
      projectId: 'existing-project',
      app,
      siteId: 'workshop-app-123456',
      executor,
      verifyFetch: mockVerifyFetch,
    });

    expect(receipt.status).toBe('deployed');
    expect(receipt.verified).toBe(true);
    expect(receipt.deployedUrl).toBe('https://workshop-app-123456.web.app');
  });

  test('returns deployed_but_unverified when live URL fetch fails', async () => {
    const executor = new MockCommandExecutor();
    executor.setResponse('hosting:sites:get', {
      exitCode: 0,
      stdout: JSON.stringify({
        result: {
          defaultUrl: 'https://workshop-app-123456.web.app',
        },
      }),
    });

    const mockVerifyFetch = async () => false;

    const app: DiscoveredApp = {
      slug: 'workshop-app',
      title: 'Workshop App',
      directory: '/apps/workshop-app',
    };
    const receipt = await fetchHostingSiteReceipt({
      firebaseBinary: 'firebase',
      projectId: 'existing-project',
      app,
      siteId: 'workshop-app-123456',
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
    await mkdir(join(testDir, 'apps/workshop-app/dist'), {
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
      join(testDir, 'apps/workshop-app/package.json'),
      JSON.stringify({
        name: 'workshop-app',
        title: 'Workshop App',
      }),
    );
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: 'dist'}}),
    );
    await writeFile(
      join(testDir, 'apps/workshop-app/dist/index.html'),
      '<html><body>Demo</body></html>',
    );

    const validConfig = makeConfig({
      projectId: 'existing-project',
      displayName: 'Existing Project',
      apps: ['welcome', 'workshop-app'],
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
      appArg: 'workshop-app',
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
              name: 'projects/existing-project/sites/existing-project',
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
          defaultUrl: 'https://workshop-app-a1b2c3.web.app',
        },
      }),
    });

    const promptAdapter = new MockPromptAdapter();
    const apps = await discoverApps(testDir);
    promptAdapter.selectedApp = apps.find(a => a.slug === 'workshop-app')!;
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
              name: 'projects/existing-project/sites/existing-project',
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
          defaultUrl: 'https://workshop-app-a1b2c3.web.app',
        },
      }),
    });

    const promptAdapter = new MockPromptAdapter();

    await runDeploy({
      appArg: 'workshop-app',
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
              name: 'projects/existing-project/sites/existing-project',
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

describe('Self-contained deployment bundle & app hosting config preservation', () => {
  const testDir = join(process.cwd(), '.tmp-test-bundle-preservation');

  beforeEach(async () => {
    await mkdir(join(testDir, 'apps/workshop-app/build'), {recursive: true});
    await writeFile(
      join(testDir, 'apps/workshop-app/build/index.html'),
      '<html>SPA Index</html>',
    );
    await writeFile(
      join(testDir, 'apps/workshop-app/package.json'),
      JSON.stringify({name: 'workshop-app', title: 'Workshop App'}),
    );
  });

  afterEach(async () => {
    await rm(testDir, {recursive: true, force: true});
  });

  test('RED-GREEN REGRESSION TEST: staged public directory is bundle-local ("public") and preserves rewrites, cleanUrls, trailingSlash', async () => {
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({
        hosting: {
          public: 'build',
          cleanUrls: true,
          trailingSlash: false,
          rewrites: [{source: '**', destination: '/index.html'}],
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: [
                {key: 'Cache-Control', value: 'max-age=31536000, immutable'},
              ],
            },
          ],
        },
      }),
    );

    const app: DiscoveredApp = {
      slug: 'workshop-app',
      title: 'Workshop App',
      directory: join(testDir, 'apps/workshop-app'),
    };

    const strictExecutor = new StrictMockCommandExecutor();

    await deployAppWithTarget({
      rootDir: testDir,
      firebaseBinary: 'firebase',
      projectId: 'existing-project',
      app,
      siteId: 'workshop-app-123456',
      executor: strictExecutor,
    });

    expect(strictExecutor.bundleAsserted).toBe(true);
  });

  test('resolveAppHostingConfig handles array-form hosting configuration by matching target', async () => {
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({
        hosting: [
          {target: 'other-app', public: 'dist-other'},
          {target: 'workshop-app', public: 'build', cleanUrls: true},
        ],
      }),
    );

    const res = await resolveAppHostingConfig(
      join(testDir, 'apps/workshop-app'),
      'workshop-app',
      testDir,
    );

    expect(res.publicRelPath).toBe('build');
    expect(res.summary.cleanUrls).toBe(true);
  });

  test('resolveAppHostingConfig throws AMBIGUOUS_HOSTING_CONFIG when multiple array items exist and none match target', async () => {
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({
        hosting: [
          {target: 'app-a', public: 'dist-a'},
          {target: 'app-b', public: 'dist-b'},
        ],
      }),
    );

    try {
      await resolveAppHostingConfig(
        join(testDir, 'apps/workshop-app'),
        'workshop-app',
        testDir,
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('AMBIGUOUS_HOSTING_CONFIG');
    }
  });

  test('resolveAppHostingConfig throws PUBLIC_DIRECTORY_MISSING when public path does not exist', async () => {
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: 'nonexistent-folder'}}),
    );

    try {
      await resolveAppHostingConfig(
        join(testDir, 'apps/workshop-app'),
        'workshop-app',
        testDir,
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('PUBLIC_DIRECTORY_MISSING');
    }
  });

  test('resolveAppHostingConfig throws PUBLIC_DIRECTORY_OUTSIDE_REPOSITORY when public path escapes repository', async () => {
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: '../../..'}}, null, 2),
    );

    try {
      await resolveAppHostingConfig(
        join(testDir, 'apps/workshop-app'),
        'workshop-app',
        testDir,
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe(
        'PUBLIC_DIRECTORY_OUTSIDE_REPOSITORY',
      );
    }
  });

  test('resolveAppHostingConfig throws UNSAFE_PUBLIC_SYMLINK when symlink points outside app directory', async () => {
    const outsideDir = join(testDir, 'outside-folder');
    await mkdir(outsideDir, {recursive: true});

    const symlinkPath = join(testDir, 'apps/workshop-app/symlinked-public');
    await symlink(outsideDir, symlinkPath, 'dir');

    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: 'symlinked-public'}}),
    );

    try {
      await resolveAppHostingConfig(
        join(testDir, 'apps/workshop-app'),
        'workshop-app',
        testDir,
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('UNSAFE_PUBLIC_SYMLINK');
    }
  });
});

describe('Greenfield and Adoption Project Setup Flows', () => {
  const testDir = join(process.cwd(), '.tmp-test-greenfield-adoption');

  beforeEach(async () => {
    await mkdir(join(testDir, 'apps/workshop-app/dist'), {recursive: true});
    await writeFile(
      join(testDir, 'apps/workshop-app/package.json'),
      JSON.stringify({name: 'workshop-app', title: 'Workshop App'}),
    );
    await writeFile(
      join(testDir, 'apps/workshop-app/firebase.json'),
      JSON.stringify({hosting: {public: 'dist'}}),
    );
  });

  afterEach(async () => {
    await rm(testDir, {recursive: true, force: true});
  });

  test('createNewFirebaseProject executes firebase projects:create command', async () => {
    const executor = new MockCommandExecutor();

    const proj = await createNewFirebaseProject(
      'firebase',
      'new-greenfield-project',
      'New Greenfield Project',
      executor,
    );

    expect(proj.projectId).toBe('new-greenfield-project');
    expect(
      executor.calls.some(c => c.command.includes('projects:create')),
    ).toBe(true);
  });

  test('createNewFirebaseProject throws INVALID_PROJECT_ID for invalid project ID format', async () => {
    const executor = new MockCommandExecutor();

    try {
      await createNewFirebaseProject(
        'firebase',
        'Invalid Project ID!',
        'New Project',
        executor,
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('INVALID_PROJECT_ID');
    }
  });

  test('classifySecondarySites distinguishes mapped vs unclaimed secondary sites', () => {
    const config = makeConfig({
      projectId: 'existing-project',
      displayName: 'Existing Project',
      sites: {
        'workshop-app': 'workshop-app-mapped',
      },
    });

    const sites: FirebaseHostingSite[] = [
      {siteId: 'existing-project', type: 'DEFAULT_SITE'},
      {siteId: 'workshop-app-mapped', type: 'USER_SITE'},
      {siteId: 'unclaimed-secondary-site', type: 'USER_SITE'},
    ];

    const classified = classifySecondarySites(
      sites,
      config,
      'existing-project',
    );
    expect(classified.length).toBe(2);
    expect(
      classified.find(c => c.siteId === 'workshop-app-mapped')?.classification,
    ).toBe('mapped');
    expect(
      classified.find(c => c.siteId === 'unclaimed-secondary-site')
        ?.classification,
    ).toBe('unclaimed');
  });

  test('greenfield interactive setup prompts for details and creates project', async () => {
    const executor = new MockCommandExecutor();
    const promptAdapter = new MockPromptAdapter();
    promptAdapter.setupMode = 'new';
    promptAdapter.newProjectDetails = {
      projectId: 'brand-new-project',
      displayName: 'Brand New Project',
    };

    await runDeploy({
      rootDir: testDir,
      executor,
      promptAdapter,
      isTty: true,
      dryRun: true,
    });

    expect(
      executor.calls.some(c => c.command.includes('projects:create')),
    ).toBe(false); // Dry run performed no mutations!
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
    let callsCount = 0;
    const sleepFn = async () => {};

    const readinessPromise = pollSiteReadiness(
      'firebase',
      'existing-project',
      'workshop-app-123456',
      {
        async exec() {
          callsCount++;
          if (callsCount >= 3) {
            return {
              exitCode: 0,
              stdout: JSON.stringify({
                result: {
                  name: 'projects/existing-project/sites/workshop-app-123456',
                  type: 'USER_SITE',
                  defaultUrl: 'https://workshop-app-123456.web.app',
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
    expect(result.siteId).toBe('workshop-app-123456');
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
        'existing-project',
        'workshop-app-123456',
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
      'existing-project',
      'workshop-app-123456',
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
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(DeployError);
      expect((err as DeployError).code).toBe('SITE_READINESS_FAILED');
      expect(callsCount).toBe(1);
    }
  });

  test('ensureSiteExists reuses existing secondary site without creating or polling', async () => {
    const executor = new MockCommandExecutor();
    const existingSites: FirebaseHostingSite[] = [
      {
        siteId: 'workshop-app-123456',
        type: 'USER_SITE',
        defaultUrl: 'https://workshop-app-123456.web.app',
      },
    ];

    const res = await ensureSiteExists(
      'firebase',
      'existing-project',
      'workshop-app-123456',
      existingSites,
      executor,
    );

    expect(res.created).toBe(false);
    expect(executor.calls.length).toBe(0);
  });

  test('determineAppStatuses correctly distinguishes missing, existing, deployed, and unconfigured sites', () => {
    const apps: DiscoveredApp[] = [
      {
        slug: 'workshop-app',
        title: 'Workshop App',
        directory: '/apps/workshop-app',
      },
      {slug: 'welcome', title: 'Welcome', directory: '/apps/welcome'},
    ];

    const config = makeConfig({
      projectId: 'existing-project',
      displayName: 'Existing Project',
      sites: {
        'workshop-app': 'workshop-app-123456',
      },
    });

    const existingSites: FirebaseHostingSite[] = [
      {siteId: 'existing-project', type: 'DEFAULT_SITE'},
      {siteId: 'workshop-app-123456', type: 'USER_SITE'},
    ];

    const verifiedApps = new Set<string>(['workshop-app']);

    const statuses = determineAppStatuses(
      apps,
      config,
      existingSites,
      verifiedApps,
    );

    expect(statuses.find(a => a.slug === 'workshop-app')?.status).toBe(
      'deployed',
    );
    expect(statuses.find(a => a.slug === 'welcome')?.status).toBe(
      'site_missing',
    );
  });
});
