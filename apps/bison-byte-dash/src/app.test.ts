import {describe, expect, test} from 'bun:test';
import {readyMessage} from './app';

describe('starter app', () => {
  test('announces the generated app title', () => {
    expect(readyMessage('Bison Byte Dash')).toBe('Bison Byte Dash is ready.');
  });
});
