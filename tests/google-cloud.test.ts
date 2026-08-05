import {describe, expect, test} from 'bun:test';
import {
  configPlan,
  deployAllPlan,
  deployPlan,
  destroyPlan,
  deriveSiteId,
  makeConfig,
  provisionPlan,
  requireConfirmation,
  rootConfigPath,
  sitesDestroyPlan,
  sitesPlan,
  validateConfig,
  validateSiteId,
} from '../scripts/google-cloud-lib';

const config = makeConfig({
  projectId: 'small-google-app-dev',
  displayName: 'Small Google App',
  apps: ['welcome', 'example-crm'],
});

describe('Google project configuration', () => {
  test('creates shared project configuration with site mappings', () => {
    expect(config.schema_version).toBe(1);
    expect(config.project_id).toBe('small-google-app-dev');
    expect(config.display_name).toBe('Small Google App');
    expect(config.environment).toBe('development');
    expect(config.region).toBe('us-central1');
    expect(config.features).toEqual(['hosting']);
    expect(config.sites['welcome']).toBeDefined();
    expect(config.sites['example-crm']).toBeDefined();
  });

  test('rejects placeholders and malformed project IDs', () => {
    expect(() =>
      makeConfig({projectId: 'TODO-project', displayName: 'Small Google App'}),
    ).toThrow('project_id');
    expect(() =>
      makeConfig({projectId: 'ends-with-', displayName: 'Small Google App'}),
    ).toThrow('project_id');
  });

  test('rejects additional services in the simple profile', () => {
    expect(() =>
      validateConfig({
        ...config,
        features: ['hosting', 'firestore'],
      }),
    ).toThrow('features');
  });

  test('reads values from environment variables if not provided in options', () => {
    process.env.FIREBASE_PROJECT_ID = 'env-project-dev';
    process.env.FIREBASE_DISPLAY_NAME = 'Env Project App';
    try {
      const envConfig = makeConfig({});
      expect(envConfig.project_id).toBe('env-project-dev');
      expect(envConfig.display_name).toBe('Env Project App');
    } finally {
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_DISPLAY_NAME;
    }
  });
});

describe('site ID constraints and derivation', () => {
  test('derives deterministic site IDs matching Firebase constraints', () => {
    const siteId1 = deriveSiteId('small-google-app-dev', 'welcome');
    const siteId2 = deriveSiteId('small-google-app-dev', 'welcome');
    expect(siteId1).toBe(siteId2);
    expect(siteId1.length).toBeGreaterThanOrEqual(4);
    expect(siteId1.length).toBeLessThanOrEqual(30);
    expect(siteId1).toMatch(/^[a-z0-9][a-z0-9-]{2,28}[a-z0-9]$/);
  });

  test('handles long project IDs and long app slugs safely', () => {
    const longProject = 'a-very-long-project-id-dev-12345';
    const longSlug = 'super-long-app-workspace-slug-for-testing-purpose';
    const siteId = deriveSiteId(longProject, longSlug);
    expect(siteId.length).toBeLessThanOrEqual(30);
    expect(siteId).toMatch(/^[a-z0-9][a-z0-9-]{2,28}[a-z0-9]$/);
  });

  test('validates valid and invalid site IDs', () => {
    expect(validateSiteId('valid-site-123')).toBe('valid-site-123');
    expect(() => validateSiteId('ab')).toThrow('site_id');
    expect(() => validateSiteId('Invalid-Capital')).toThrow('site_id');
    expect(() => validateSiteId('trailing-dash-')).toThrow('site_id');
    expect(() => validateSiteId('-leading-dash')).toThrow('site_id');
    expect(() =>
      validateSiteId('this-site-id-is-way-too-long-to-be-valid-in-firebase'),
    ).toThrow('site_id');
  });
});

describe('plans make every effect and target explicit', () => {
  test('root config plan targets google.project.json', () => {
    const plan = configPlan(config);
    expect(plan.effect).toBe('local-write');
    expect(plan.target).toBe('google.project.json');
    expect(plan.commands).toEqual([]);
    expect(plan.notes.join(' ')).toContain('Write root configuration');
  });

  test('provision creates shared Firebase project without linking billing', () => {
    const plan = provisionPlan(config, './node_modules/.bin/firebase');
    expect(plan.effect).toBe('remote-write');
    expect(plan.commands).toEqual([
      [
        './node_modules/.bin/firebase',
        'projects:create',
        'small-google-app-dev',
        '--display-name',
        'Small Google App',
        '--non-interactive',
      ],
    ]);
    expect(plan.notes.join(' ')).toContain('Does not link a billing account');
  });

  test('sites plan targets hosting site creation', () => {
    const plan = sitesPlan(
      config,
      'firebase',
      ['welcome', 'example-crm'],
      'welcome',
    );
    const siteId = config.sites['welcome']!;
    expect(plan.effect).toBe('remote-write');
    expect(plan.commands).toEqual([
      [
        'firebase',
        'hosting:sites:create',
        siteId,
        '--project',
        'small-google-app-dev',
        '--non-interactive',
      ],
    ]);
  });

  test('deploy targets specific app site and project', () => {
    const plan = deployPlan(config, 'firebase', 'example-crm');
    const siteId = config.sites['example-crm']!;
    expect(plan.target).toBe(
      `apps/example-crm on Firebase Hosting site ${siteId} in project small-google-app-dev`,
    );
    expect(plan.commands.at(-1)).toEqual([
      'firebase',
      'deploy',
      '--only',
      `hosting:${siteId}`,
      '--project',
      'small-google-app-dev',
      '--non-interactive',
    ]);
  });

  test('deploy-all targets every app site sequentially', () => {
    const plan = deployAllPlan(config, 'firebase', ['welcome', 'example-crm']);
    expect(plan.effect).toBe('deploy');
    expect(plan.commands.length).toBe(4); // 2 build + 2 deploy
    expect(plan.commands[0]).toEqual([
      'bun',
      'run',
      '--cwd',
      'apps/welcome',
      'build',
    ]);
    expect(plan.commands[1]).toEqual([
      'firebase',
      'deploy',
      '--only',
      `hosting:${config.sites['welcome']}`,
      '--project',
      'small-google-app-dev',
      '--non-interactive',
    ]);
  });

  test('sites:destroy deletes one hosting site without deleting project', () => {
    const plan = sitesDestroyPlan(config, 'firebase', 'welcome');
    const siteId = config.sites['welcome']!;
    expect(plan.effect).toBe('destructive-remote-write');
    expect(plan.commands).toEqual([
      [
        'firebase',
        'hosting:sites:delete',
        siteId,
        '--project',
        'small-google-app-dev',
        '--force',
        '--non-interactive',
      ],
    ]);
    expect(plan.notes.join(' ')).toContain(
      'Project small-google-app-dev remains intact',
    );
  });

  test('destroy deletes the exact whole project', () => {
    expect(destroyPlan(config, 'gcloud')).toMatchObject({
      effect: 'destructive-remote-write',
      target: 'Entire Google Cloud project small-google-app-dev',
      commands: [
        ['gcloud', 'projects', 'delete', 'small-google-app-dev', '--quiet'],
      ],
    });
  });
});

describe('root configuration path', () => {
  test('locates configuration at repository root', () => {
    expect(rootConfigPath()).toBe('google.project.json');
  });
});

describe('apply confirmation', () => {
  test('requires the exact project ID', () => {
    expect(() => requireConfirmation(config)).toThrow(
      '--confirm small-google-app-dev',
    );
    expect(() => requireConfirmation(config, 'another-project')).toThrow(
      '--confirm small-google-app-dev',
    );
    expect(() =>
      requireConfirmation(config, 'small-google-app-dev'),
    ).not.toThrow();
  });
});
