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
  mode: 'collapse' | 'word';
  wordCount: number;
}

/**
 * Generates a numeronym for a single word or token.
 * E.g., "kubernetes" -> "k8s", "Accessibility" -> "A11y".
 */
export function generateWordNumeronym(
  word: string,
  minLength: number = 3,
): string {
  const breakdown = getNumeronymBreakdown(word, minLength, 'word');
  return breakdown.numeronym;
}

/**
 * Generates a single collapsed numeronym for a full phrase.
 * E.g., "Andreessen Horowitz" -> "A16Z", "hello world" -> "h8d".
 */
export function generateCollapsedPhraseNumeronym(
  text: string,
  minLength: number = 3,
): string {
  const breakdown = getNumeronymBreakdown(text, minLength, 'collapse');
  return breakdown.numeronym;
}

/**
 * Parses full text or sentences, replacing eligible words or collapsing phrase.
 */
export function generatePhraseNumeronym(
  text: string,
  minLength: number = 3,
  mode: 'collapse' | 'word' = 'collapse',
): string {
  if (!text) return '';
  if (mode === 'collapse') {
    return generateCollapsedPhraseNumeronym(text, minLength);
  }
  // Match word boundaries while preserving whitespace and punctuation
  return text.replace(/[a-zA-Z0-9]+/g, match => {
    return generateWordNumeronym(match, minLength);
  });
}

/**
 * Provides step-by-step breakdown data for a given word or phrase token.
 */
export function getNumeronymBreakdown(
  token: string,
  minLength: number = 3,
  mode: 'collapse' | 'word' = 'collapse',
): NumeronymBreakdown {
  const trimmedToken = token.trim();
  const words = trimmedToken.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (mode === 'word' || wordCount <= 1) {
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
        mode,
        wordCount,
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
        mode,
        wordCount,
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
      mode: 'word',
      wordCount,
    };
  }

  // Collapsed Phrase Breakdown (multi-word)
  const match = token.match(/^([^a-zA-Z0-9]*)([\s\S]+?)([^a-zA-Z0-9]*)$/);
  const prefix = match ? (match[1] ?? '') : '';
  const suffix = match ? (match[3] ?? '') : '';
  const core = match ? (match[2] ?? token) : token;

  const letters = core.match(/[a-zA-Z0-9]/g) || [];

  if (letters.length < minLength || letters.length <= 2) {
    return {
      original: token,
      prefix,
      firstChar: core,
      middleText: '',
      middleCount: 0,
      lastChar: '',
      suffix,
      numeronym: token,
      isEligible: false,
      mode: 'collapse',
      wordCount,
    };
  }

  const firstChar = letters[0] ?? '';
  let lastChar = letters[letters.length - 1] ?? '';

  // If first char is uppercase and phrase contains multiple words, uppercase the last char for standard phrase numeronyms (e.g. Andreessen Horowitz -> A16Z)
  if (/^[A-Z]$/.test(firstChar) && wordCount > 1) {
    lastChar = lastChar.toUpperCase();
  }

  const middleLetters = letters.slice(1, -1);
  const middleText = middleLetters.join('');
  const middleCount = middleLetters.length;
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
    mode: 'collapse',
    wordCount,
  };
}
