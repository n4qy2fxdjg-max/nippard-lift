/**
 * Question selection for new games: MANUAL (host picks), RANDOM, SMART_RANDOM
 * (diversifies category, format and difficulty and avoids recently used questions).
 */
import type { QuestionFormat, RoundPlan } from '@/lib/game-engine/types';

export interface SelectableQuestion {
  id: string;
  category: string;
  format: QuestionFormat;
  difficulty: number;
  usedCount: number;
  status: string;
}

export type SelectionMode = 'MANUAL' | 'RANDOM' | 'SMART_RANDOM';

const H2H_FORMATS: QuestionFormat[] = ['PICTURE', 'CLUES', 'PARTIAL', 'BOARD'];

export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickSmart(pool: SelectableQuestion[], used: Set<string>, recentCategories: string[], recentFormats: QuestionFormat[], preferFormats: QuestionFormat[] | null, rnd: () => number): SelectableQuestion | null {
  const candidates = pool.filter((q) => !used.has(q.id));
  if (candidates.length === 0) return null;
  const scored = candidates.map((q) => {
    let score = rnd(); // base randomness
    if (recentCategories.slice(-2).includes(q.category)) score -= 2;
    if (recentFormats.slice(-1).includes(q.format)) score -= 1;
    if (preferFormats && preferFormats.includes(q.format)) score += 1.5;
    score -= Math.min(q.usedCount, 5) * 0.4;
    const prevDiff = recentCategories.length; // gently ramp difficulty as the game progresses
    if (q.difficulty === Math.min(5, 1 + Math.floor(prevDiff / 2))) score += 0.5;
    return { q, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].q;
}

export function fillRoundPlans(plans: RoundPlan[], pool: SelectableQuestion[], mode: SelectionMode, seed = Date.now()): RoundPlan[] {
  if (mode === 'MANUAL') return plans;
  const rnd = seededRandom(seed);
  const used = new Set<string>(plans.flatMap((p) => [...p.questionIds, ...p.tiebreakQuestionIds]));
  const recentCategories: string[] = [];
  const recentFormats: QuestionFormat[] = [];
  const ready = pool.filter((q) => q.status === 'READY' || q.status === 'USED');
  const pickRandom = (prefer: QuestionFormat[] | null) => {
    const cands = ready.filter((q) => !used.has(q.id) && (!prefer || prefer.includes(q.format)));
    const fallback = cands.length ? cands : ready.filter((q) => !used.has(q.id));
    if (!fallback.length) return null;
    return fallback[Math.floor(rnd() * fallback.length)];
  };
  const take = (prefer: QuestionFormat[] | null) => {
    const q = mode === 'SMART_RANDOM' ? pickSmart(ready, used, recentCategories, recentFormats, prefer, rnd) : pickRandom(prefer);
    if (!q) return null;
    used.add(q.id);
    recentCategories.push(q.category);
    recentFormats.push(q.format);
    return q.id;
  };
  return plans.map((plan) => {
    const p = { ...plan, questionIds: [...plan.questionIds], tiebreakQuestionIds: [...plan.tiebreakQuestionIds] };
    if (p.type === 'ELIMINATION') {
      while (p.questionIds.length < p.passes) {
        const id = take(null);
        if (!id) break;
        p.questionIds.push(id);
      }
      while (p.tiebreakQuestionIds.length < 1) {
        const id = take(['OPEN']);
        if (!id) break;
        p.tiebreakQuestionIds.push(id);
      }
    } else if (p.type === 'HEAD_TO_HEAD') {
      const needed = p.bestOf + 2; // spare questions for tied H2H questions
      while (p.questionIds.length < needed) {
        const id = take(H2H_FORMATS);
        if (!id) break;
        p.questionIds.push(id);
      }
    }
    return p;
  });
}
