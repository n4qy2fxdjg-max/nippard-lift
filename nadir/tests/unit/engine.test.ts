import { describe, expect, it } from 'vitest';
import { EngineError, type EngineContext, type GameAction, type GameState } from '@/lib/game-engine/types';
import { isUndoable, reduce } from '@/lib/game-engine/engine';
import { leaderboard, nextStep } from '@/lib/game-engine/selectors';
import { projectDisplay, projectTeam } from '@/lib/game-engine/views';
import { linkedQuestion, makeGame } from './fixtures';

function runner(initial: GameState, ctx: EngineContext) {
  let state = initial;
  let now = ctx.now;
  const history: GameState[] = [];
  const dispatch = (action: GameAction) => {
    now += 1000;
    const c = { ...ctx, now };
    if (isUndoable(action)) history.push(state);
    state = reduce(state, action, c);
    return state;
  };
  const undo = () => {
    state = history.pop()!;
    return state;
  };
  return { get state() { return state; }, dispatch, undo, ctxNow: () => now };
}

/** Plays one team's turn with the given text, through to SCORE_REVEALED. */
function playTurn(r: ReturnType<typeof runner>, text: string) {
  const teamId = r.state.question!.turns[r.state.question!.turnIndex].teamId;
  r.dispatch({ type: 'SUBMIT_ANSWER', teamId, text, by: 'TEAM' });
  r.dispatch({ type: 'LOCK_ANSWER' });
  r.dispatch({ type: 'REVEAL_SCORE' });
  expect(r.state.phase).toBe('REVEALING_SCORE');
  r.dispatch({ type: 'SCORE_REVEAL_COMPLETE' });
  expect(r.state.phase).toBe('SCORE_REVEALED');
}

function toQuestion(r: ReturnType<typeof runner>) {
  while (!['ACCEPTING_ANSWER'].includes(r.state.phase)) r.dispatch({ type: 'ADVANCE' });
}

describe('engine: full elimination round', () => {
  it('runs 4 teams through a pass, eliminates the highest scorer and credits a zero', () => {
    const { state, ctx } = makeGame(4);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    expect(r.state.phase).toBe('INTRO');
    toQuestion(r);
    expect(r.state.phase).toBe('ACCEPTING_ANSWER');
    const order = r.state.question!.turns.map((t) => t.teamId);
    const answers = ['Brazil', 'Brunei', 'Bahrain', 'France'];
    for (let i = 0; i < 4; i++) {
      playTurn(r, answers[i]);
      if (i < 3) r.dispatch({ type: 'NEXT_TEAM' });
    }
    // Zero answer awarded jackpot bonus
    expect(r.state.jackpot.amount).toBe(1250);
    expect(r.state.jackpot.zeroCount).toBe(1);
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('PASS_RESULTS');
    r.dispatch({ type: 'REVEAL_LOW_ANSWERS' });
    r.dispatch({ type: 'REVEAL_HIGH_ANSWERS' });
    const display = projectDisplay(r.state, ctx);
    expect(display.results.low?.[0]).toMatchObject({ canonical: 'Brunei', score: 0 });
    expect(display.results.high?.[0]).toMatchObject({ canonical: 'Brazil', score: 52 });
    r.dispatch({ type: 'END_PASS' });
    expect(r.state.phase).toBe('ROUND_RESULTS');
    expect(r.state.pendingElimination).toMatchObject({ eliminate: [order[3]], tied: [] });
    const lb = leaderboard(r.state);
    expect(lb[0].teamId).toBe(order[1]);
    expect(lb.find((x) => x.teamId === order[3])?.atRisk).toBe(true);
    r.dispatch({ type: 'ELIMINATE' });
    expect(r.state.phase).toBe('ELIMINATION');
    expect(r.state.teams.find((t) => t.id === order[3])?.eliminatedRound).toBe(0);
    r.dispatch({ type: 'NEXT_ROUND' });
    expect(r.state.phase).toBe('ROUND_INTRO');
    expect(r.state.roundIndex).toBe(1);
  });

  it('undo returns to the pre-elimination state', () => {
    const { state, ctx } = makeGame(3);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    ['Brazil', 'Belgium', 'Benin'].forEach((a, i) => {
      playTurn(r, a);
      if (i < 2) r.dispatch({ type: 'NEXT_TEAM' });
    });
    r.dispatch({ type: 'END_PASS' });
    r.dispatch({ type: 'ELIMINATE' });
    expect(r.state.teams.filter((t) => t.eliminatedRound !== null)).toHaveLength(1);
    r.undo();
    expect(r.state.phase).toBe('ROUND_RESULTS');
    expect(r.state.teams.filter((t) => t.eliminatedRound !== null)).toHaveLength(0);
  });

  it('requires a tie-break when teams tie, and resolves it with a fresh question', () => {
    const { state, ctx } = makeGame(3);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    const order = r.state.question!.turns.map((t) => t.teamId);
    ['Benin', 'Brazil', 'Brazil'].forEach((a, i) => {
      playTurn(r, a);
      if (i < 2) r.dispatch({ type: 'NEXT_TEAM' });
    });
    r.dispatch({ type: 'END_PASS' });
    expect(r.state.pendingElimination?.tied.sort()).toEqual([order[1], order[2]].sort());
    expect(() => r.dispatch({ type: 'ELIMINATE' })).toThrow(EngineError);
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('TIEBREAK_INTRO');
    const tbId = state.config.rounds[0].tiebreakQuestionIds[0];
    r.dispatch({ type: 'START_TIEBREAK', questionId: tbId });
    expect(r.state.question?.stage).toBe('TIEBREAK');
    expect(r.state.question?.participantTeamIds.sort()).toEqual([order[1], order[2]].sort());
    toQuestion(r);
    const tbOrder = r.state.question!.turns.map((t) => t.teamId);
    playTurn(r, 'Belize'); // 4
    r.dispatch({ type: 'NEXT_TEAM' });
    playTurn(r, 'Belgium'); // 31 → loses
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('PASS_RESULTS');
    r.dispatch({ type: 'END_PASS' });
    expect(r.state.phase).toBe('ROUND_RESULTS');
    expect(r.state.pendingElimination).toMatchObject({ eliminate: [tbOrder[1]], tied: [] });
    // Tie-break scores never touch the round ledger
    expect(leaderboard(r.state).find((x) => x.teamId === tbOrder[1])?.roundTotal).toBe(52);
    r.dispatch({ type: 'ELIMINATE' });
    expect(r.state.teams.find((t) => t.id === tbOrder[1])?.eliminatedRound).toBe(0);
  });

  it('host overrides: mark incorrect, choose canonical, override score, unlock', () => {
    const { state, ctx } = makeGame(3);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    const teamId = r.state.question!.turns[0].teamId;
    r.dispatch({ type: 'SUBMIT_ANSWER', teamId, text: 'Bruney', by: 'HOST' });
    r.dispatch({ type: 'LOCK_ANSWER' });
    // "Bruney" is a 1-edit fuzzy match of Brunei (6 chars → tolerance 1)
    expect(r.state.question!.submissions[`${teamId}:0`]).toMatchObject({ score: 0, correct: true });
    r.dispatch({ type: 'MARK_INCORRECT' });
    expect(r.state.question!.submissions[`${teamId}:0`]).toMatchObject({ score: 100, correct: false, override: 'INCORRECT' });
    const q = ctx.questions[r.state.question!.questionId];
    const belize = q.answers.find((a) => a.canonical === 'Belize')!;
    r.dispatch({ type: 'MARK_CORRECT', answerId: belize.id });
    expect(r.state.question!.submissions[`${teamId}:0`]).toMatchObject({ score: 4, canonical: 'Belize', override: 'CANONICAL' });
    r.dispatch({ type: 'OVERRIDE_SCORE', score: 9 });
    expect(r.state.question!.submissions[`${teamId}:0`].score).toBe(9);
    r.dispatch({ type: 'UNLOCK_ANSWER' });
    expect(r.state.phase).toBe('ACCEPTING_ANSWER');
  });

  it('rejects out-of-turn and duplicate submissions and hides scores from teams until reveal', () => {
    const { state, ctx } = makeGame(3);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    const [first, second] = r.state.question!.turns.map((t) => t.teamId);
    expect(() => r.dispatch({ type: 'SUBMIT_ANSWER', teamId: second, text: 'Brazil', by: 'TEAM' })).toThrow(/not this team/);
    r.dispatch({ type: 'SUBMIT_ANSWER', teamId: first, text: 'Brazil', by: 'TEAM' });
    r.dispatch({ type: 'SUBMIT_ANSWER', teamId: first, text: 'Brunei', by: 'TEAM' }); // may change before lock
    r.dispatch({ type: 'LOCK_ANSWER' });
    expect(() => r.dispatch({ type: 'SUBMIT_ANSWER', teamId: first, text: 'Belgium', by: 'TEAM' })).toThrow();
    const teamView = projectTeam(r.state, ctx, first);
    expect(teamView.mySubmission?.score).toBeNull();
    const display = projectDisplay(r.state, ctx);
    expect(display.currentSubmission?.score).toBeNull();
    expect(JSON.stringify(display)).not.toContain('"aliases"');
    r.dispatch({ type: 'REVEAL_SCORE' });
    expect(projectDisplay(r.state, ctx).currentSubmission?.score).toBe(0);
  });

  it('supports multiple passes and accumulates scores', () => {
    const { state, ctx } = makeGame(3, 2);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    const order = r.state.question!.turns.map((t) => t.teamId);
    ['Bahrain', 'Belize', 'Brazil'].forEach((a, i) => { playTurn(r, a); if (i < 2) r.dispatch({ type: 'NEXT_TEAM' }); });
    r.dispatch({ type: 'END_PASS' });
    expect(r.state.phase).toBe('QUESTION_INTRO');
    expect(r.state.passIndex).toBe(1);
    toQuestion(r);
    // pass 2 order rotates; answer by team explicitly
    for (let i = 0; i < 3; i++) {
      const teamId = r.state.question!.turns[r.state.question!.turnIndex].teamId;
      const text = teamId === order[0] ? 'Belgium' : teamId === order[1] ? 'Brunei' : 'Benin';
      playTurn(r, text);
      if (i < 2) r.dispatch({ type: 'NEXT_TEAM' });
    }
    r.dispatch({ type: 'END_PASS' });
    expect(r.state.phase).toBe('ROUND_RESULTS');
    const lb = leaderboard(r.state);
    expect(lb.find((x) => x.teamId === order[0])?.roundTotal).toBe(8 + 31);
    expect(lb.find((x) => x.teamId === order[1])?.roundTotal).toBe(4 + 0);
    expect(lb.find((x) => x.teamId === order[2])?.roundTotal).toBe(52 + 1);
    expect(r.state.pendingElimination?.eliminate).toEqual([order[2]]);
  });

  it('linked categories: two turns per team, scores summed', () => {
    const { state, ctx } = makeGame(3);
    const lq = linkedQuestion();
    ctx.questions[lq.id] = lq;
    state.config.rounds[0].questionIds[0] = lq.id;
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    toQuestion(r);
    expect(r.state.question!.turns).toHaveLength(6);
    const teamId = r.state.question!.turns[0].teamId;
    playTurn(r, 'Val Kilmer');
    r.dispatch({ type: 'NEXT_TEAM' });
    expect(r.state.question!.turns[r.state.question!.turnIndex]).toEqual({ teamId, poolIndex: 1 });
    playTurn(r, 'Brandon Routh');
    expect(r.state.roundScores[0][teamId][0]).toBe(7);
  });
});

describe('engine: head-to-head and final', () => {
  function toH2H() {
    const { state, ctx, cat } = makeGame(4);
    const r = runner(state, ctx);
    r.dispatch({ type: 'START_GAME' });
    r.dispatch({ type: 'DEBUG_SKIP_TO_H2H' });
    expect(r.state.phase).toBe('HEAD_TO_HEAD_INTRO');
    return { r, ctx, cat };
  }

  it('plays best-of-three with alternating first answer and tie handling', () => {
    const { r } = toH2H();
    const [a, b] = r.state.h2h!.teamIds;
    expect(() => r.dispatch({ type: 'H2H_NEXT_QUESTION' })).toThrow(/first/);
    r.dispatch({ type: 'H2H_SET_FIRST', teamId: a });
    r.dispatch({ type: 'H2H_NEXT_QUESTION' });
    toQuestion(r);
    expect(r.state.question!.turns.map((t) => t.teamId)).toEqual([a, b]);
    playTurn(r, 'Brazil'); r.dispatch({ type: 'NEXT_TEAM' }); playTurn(r, 'Bahrain');
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('HEAD_TO_HEAD_RESULT');
    expect(r.state.h2h!.points).toEqual({ [a]: 0, [b]: 1 });
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('HEAD_TO_HEAD_INTRO');
    expect(r.state.h2h!.firstTeamId).toBe(b);
    r.dispatch({ type: 'H2H_NEXT_QUESTION' });
    toQuestion(r);
    playTurn(r, 'Belgium'); r.dispatch({ type: 'NEXT_TEAM' }); playTurn(r, 'Belgium');
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.h2h!.results[1].winnerTeamId).toBeNull();
    expect(r.state.h2h!.points).toEqual({ [a]: 0, [b]: 1 });
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'H2H_NEXT_QUESTION' });
    toQuestion(r);
    playTurn(r, 'Brunei'); r.dispatch({ type: 'NEXT_TEAM' }); playTurn(r, 'Brazil');
    // Brunei is a zero → jackpot bonus even in H2H
    expect(r.state.jackpot.amount).toBe(1250);
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.h2h!.points).toEqual({ [a]: 1, [b]: 1 });
    expect(r.state.h2h!.winnerTeamId).toBeNull();
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'H2H_NEXT_QUESTION' });
    toQuestion(r);
    expect(r.state.question!.turns.map((t) => t.teamId)).toEqual([b, a]);
    playTurn(r, 'Belgium'); r.dispatch({ type: 'NEXT_TEAM' }); playTurn(r, 'Benin');
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.h2h!.winnerTeamId).toBe(a);
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('FINAL_INTRO');
    expect(r.state.final?.teamId).toBe(a);
    expect(r.state.teams.filter((t) => t.eliminatedRound === null)).toHaveLength(1);
  });

  it('final: category, timer, three answers, zero wins the jackpot, next game resets', () => {
    const { r, cat } = toH2H();
    r.dispatch({ type: 'DEBUG_SKIP_TO_FINAL' });
    expect(r.state.phase).toBe('FINAL_INTRO');
    const teamId = r.state.final!.teamId;
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('FINAL_CATEGORY_SELECTION');
    expect(nextStep(r.state, { questions: {} }).enabled).toBe(false);
    r.dispatch({ type: 'FINAL_SELECT_CATEGORY', categoryId: cat.id });
    expect(r.state.phase).toBe('FINAL_PROMPTS');
    r.dispatch({ type: 'ADVANCE' }); // reveal prompts
    r.dispatch({ type: 'ADVANCE' }); // start discussion
    expect(r.state.phase).toBe('FINAL_DISCUSSION');
    expect(r.state.timer).toMatchObject({ kind: 'FINAL', running: true, durationMs: 60000 });
    r.dispatch({ type: 'TIMER_PAUSE' });
    expect(r.state.timer.running).toBe(false);
    r.dispatch({ type: 'TIMER_RESUME' });
    r.dispatch({ type: 'ADVANCE' });
    expect(r.state.phase).toBe('FINAL_SUBMISSION');
    r.dispatch({ type: 'FINAL_SUBMIT_ANSWERS', answers: [{ text: 'Brazil' }, { text: 'Belize' }, { text: 'Brunei' }], by: 'TEAM' });
    r.dispatch({ type: 'FINAL_LOCK_ANSWERS' });
    expect(r.state.phase).toBe('FINAL_REVEAL');
    const tv = projectTeam(r.state, { questions: {}, finalCategories: { [cat.id]: cat }, now: 0 }, teamId);
    expect(tv.final?.results.every((x) => x.score === null)).toBe(true);
    r.dispatch({ type: 'FINAL_REVEAL_NEXT' });
    r.dispatch({ type: 'FINAL_REVEAL_COMPLETE' });
    expect(r.state.phase).toBe('FINAL_REVEAL');
    r.dispatch({ type: 'FINAL_REVEAL_NEXT' });
    r.dispatch({ type: 'FINAL_REVEAL_COMPLETE' });
    expect(r.state.jackpot.amount).toBe(1000); // no bonus during the final
    r.dispatch({ type: 'FINAL_REVEAL_NEXT' });
    r.dispatch({ type: 'FINAL_REVEAL_COMPLETE' });
    expect(r.state.phase).toBe('VICTORY');
    expect(r.state.jackpot.won).toBe(true);
    expect(r.state.jackpot.amount).toBe(1000);
    expect(r.state.jackpot.nextGameAmount).toBe(1000);
    r.dispatch({ type: 'END_GAME' });
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.winnerTeamId).toBe(teamId);
  });

  it('final: no zero → defeat and rollover + 1000', () => {
    const { r, cat } = toH2H();
    r.dispatch({ type: 'DEBUG_SKIP_TO_FINAL' });
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'FINAL_SELECT_CATEGORY', categoryId: cat.id });
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'ADVANCE' });
    r.dispatch({ type: 'FINAL_SUBMIT_ANSWERS', answers: [{ text: 'Brazil' }, { text: 'France' }], by: 'HOST' });
    r.dispatch({ type: 'FINAL_LOCK_ANSWERS' });
    expect(r.state.final!.results).toHaveLength(3);
    // host override of an unrevealed answer
    r.dispatch({ type: 'FINAL_OVERRIDE', index: 1, override: 'SCORE', score: 3 });
    for (let i = 0; i < 3; i++) {
      r.dispatch({ type: 'FINAL_REVEAL_NEXT' });
      r.dispatch({ type: 'FINAL_REVEAL_COMPLETE' });
    }
    expect(r.state.phase).toBe('DEFEAT');
    expect(r.state.jackpot.won).toBe(false);
    expect(r.state.jackpot.nextGameAmount).toBe(2000);
  });

  it('debug: force final win/loss', () => {
    const { r } = toH2H();
    r.dispatch({ type: 'DEBUG_FORCE_FINAL', outcome: 'WON' });
    expect(r.state.phase).toBe('VICTORY');
  });
});
