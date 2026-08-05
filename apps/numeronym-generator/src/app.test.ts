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

  test('parses full phrases correctly', () => {
    expect(generatePhraseNumeronym('Techlahoma Google Apps Starter')).toBe(
      'T8a G4e A2s S5r',
    );
    expect(generatePhraseNumeronym('Hello World!')).toBe('H3o W3d!');
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
});
