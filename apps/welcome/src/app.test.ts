import {describe, expect, test} from 'bun:test';
import {markReady} from './app';

describe('welcome app', () => {
  test('marks the app root ready', () => {
    const element = {dataset: {}} as HTMLElement;
    markReady(element);
    expect(element.dataset.ready).toBe('true');
  });
});
