import type { AnswerDef } from '@/lib/game-engine/types';
import { compactKey, normalizeAnswer } from './normalize';
import { editDistance } from './distance';

export type MatchConfidence = 'EXACT' | 'ALIAS' | 'FUZZY';

export interface MatchResult {
  answer: AnswerDef;
  confidence: MatchConfidence;
  /** Edit distance for fuzzy matches, 0 otherwise. */
  distance: number;
}

/** How many edits we tolerate for a candidate string of the given (normalised) length. */
export function fuzzyTolerance(length: number): number {
  if (length < 5) return 0;
  if (length < 9) return 1;
  return 2;
}

/**
 * Finds the accepted answer that a submission refers to.
 *
 * Order of trust:
 *  1. exact normalised match on canonical text
 *  2. exact normalised match on an alias (or the space-less compact form)
 *  3. a *unique* near-miss (bounded edit distance) against canonical/aliases
 *
 * Fuzzy matching never fires for short strings and never when two different answers are
 * equally close. The host can always override.
 */
export function matchAnswer(input: string, answers: AnswerDef[]): MatchResult | null {
  const norm = normalizeAnswer(input);
  if (!norm) return null;
  const compact = compactKey(input);

  for (const answer of answers) {
    if (normalizeAnswer(answer.canonical) === norm) return { answer, confidence: 'EXACT', distance: 0 };
  }
  for (const answer of answers) {
    if (compactKey(answer.canonical) === compact) return { answer, confidence: 'ALIAS', distance: 0 };
    for (const alias of answer.aliases) {
      if (normalizeAnswer(alias) === norm || compactKey(alias) === compact) {
        return { answer, confidence: 'ALIAS', distance: 0 };
      }
    }
  }

  const tolerance = fuzzyTolerance(norm.length);
  if (tolerance === 0) return null;

  let best: { answer: AnswerDef; distance: number } | null = null;
  let tie = false;
  for (const answer of answers) {
    const variants = [answer.canonical, ...answer.aliases];
    let answerBest = Infinity;
    for (const v of variants) {
      const vn = normalizeAnswer(v);
      if (!vn) continue;
      // Length gate keeps "iran" from matching "iraq" (both too short) and stops runaway diffs.
      if (Math.abs(vn.length - norm.length) > tolerance) continue;
      const d = editDistance(norm, vn);
      if (d < answerBest) answerBest = d;
    }
    if (answerBest <= tolerance) {
      if (!best || answerBest < best.distance) {
        best = { answer, distance: answerBest };
        tie = false;
      } else if (answerBest === best.distance && best.answer.id !== answer.id) {
        tie = true;
      }
    }
  }
  if (best && !tie) return { answer: best.answer, confidence: 'FUZZY', distance: best.distance };
  return null;
}

/** Returns alias conflicts across answers (same normalised text attached to two answers). */
export function findAliasConflicts(answers: Pick<AnswerDef, 'id' | 'canonical' | 'aliases'>[]): { text: string; answerIds: string[] }[] {
  const seen = new Map<string, Set<string>>();
  for (const a of answers) {
    for (const v of [a.canonical, ...a.aliases]) {
      const key = normalizeAnswer(v);
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(a.id);
    }
  }
  return [...seen.entries()].filter(([, ids]) => ids.size > 1).map(([text, ids]) => ({ text, answerIds: [...ids] }));
}
