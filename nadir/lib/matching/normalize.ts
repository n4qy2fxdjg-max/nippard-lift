/**
 * Text normalisation used for every comparison between a contestant's answer and the
 * accepted answer universe. Deliberately conservative: it removes noise (case, accents,
 * punctuation, spacing, leading articles) but never changes the words themselves.
 */

const LEADING_ARTICLES = /^(the|a|an)\s+/;

export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizeAnswer(input: string): string {
  let s = stripDiacritics(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`´]/g, '') // apostrophes: "o'brien" -> "obrien"
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
  s = s.replace(LEADING_ARTICLES, '');
  return s;
}

/** Collapses spaces so "ice land" and "iceland" compare equal as a last-resort key. */
export function compactKey(input: string): string {
  return normalizeAnswer(input).replace(/\s+/g, '');
}
