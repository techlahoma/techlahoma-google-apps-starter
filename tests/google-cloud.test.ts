import {describe, expect, test} from 'bun:test';
import {
  appConfigPath,
  configPlan,
  deployPlan,
  destroyPlan,
  makeConfig,
  provisionPlan,
  requireConfirmation,
  validateConfig,
} from '../scripts/google-cloud-lib';

const config = makeConfig({
  projectId: 'small-google-app-dev',
  displayName: 'Small Google App',
});

describe('Google project configuration', () => {
  test('creates the static-only default', () => {
    expect(config).toEqual({
      schema_version: 1,
      project_id: 'small-google-app-dev',
      display_name: 'Small Google App',
      environment: 'development',
      region: 'us-central1',
      features: ['hosting'],
    });
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
});

describe('plans make every effect and target explicit', () => {
  test('local config plan contains no command', () => {
    expect(configPlan(config, 'example-crm')).toEqual({
      effect: 'local-write',
      target: 'apps/example-crm/google.project.json',
      commands: [],
      notes: [
        'Write local configuration for small-google-app-dev and app example-crm.',
        'apps/example-crm/google.project.json is ignored by Git and contains no credentials.',
      ],
    });
  });

  test('provision creates Firebase without linking billing', () => {
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

  test('deploy targets Hosting and an explicit project', () => {
    const plan = deployPlan(config, 'firebase', 'example-crm');
    expect(plan.target).toBe(
      'apps/example-crm on Firebase Hosting project small-google-app-dev',
    );
    expect(plan.commands.at(-1)).toEqual([
      'firebase',
      'deploy',
      '--only',
      'hosting',
      '--project',
      'small-google-app-dev',
      '--non-interactive',
    ]);
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

describe('app-scoped configuration', () => {
  test('locates configuration inside the selected workspace', () => {
    expect(appConfigPath('room-pulse')).toBe(
      'apps/room-pulse/google.project.json',
    );
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
