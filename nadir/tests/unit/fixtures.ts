import type { AnswerDef, EngineContext, FinalCategoryDef, GameConfig, QuestionDef } from '@/lib/game-engine/types';
import { DEFAULT_CONFIG, defaultRoundPlans } from '@/lib/game-engine/types';
import { createInitialState } from '@/lib/game-engine/engine';

let seq = 0;
const id = (p: string) => `${p}_${++seq}`;

export function answer(canonical: string, score: number, extra: Partial<AnswerDef> = {}): AnswerDef {
  return { id: id('a'), poolIndex: 0, canonical, aliases: [], score, correct: true, ...extra };
}

export function openQuestion(category = 'Geography', text = 'Name a country beginning with B'): QuestionDef {
  return {
    id: id('q'),
    category,
    text,
    instructions: 'Sovereign states only.',
    format: 'OPEN',
    difficulty: 2,
    explanation: '',
    settings: {},
    boardItems: [],
    answers: [
      answer('Brazil', 52, { aliases: ['Brasil'] }),
      answer('Belgium', 31),
      answer('Bahrain', 8),
      answer('Belize', 4),
      answer('Benin', 1),
      answer('Brunei', 0, { aliases: ['Brunei Darussalam'] }),
      answer('Bavaria', 100, { correct: false }),
    ],
  };
}

export function boardQuestion(): QuestionDef {
  const q: QuestionDef = { id: id('q'), category: 'Film', text: 'Pick a film that won Best Picture', instructions: '', format: 'BOARD', difficulty: 2, explanation: '', settings: { boardColumns: 3 }, boardItems: [], answers: [] };
  const items = ['Moonlight', 'Parasite', 'Inception', 'Nomadland', 'Heat', 'Spotlight'];
  const scores: Record<string, number | null> = { Moonlight: 20, Parasite: 35, Inception: null, Nomadland: 0, Heat: null, Spotlight: 7 };
  items.forEach((label, i) => {
    const bid = id('b');
    q.boardItems.push({ id: bid, kind: 'TEXT', label, clue: '', decoy: scores[label] === null, sortOrder: i });
    if (scores[label] !== null) q.answers.push(answer(label, scores[label]!, { boardItemId: bid }));
  });
  return q;
}

export function linkedQuestion(): QuestionDef {
  return {
    id: id('q'),
    category: 'Film',
    text: 'Batman and Superman actors',
    instructions: '',
    format: 'LINKED',
    difficulty: 3,
    explanation: '',
    settings: { poolLabels: ['Played Batman', 'Played Superman'] },
    boardItems: [],
    answers: [answer('Christian Bale', 40), answer('Val Kilmer', 5), answer('Henry Cavill', 44, { poolIndex: 1 }), answer('Brandon Routh', 2, { poolIndex: 1 })],
  };
}

export function finalCategory(): FinalCategoryDef {
  const p1 = openQuestion('Film', 'Films starring actor X');
  const p2 = openQuestion('Film', 'Films directed by Y');
  return { id: id('fc'), title: 'Movies of the 1990s', description: '', prompts: [p1, p2] };
}

export function makeGame(teamCount = 4, passes = 1) {
  const questions: QuestionDef[] = [];
  const rounds = defaultRoundPlans(teamCount, passes);
  for (const r of rounds) {
    if (r.type === 'ELIMINATION') {
      for (let p = 0; p < passes; p++) {
        const q = openQuestion();
        questions.push(q);
        r.questionIds.push(q.id);
      }
      const tb1 = openQuestion('Tie', 'TB1');
      const tb2 = openQuestion('Tie', 'TB2');
      questions.push(tb1, tb2);
      r.tiebreakQuestionIds.push(tb1.id, tb2.id);
    } else if (r.type === 'HEAD_TO_HEAD') {
      for (let i = 0; i < 5; i++) {
        const q = openQuestion('H2H', `H2H ${i}`);
        questions.push(q);
        r.questionIds.push(q.id);
      }
    }
  }
  const cat = finalCategory();
  rounds[rounds.length - 1].finalCategoryIds.push(cat.id);
  const config: GameConfig = { ...DEFAULT_CONFIG, rounds };
  const teams = Array.from({ length: teamCount }, (_, i) => ({ id: `team${i + 1}`, name: `Team ${i + 1}`, color: '#fff', players: [{ id: `p${i}`, name: `Player ${i}` }] }));
  const state = createInitialState({ id: 'g1', name: 'Test', roomCode: 'ABCDE', config, teams, jackpotAmount: 1000, now: 1000 });
  const ctx: EngineContext = { questions: Object.fromEntries(questions.map((q) => [q.id, q])), finalCategories: { [cat.id]: cat }, now: 1000 };
  return { state, ctx, questions, cat };
}
