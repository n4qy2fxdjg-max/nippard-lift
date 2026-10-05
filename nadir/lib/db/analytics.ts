import { prisma } from './prisma';

export async function computeAnalytics() {
  const [games, completed, answers, questionsUsed, teams] = await Promise.all([
    prisma.game.count(),
    prisma.game.findMany({ where: { status: 'COMPLETED' }, select: { id: true, finalJackpot: true, jackpotWon: true, zeroCount: true, currency: true } }),
    prisma.gameAnswer.findMany({ select: { questionId: true, score: true, correct: true, isZero: true, stage: true, question: { select: { category: true, text: true, format: true } } } }),
    prisma.question.findMany({ where: { usedCount: { gt: 0 } }, select: { id: true, text: true, category: true, usedCount: true }, orderBy: { usedCount: 'desc' }, take: 10 }),
    prisma.team.count(),
  ]);
  const byCategory = new Map<string, number>();
  const byQuestion = new Map<string, { text: string; category: string; scores: number[]; zeros: number; incorrect: number }>();
  for (const a of answers) {
    byCategory.set(a.question.category, (byCategory.get(a.question.category) ?? 0) + 1);
    const q = byQuestion.get(a.questionId) ?? { text: a.question.text, category: a.question.category, scores: [], zeros: 0, incorrect: 0 };
    q.scores.push(a.score);
    if (a.isZero) q.zeros++;
    if (!a.correct) q.incorrect++;
    byQuestion.set(a.questionId, q);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const questionStats = [...byQuestion.entries()].map(([id, q]) => ({ id, text: q.text, category: q.category, plays: q.scores.length, averageScore: Math.round(avg(q.scores)), zeros: q.zeros, incorrectRate: q.scores.length ? q.incorrect / q.scores.length : 0 }));
  const finals = completed.filter((g) => g.jackpotWon !== null);
  return {
    gamesPlayed: games,
    gamesCompleted: completed.length,
    teamsPlayed: teams,
    answersGiven: answers.length,
    averageAnswerScore: Math.round(avg(answers.map((a) => a.score))),
    zeroAnswers: answers.filter((a) => a.isZero).length,
    finalWinRate: finals.length ? finals.filter((g) => g.jackpotWon).length / finals.length : null,
    averageJackpot: completed.length ? Math.round(avg(completed.map((g) => g.finalJackpot ?? 0))) : null,
    mostPlayedCategories: [...byCategory.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    mostUsedQuestions: questionsUsed,
    hardestQuestions: [...questionStats].filter((q) => q.plays >= 2).sort((a, b) => b.averageScore - a.averageScore).slice(0, 8),
    easiestQuestions: [...questionStats].filter((q) => q.plays >= 2).sort((a, b) => a.averageScore - b.averageScore).slice(0, 8),
  };
}
