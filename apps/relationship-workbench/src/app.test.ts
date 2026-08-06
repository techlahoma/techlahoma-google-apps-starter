import {describe, expect, test} from 'bun:test';
import {readyMessage} from './app';

describe('starter app', () => {
  test('announces the generated app title', () => {
    expect(readyMessage('Relationship Workbench')).toBe(
      'Relationship Workbench is ready.',
    );
  });
});
