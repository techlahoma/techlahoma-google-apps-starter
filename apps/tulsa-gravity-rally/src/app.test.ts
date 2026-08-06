import {describe, expect, test} from 'bun:test';
import {readyMessage} from './app';

describe('starter app', () => {
  test('announces the generated app title', () => {
    expect(readyMessage('Tulsa Gravity Rally')).toBe(
      'Tulsa Gravity Rally is ready.',
    );
  });
});
