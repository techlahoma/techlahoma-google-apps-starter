import {describe, expect, test} from 'bun:test';
import {getAppSubtitle} from './app';

describe('Tulsa Gravity Rally App Domain', () => {
  test('returns the correct subtitle location branding', () => {
    expect(getAppSubtitle()).toContain('Gradient Landmark');
    expect(getAppSubtitle()).toContain('12 N Cheyenne Ave');
  });
});
