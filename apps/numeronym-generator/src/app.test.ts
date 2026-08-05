import {describe, expect, test} from 'bun:test';
import {
  generateWordNumeronym,
  generatePhraseNumeronym,
  getNumeronymBreakdown,
} from './app';

describe('Numeronym Generator Core', () => {
  test('generates classic numeronyms correctly', () => {
    expect(generateWordNumeronym('kubernetes')).toBe('k8s');
    expect(generateWordNumeronym('internationalization')).toBe('i18n');
    expect(generateWordNumeronym('accessibility')).toBe('a11y');
    expect(generateWordNumeronym('localization')).toBe('l10n');
  });

  test('preserves casing and punctuation', () => {
    expect(generateWordNumeronym('Kubernetes')).toBe('K8s');
    expect(generateWordNumeronym('ACCESSIBILITY')).toBe('A11Y');
    expect(generateWordNumeronym('hello,')).toBe('h3o,');
  });

  test('handles short words based on minLength', () => {
    expect(generateWordNumeronym('hi', 3)).toBe('hi');
    expect(generateWordNumeronym('cat', 3)).toBe('c1t');
    expect(generateWordNumeronym('cat', 4)).toBe('cat');
  });

  test('collapses multi-word phrases correctly (e.g. Andreessen Horowitz -> A16Z)', () => {
    expect(generatePhraseNumeronym('Andreessen Horowitz')).toBe('A16Z');
    expect(generatePhraseNumeronym('andreessen horowitz')).toBe('a16z');
    expect(generatePhraseNumeronym('Andrew Horowitz')).toBe('A12Z');
    expect(generatePhraseNumeronym('Techlahoma Google Apps Starter')).toBe(
      'T25R',
    );
  });

  test('supports per-word mode when explicitly specified', () => {
    expect(
      generatePhraseNumeronym('Techlahoma Google Apps Starter', 3, 'word'),
    ).toBe('T8a G4e A2s S5r');
    expect(generatePhraseNumeronym('Hello World!', 3, 'word')).toBe('H3o W3d!');
  });

  test('returns accurate breakdown structure', () => {
    const breakdown = getNumeronymBreakdown('internationalization');
    expect(breakdown.isEligible).toBe(true);
    expect(breakdown.firstChar).toBe('i');
    expect(breakdown.middleCount).toBe(18);
    expect(breakdown.middleText).toBe('nternationalizatio');
    expect(breakdown.lastChar).toBe('n');
    expect(breakdown.numeronym).toBe('i18n');
  });

  test('returns accurate collapsed breakdown structure for phrase', () => {
    const breakdown = getNumeronymBreakdown(
      'Andreessen Horowitz',
      3,
      'collapse',
    );
    expect(breakdown.isEligible).toBe(true);
    expect(breakdown.firstChar).toBe('A');
    expect(breakdown.middleCount).toBe(16);
    expect(breakdown.lastChar).toBe('Z');
    expect(breakdown.numeronym).toBe('A16Z');
  });
});
