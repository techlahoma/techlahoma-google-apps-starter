import {describe, expect, test} from 'bun:test';
import {readyMessage} from './app';

describe('starter app', () => {
  test('announces the generated app title', () => {
    expect(readyMessage('Gargantua')).toBe('Gargantua is ready.');
  });
});
