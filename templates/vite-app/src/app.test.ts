import {describe, expect, test} from 'bun:test';
import {readyMessage} from './app';

describe('starter app', () => {
  test('announces the generated app title', () => {
    expect(readyMessage('__APP_TITLE__')).toBe('__APP_TITLE__ is ready.');
  });
});
