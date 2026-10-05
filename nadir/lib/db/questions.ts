import { prisma, json } from './prisma';
import type { AnswerDef, BoardItemDef, FinalCategoryDef, QuestionDef, QuestionFormat, QuestionSettings } from '@/lib/game-engine/types';
import type { Prisma } from '@/lib/generated/prisma/client';

export type QuestionRow = Prisma.QuestionGetPayload<{ include: { answers: true; boardItems: { include: { mediaAsset: true } }; mediaAsset: true } }>;

export const questionInclude = { answers: { orderBy: { sortOrder: 'asc' as const } }, boardItems: { orderBy: { sortOrder: 'asc' as const }, include: { mediaAsset: true } }, mediaAsset: true } satisfies Prisma.QuestionInclude;

export function toQuestionDef(row: QuestionRow): QuestionDef {
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    instructions: row.instructions,
    format: row.format as QuestionFormat,
    difficulty: row.difficulty,
    explanation: row.explanation,
    settings: json.parse<QuestionSettings>(row.settingsJson, {}),
    mediaUrl: row.mediaAsset?.url ?? null,
    answers: row.answers.map<AnswerDef>((a) => ({ id: a.id, poolIndex: a.poolIndex, canonical: a.canonical, aliases: json.parse<string[]>(a.aliasesJson, []), score: a.score, correct: a.correct, explanation: a.explanation, boardItemId: a.boardItemId })),
    boardItems: row.boardItems.map<BoardItemDef>((b) => ({ id: b.id, kind: b.kind as BoardItemDef['kind'], label: b.label, clue: b.clue, imageUrl: b.mediaAsset?.url ?? null, decoy: b.decoy, sortOrder: b.sortOrder })),
  };
}

export async function loadQuestions(ids: string[]): Promise<Record<string, QuestionDef>> {
  if (ids.length === 0) return {};
  const rows = await prisma.question.findMany({ where: { id: { in: ids } }, include: questionInclude });
  return Object.fromEntries(rows.map((r) => [r.id, toQuestionDef(r)]));
}

export async function loadFinalCategories(ids: string[]): Promise<Record<string, FinalCategoryDef>> {
  if (ids.length === 0) return {};
  const rows = await prisma.finalCategory.findMany({ where: { id: { in: ids } }, include: { prompts: { orderBy: { sortOrder: 'asc' }, include: { question: { include: questionInclude } } } } });
  return Object.fromEntries(rows.map((c) => [c.id, { id: c.id, title: c.title, description: c.description, prompts: c.prompts.map((p) => toQuestionDef(p.question)) }]));
}

/** Summary fields for the question bank list (never includes answer text/scores in bulk payloads for clients that don't need them). */
export async function listQuestionSummaries(filter: { status?: string; format?: string; category?: string; search?: string } = {}) {
  const rows = await prisma.question.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.format ? { format: filter.format } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.search ? { OR: [{ text: { contains: filter.search } }, { category: { contains: filter.search } }] } : {}),
    },
    include: { answers: { select: { score: true, correct: true } }, _count: { select: { boardItems: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    text: r.text,
    format: r.format as QuestionFormat,
    difficulty: r.difficulty,
    status: r.status,
    answerCount: r.answers.filter((a) => a.correct).length,
    zeroCount: r.answers.filter((a) => a.correct && a.score === 0).length,
    boardItemCount: r._count.boardItems,
    usedCount: r.usedCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
