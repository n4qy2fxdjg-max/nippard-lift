import { describe, expect, it } from 'vitest';
import { findAliasConflicts, matchAnswer, normalizeAnswer } from '@/lib/matching';
import { answer } from './fixtures';

describe('normalizeAnswer', () => {
  it('strips case, accents, punctuation, articles and whitespace', () => {
    expect(normalizeAnswer('  The   Côte d’Ivoire! ')).toBe('cote divoire');
    expect(normalizeAnswer('U.S.A.')).toBe('u s a');
    expect(normalizeAnswer('Rock & Roll')).toBe('rock and roll');
  });
});

describe('matchAnswer', () => {
  const answers = [answer('United States', 60, { aliases: ['USA', 'United States of America', 'U.S.A.'] }), answer('Iran', 10), answer('Iraq', 12), answer('Christopher Nolan', 30), answer('Christopher Nolen', 30)];
  it('matches canonical and aliases exactly', () => {
    expect(matchAnswer('united states', answers)?.confidence).toBe('EXACT');
    expect(matchAnswer('usa', answers)?.confidence).toBe('ALIAS');
    expect(matchAnswer('U S A', answers)?.answer.canonical).toBe('United States');
  });
  it('tolerates one typo in long answers', () => {
    expect(matchAnswer('United Staets', answers)?.answer.canonical).toBe('United States');
  });
  it('never fuzzy-matches short, confusable answers', () => {
    expect(matchAnswer('Irak', answers)).toBeNull();
    expect(matchAnswer('Irn', answers)).toBeNull();
  });
  it('refuses ambiguous fuzzy matches', () => {
    expect(matchAnswer('Christopher Nolin', answers)).toBeNull();
  });
  it('does not accept gibberish', () => {
    expect(matchAnswer('xyzzy', answers)).toBeNull();
    expect(matchAnswer('', answers)).toBeNull();
  });
});

describe('findAliasConflicts', () => {
  it('reports the same text on two answers', () => {
    const c = findAliasConflicts([answer('Holland', 10, { aliases: ['Netherlands'] }), answer('Netherlands', 20)]);
    expect(c).toHaveLength(1);
    expect(c[0].text).toBe('netherlands');
  });
});
