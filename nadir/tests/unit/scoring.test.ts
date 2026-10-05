import { describe, expect, it } from 'vitest';
import { applyJackpotIncrease, calculateFinalResult, calculateRoundTotals, combineLinkedScores, getEliminatedTeam, getEliminatedTeams, headToHeadWinner, rankTeams, resolveHeadToHeadQuestion, resolveTie, scoreAnswer, scoreBoardSelection } from '@/lib/scoring';
import { boardQuestion, openQuestion } from './fixtures';

describe('scoreAnswer', () => {
  const q = openQuestion();
  it('correct answer 42-style scores its survey score', () => {
    expect(scoreAnswer('Brazil', q.answers).score).toBe(52);
    expect(scoreAnswer('belgium', q.answers)).toMatchObject({ score: 31, correct: true, isZero: false });
  });
  it('zero answer → 0 and isZero', () => {
    expect(scoreAnswer('Brunei', q.answers)).toMatchObject({ score: 0, correct: true, isZero: true });
  });
  it('incorrect answer → 100', () => {
    expect(scoreAnswer('France', q.answers)).toMatchObject({ score: 100, correct: false, isZero: false });
  });
  it('listed incorrect answer still scores 100', () => {
    expect(scoreAnswer('Bavaria', q.answers)).toMatchObject({ score: 100, correct: false });
  });
  it('aliases, case, punctuation and whitespace are tolerated', () => {
    expect(scoreAnswer('  brasil ', q.answers).canonical).toBe('Brazil');
    expect(scoreAnswer('Brunei Darussalam!', q.answers).score).toBe(0);
  });
  it('respects configured incorrect score', () => {
    expect(scoreAnswer('France', q.answers, 80).score).toBe(80);
  });
});

describe('scoreBoardSelection', () => {
  const q = boardQuestion();
  it('scores a correct card and a decoy', () => {
    const nomad = q.boardItems.find((b) => b.label === 'Nomadland')!;
    const heat = q.boardItems.find((b) => b.label === 'Heat')!;
    expect(scoreBoardSelection(nomad.id, q.answers)).toMatchObject({ score: 0, isZero: true });
    expect(scoreBoardSelection(heat.id, q.answers)).toMatchObject({ score: 100, correct: false });
  });
});

describe('totals and elimination', () => {
  it('sums passes and ignores missing', () => {
    expect(calculateRoundTotals({ a: [12, 4], b: [8, 30], c: [0, null] })).toEqual({ a: 16, b: 38, c: 0 });
  });
  it('eliminates the highest total', () => {
    expect(getEliminatedTeam({ a: 3, b: 17, c: 81 })).toBe('c');
  });
  it('detects ties for elimination', () => {
    const r = getEliminatedTeams({ a: 3, b: 40, c: 40 });
    expect(r.eliminate).toEqual([]);
    expect(r.tied.sort()).toEqual(['b', 'c']);
    expect(r.slots).toBe(1);
    expect(getEliminatedTeam({ a: 3, b: 40, c: 40 })).toBeNull();
  });
  it('handles multi-elimination with a partial tie', () => {
    const r = getEliminatedTeams({ a: 1, b: 50, c: 50, d: 90 }, 2);
    expect(r.eliminate).toEqual(['d']);
    expect(r.tied.sort()).toEqual(['b', 'c']);
    expect(r.slots).toBe(1);
  });
  it('resolveTie picks the worse tie-break score', () => {
    expect(resolveTie({ b: 10, c: 45 })).toMatchObject({ eliminate: ['c'], tied: [] });
    expect(resolveTie({ b: 10, c: 10 }).tied.length).toBe(2);
  });
  it('ranks lower = better with shared ranks', () => {
    expect(rankTeams({ a: 17, b: 3, c: 17 }).map((r) => [r.teamId, r.rank])).toEqual([['b', 1], ['a', 2], ['c', 2]]);
  });
});

describe('linked scoring', () => {
  it('sums by default, supports max/min', () => {
    expect(combineLinkedScores(10, 20)).toBe(30);
    expect(combineLinkedScores(10, 20, 'MAX')).toBe(20);
    expect(combineLinkedScores(10, 20, 'MIN')).toBe(10);
  });
});

describe('jackpot', () => {
  it('zero answer before final adds the bonus', () => {
    expect(applyJackpotIncrease(1000, 250)).toBe(1250);
  });
  it('failed final → next jackpot + 1000', () => {
    const r = calculateFinalResult([{ score: 17, correct: true }, { score: 4, correct: true }, { score: 100, correct: false }], 2750, 1000, 1000);
    expect(r).toMatchObject({ won: false, payout: 0, nextJackpot: 3750 });
  });
  it('won final → jackpot reset to starting jackpot, payout is the jackpot', () => {
    const r = calculateFinalResult([{ score: 17, correct: true }, { score: 0, correct: true }], 4250, 1000, 1000);
    expect(r).toMatchObject({ won: true, payout: 4250, nextJackpot: 1000, zeroCount: 1 });
  });
  it('an incorrect answer with score 0 never counts', () => {
    expect(calculateFinalResult([{ score: 0, correct: false }], 1000, 1000, 1000).won).toBe(false);
  });
});

describe('head-to-head', () => {
  it('lower score wins the point; equal → null', () => {
    expect(resolveHeadToHeadQuestion({ a: 17, b: 8 })).toBe('b');
    expect(resolveHeadToHeadQuestion({ a: 8, b: 8 })).toBeNull();
  });
  it('first to 2 of 3 wins', () => {
    expect(headToHeadWinner({ a: 1, b: 1 }, 3)).toBeNull();
    expect(headToHeadWinner({ a: 2, b: 1 }, 3)).toBe('a');
    expect(headToHeadWinner({ a: 2, b: 2 }, 5)).toBeNull();
    expect(headToHeadWinner({ a: 3, b: 2 }, 5)).toBe('a');
  });
});
