#!/usr/bin/env bun

import {resolve} from 'node:path';
import {
  type CommandExecutor,
  DefaultCommandExecutor,
  DeployError,
  type DeployReceipt,
  type DiscoveredApp,
  type FirebaseHostingSite,
  buildAppWorkspace,
  checkFirebaseAuth,
  detectAppFromCwd,
  determineAppStatuses,
  discoverApps,
  deployAppWithTarget,
  ensureSiteExists,
  fetchHostingSiteReceipt,
  getProtectedDefaultSite,
  isPlaceholderConfig,
  listFirebaseProjects,
  listHostingSites,
  readRootConfig,
  resolveAppTarget,
  validateDeploymentSite,
  writeRootConfig,
} from './deploy-lib';
import {
  CliPromptAdapter,
  type PromptAdapter,
  printDeployHeader,
  printDestination,
  printProjectInfo,
  printSuccessReceipt,
} from './deploy-tui';
import {deriveSiteId, makeConfig} from './google-cloud-lib';

const HELP = `Techlahoma Google Apps Starter simplified Firebase deployment CLI

Usage:
  bun run deploy                         Interactive terminal app selector & guided setup
  bun run deploy <APP_OR_DIRECTORY>      Deploy a specific app workspace
  bun run deploy --all                   Build and deploy all discovered app workspaces
  bun run deploy <APP> --dry-run         Preview deployment targets without mutating
  bun run deploy <APP> --yes             Deploy unattended without interactive confirmation
  bun run deploy <APP> --json            Output machine-readable JSON result
  bun run deploy --help                  Show this help message

Examples:
  bun run deploy numeronym-generator
  bun run deploy apps/numeronym-generator
  bun run deploy ./apps/numeronym-generator
  bun run deploy --all --dry-run
`;

export interface DeployCliOptions {
  appArg?: string;
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  json?: boolean;
  help?: boolean;
  rootDir?: string;
  executor?: CommandExecutor;
  promptAdapter?: PromptAdapter;
  isTty?: boolean;
}

export function parseDeployArgs(args: string[]): DeployCliOptions {
  const options: DeployCliOptions = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h' || arg === 'help') {
      options.help = true;
    } else if (arg.startsWith('-')) {
      throw new DeployError(
        'UNKNOWN_OPTION',
        `Unknown option: ${arg}`,
        'Run "bun run deploy --help" to see available options.',
      );
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    throw new DeployError(
      'AMBIGUOUS_ARGUMENTS',
      `Multiple positional arguments received: ${positional.join(', ')}`,
      'Pass a single app slug or directory, or use --all.',
    );
  }

  if (positional[0]) {
    options.appArg = positional[0];
  }

  return options;
}

export async function runDeploy(options: DeployCliOptions): Promise<void> {
  const rootDir = options.rootDir ?? resolve(import.meta.dir, '..');
  const executor = options.executor ?? new DefaultCommandExecutor();
  const promptAdapter = options.promptAdapter ?? new CliPromptAdapter();
  const firebaseBinary = './node_modules/.bin/firebase';
  const isTty = options.isTty ?? (process.stdout.isTTY && process.stdin.isTTY);

  if (options.help) {
    console.log(HELP);
    return;
  }

  const discoveredApps = await discoverApps(rootDir);
  if (discoveredApps.length === 0) {
    throw new DeployError(
      'NO_APPS_FOUND',
      'No runnable app workspaces found under apps/.',
      'Create an app workspace using "bun run app:create apply --name APP --title TITLE".',
    );
  }

  let targetApps: DiscoveredApp[] = [];
  let isInteractiveSingleSelection = false;

  if (options.all) {
    if (options.appArg) {
      throw new DeployError(
        'INVALID_ARGUMENTS',
        'Cannot combine a specific app argument with --all.',
        'Use either "bun run deploy <app>" or "bun run deploy --all".',
      );
    }
    targetApps = discoveredApps;
  } else if (options.appArg) {
    targetApps = [resolveAppTarget(options.appArg, rootDir, discoveredApps)];
  } else {
    // No app arg provided and not --all
    if (!isTty && !options.json) {
      throw new DeployError(
        'MISSING_APP_ARGUMENT',
        'Noninteractive execution requires an app argument or --all.',
        'Run "bun run deploy <app-slug>" or "bun run deploy --all".',
      );
    }
    if (options.json) {
      throw new DeployError(
        'MISSING_APP_ARGUMENT',
        'JSON output requires an app argument or --all.',
        'Run "bun run deploy <app-slug> --json" or "bun run deploy --all --json".',
      );
    }
    isInteractiveSingleSelection = true;
  }

  // Load configuration
  let config = await readRootConfig(rootDir);

  // Check if setup is needed
  if (isPlaceholderConfig(config)) {
    if (!isTty || options.yes) {
      throw new DeployError(
        'MISSING_CONFIG',
        'Root configuration google.project.json is missing or contains placeholders.',
        'Run "bun run deploy" interactively to set up your shared project connection.',
      );
    }

    // Guided setup flow
    console.log('Firebase project connection setup\n');
    const isAuthed = await checkFirebaseAuth(firebaseBinary, executor);
    if (!isAuthed) {
      const wantLogin = await promptAdapter.confirmLogin();
      if (!wantLogin) {
        throw new DeployError(
          'AUTH_REQUIRED',
          'Firebase authentication is required to query project hosting sites.',
          'Run "bun run firebase:login" to authenticate.',
        );
      }
      await executor.exec([firebaseBinary, 'login']);
      const recheck = await checkFirebaseAuth(firebaseBinary, executor);
      if (!recheck) {
        throw new DeployError(
          'AUTH_FAILED',
          'Firebase login incomplete or unauthenticated.',
          'Complete login and retry "bun run deploy".',
        );
      }
    }

    const projects = await listFirebaseProjects(firebaseBinary, executor);
    if (projects.length === 0) {
      throw new DeployError(
        'NO_FIREBASE_PROJECTS',
        'No Firebase projects visible to your authenticated account.',
        'Create a project in the Firebase Console: https://console.firebase.google.com/',
      );
    }

    const selectedProject = await promptAdapter.selectProject(projects);
    const confirmSetup = await promptAdapter.confirmSetup(
      selectedProject.projectId,
    );
    if (!confirmSetup) {
      console.log('Setup cancelled.');
      return;
    }

    config = makeConfig(
      {
        projectId: selectedProject.projectId,
        displayName: selectedProject.displayName,
        apps: discoveredApps.map(a => a.slug),
      },
      config ?? undefined,
    );

    await writeRootConfig(rootDir, config);
    console.log(
      `Connected to project "${config.project_id}". Saved to google.project.json.\n`,
    );
  }

  if (!config) {
    throw new DeployError(
      'MISSING_CONFIG',
      'Root configuration google.project.json is missing.',
    );
  }

  // Active configuration guaranteed
  const activeConfig = config;
  const projectId = activeConfig.project_id;
  const displayName = activeConfig.display_name;

  // Query hosting sites for project safety checks
  let existingSites: FirebaseHostingSite[] = [];
  try {
    existingSites = await listHostingSites(firebaseBinary, projectId, executor);
  } catch (err) {
    if (options.dryRun) {
      // In dry-run mode, if site query fails due to missing auth/mock, proceed gracefully
      existingSites = [];
    } else {
      throw err;
    }
  }

  const defaultSite = getProtectedDefaultSite(existingSites, projectId);
  const appsWithStatus = determineAppStatuses(
    discoveredApps,
    activeConfig,
    existingSites,
  );

  // If interactive single selection (no app specified on CLI)
  if (isInteractiveSingleSelection) {
    if (!options.json) {
      printDeployHeader();
      printProjectInfo(displayName, projectId, defaultSite);
    }

    const cwdApp = detectAppFromCwd(process.cwd(), rootDir, discoveredApps);
    const selectedApp = await promptAdapter.selectApp(
      appsWithStatus,
      cwdApp?.slug ?? appsWithStatus[0]?.slug,
    );
    targetApps = [selectedApp];

    const siteId =
      activeConfig.sites[selectedApp.slug] ??
      deriveSiteId(projectId, selectedApp.slug);
    validateDeploymentSite(siteId, projectId, defaultSite);

    if (!options.json) {
      printDestination(siteId);
      const confirmed = await promptAdapter.confirmDeploy(
        selectedApp.title,
        `${siteId}.web.app`,
      );
      if (!confirmed) {
        console.log('Deployment cancelled.');
        return;
      }
    }
  } else if (
    !options.yes &&
    !options.dryRun &&
    !options.json &&
    targetApps.length === 1
  ) {
    // Direct app argument without --yes or --json
    const app = targetApps[0]!;
    const siteId =
      activeConfig.sites[app.slug] ?? deriveSiteId(projectId, app.slug);
    validateDeploymentSite(siteId, projectId, defaultSite);

    printDeployHeader();
    printProjectInfo(displayName, projectId, defaultSite);
    printDestination(siteId);

    const confirmed = await promptAdapter.confirmDeploy(
      app.title,
      `${siteId}.web.app`,
    );
    if (!confirmed) {
      console.log('Deployment cancelled.');
      return;
    }
  }

  // Validate all site IDs for target apps
  for (const app of targetApps) {
    const siteId =
      activeConfig.sites[app.slug] ?? deriveSiteId(projectId, app.slug);
    validateDeploymentSite(siteId, projectId, defaultSite);
  }

  // Handle Dry Run
  if (options.dryRun) {
    const plans = targetApps.map(app => {
      const siteId =
        activeConfig.sites[app.slug] ?? deriveSiteId(projectId, app.slug);
      return {
        app: app.slug,
        title: app.title,
        projectId,
        siteId,
        destination: `https://${siteId}.web.app`,
        protectedDefaultSite: defaultSite?.siteId ?? `${projectId}.web.app`,
        commands: [
          `bun run --cwd apps/${app.slug} build`,
          `firebase hosting:sites:create ${siteId} --project ${projectId}`,
          `firebase deploy --only hosting:${app.slug} --project ${projectId}`,
        ],
      };
    });

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            mode: 'dry-run',
            projectId,
            appsCount: plans.length,
            plans,
          },
          null,
          2,
        ),
      );
    } else {
      console.log('DRY RUN PREVIEW - No mutations performed\n');
      console.log(`Project: ${displayName} (${projectId})`);
      if (defaultSite) {
        console.log(
          `Protected site: ${defaultSite.siteId} (will not be modified)`,
        );
      }
      console.log('\nTarget Deployments:');
      for (const p of plans) {
        console.log(
          `  - ${p.title} (${p.app}) -> ${p.destination} [Site: ${p.siteId}]`,
        );
      }
      console.log('\nCommands that would execute:');
      for (const p of plans) {
        console.log(`  [${p.app}] ${p.commands.join(' && ')}`);
      }
    }
    return;
  }

  // Execution Phase
  if (options.all) {
    // Build ALL apps first before deploying any!
    if (!options.json) {
      console.log(`Building all ${targetApps.length} apps...`);
    }
    for (const app of targetApps) {
      await buildAppWorkspace(app, executor);
    }

    const receipts: DeployReceipt[] = [];
    let hasFailures = false;

    for (const app of targetApps) {
      const siteId =
        activeConfig.sites[app.slug] ?? deriveSiteId(projectId, app.slug);
      try {
        await ensureSiteExists(
          firebaseBinary,
          projectId,
          siteId,
          existingSites,
          executor,
        );

        // Save site mapping if newly derived
        if (!activeConfig.sites[app.slug]) {
          activeConfig.sites[app.slug] = siteId;
          await writeRootConfig(rootDir, activeConfig);
        }

        await deployAppWithTarget({
          rootDir,
          firebaseBinary,
          projectId,
          app,
          siteId,
          executor,
        });

        const receipt = await fetchHostingSiteReceipt({
          firebaseBinary,
          projectId,
          app,
          siteId,
          executor,
        });
        receipts.push(receipt);
      } catch (err) {
        hasFailures = true;
        const msg = err instanceof Error ? err.message : String(err);
        receipts.push({
          status: 'failed',
          projectId,
          app: app.slug,
          siteId,
          deployedUrl: `https://${siteId}.web.app`,
          firebaseConsoleUrl: `https://console.firebase.google.com/project/${projectId}/hosting/sites`,
          verified: false,
          error: msg,
        });
      }
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {status: hasFailures ? 'partial_failure' : 'completed', receipts},
          null,
          2,
        ),
      );
    } else {
      console.log('\nDeployment Summary:');
      for (const r of receipts) {
        const symbol =
          r.status === 'deployed'
            ? '✓'
            : r.status === 'deployed_but_unverified'
              ? '⚠'
              : '✗';
        console.log(`${symbol} ${r.app}: ${r.deployedUrl} (${r.status})`);
      }
    }

    if (hasFailures) {
      process.exitCode = 1;
    }
    return;
  }

  // Single app execution
  const singleApp = targetApps[0]!;
  const siteId =
    activeConfig.sites[singleApp.slug] ??
    deriveSiteId(projectId, singleApp.slug);

  if (!options.json) {
    console.log(`\nBuilding ${singleApp.title}...`);
  }
  await buildAppWorkspace(singleApp, executor);

  await ensureSiteExists(
    firebaseBinary,
    projectId,
    siteId,
    existingSites,
    executor,
  );

  if (!activeConfig.sites[singleApp.slug]) {
    activeConfig.sites[singleApp.slug] = siteId;
    await writeRootConfig(rootDir, activeConfig);
  }

  if (!options.json) {
    console.log(`Deploying to ${siteId}.web.app...`);
  }
  await deployAppWithTarget({
    rootDir,
    firebaseBinary,
    projectId,
    app: singleApp,
    siteId,
    executor,
  });

  const receipt = await fetchHostingSiteReceipt({
    firebaseBinary,
    projectId,
    app: singleApp,
    siteId,
    executor,
  });

  if (options.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    printSuccessReceipt(receipt);
  }

  if (receipt.status === 'failed') {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const options = parseDeployArgs(args);
  await runDeploy(options);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    if (error instanceof DeployError) {
      if (Bun.argv.includes('--json')) {
        console.error(JSON.stringify(error.toJSON(), null, 2));
      } else {
        console.error(`\nDeploy Error [${error.code}]: ${error.message}`);
        const details = error.details as
          | {
              command?: string[];
              firebaseStderr?: string;
              evidencePath?: string;
            }
          | undefined;

        if (details?.command) {
          console.error(`Command: ${details.command.join(' ')}`);
        }
        if (details?.firebaseStderr) {
          console.error('\nFirebase Error Output:');
          console.error(
            '--------------------------------------------------------------------------------',
          );
          console.error(details.firebaseStderr);
          console.error(
            '--------------------------------------------------------------------------------',
          );
        }
        if (error.remediation) {
          console.error(`Remediation: ${error.remediation}`);
        }
        if (details?.evidencePath) {
          console.error(
            `Diagnostic evidence saved to: ${details.evidencePath}`,
          );
        }
      }
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      if (Bun.argv.includes('--json')) {
        console.error(
          JSON.stringify(
            {
              error: {
                code: 'UNEXPECTED_ERROR',
                message: msg,
              },
            },
            null,
            2,
          ),
        );
      } else {
        console.error(`\nUnexpected Error: ${msg}`);
      }
    }
    process.exitCode = 1;
  });
}
