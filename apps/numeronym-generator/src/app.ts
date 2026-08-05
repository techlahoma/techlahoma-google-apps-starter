export interface NumeronymBreakdown {
  original: string;
  prefix: string;
  firstChar: string;
  middleText: string;
  middleCount: number;
  lastChar: string;
  suffix: string;
  numeronym: string;
  isEligible: boolean;
}

/**
 * Generates a numeronym for a single word or token.
 * E.g., "kubernetes" -> "k8s", "Accessibility" -> "A11y".
 */
export function generateWordNumeronym(
  word: string,
  minLength: number = 3,
): string {
  const breakdown = getNumeronymBreakdown(word, minLength);
  return breakdown.numeronym;
}

/**
 * Parses full text or sentences, replacing eligible words with numeronyms.
 */
export function generatePhraseNumeronym(
  text: string,
  minLength: number = 3,
): string {
  if (!text) return '';
  // Match word boundaries while preserving whitespace and punctuation
  return text.replace(/[a-zA-Z0-9]+/g, match => {
    return generateWordNumeronym(match, minLength);
  });
}

/**
 * Provides step-by-step breakdown data for a given word token.
 */
export function getNumeronymBreakdown(
  token: string,
  minLength: number = 3,
): NumeronymBreakdown {
  const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
  if (!match) {
    return {
      original: token,
      prefix: '',
      firstChar: '',
      middleText: '',
      middleCount: 0,
      lastChar: '',
      suffix: '',
      numeronym: token,
      isEligible: false,
    };
  }

  const prefix = match[1] ?? '';
  const coreWord = match[2] ?? '';
  const suffix = match[3] ?? '';

  if (!coreWord || coreWord.length < minLength || coreWord.length <= 2) {
    return {
      original: token,
      prefix,
      firstChar: coreWord,
      middleText: '',
      middleCount: 0,
      lastChar: '',
      suffix,
      numeronym: token,
      isEligible: false,
    };
  }

  const firstChar = coreWord[0] ?? '';
  const lastChar = coreWord[coreWord.length - 1] ?? '';
  const middleText = coreWord.slice(1, -1);
  const middleCount = middleText.length;
  const numeronymCore = `${firstChar}${middleCount}${lastChar}`;
  const numeronym = `${prefix}${numeronymCore}${suffix}`;

  return {
    original: token,
    prefix,
    firstChar,
    middleText,
    middleCount,
    lastChar,
    suffix,
    numeronym,
    isEligible: true,
  };
}
