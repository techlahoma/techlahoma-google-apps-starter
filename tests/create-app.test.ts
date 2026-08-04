import {describe, expect, test} from 'bun:test';
import {
  makeAppPlan,
  renderAppTemplate,
  validateAppDefinition,
} from '../scripts/create-app-lib';

describe('app workspace generator', () => {
  test('plans one app under apps', () => {
    const definition = validateAppDefinition({
      slug: 'bison-byte-dash',
      title: 'Bison Byte Dash',
    });
    expect(makeAppPlan(definition)).toEqual({
      effect: 'local-write',
      target: 'apps/bison-byte-dash',
      template: 'templates/vite-app',
      slug: 'bison-byte-dash',
      title: 'Bison Byte Dash',
    });
  });

  test('rejects unsafe or ambiguous names', () => {
    for (const slug of [
      '../outside',
      'Uppercase',
      '-leading',
      'two--hyphens',
    ]) {
      expect(() => validateAppDefinition({slug, title: 'Safe title'})).toThrow(
        'name',
      );
    }
  });

  test('renders all template tokens', () => {
    expect(
      renderAppTemplate('__APP_TITLE__ at apps/__APP_SLUG__', {
        slug: 'room-pulse',
        title: 'Room Pulse',
      }),
    ).toBe('Room Pulse at apps/room-pulse');
  });
});
