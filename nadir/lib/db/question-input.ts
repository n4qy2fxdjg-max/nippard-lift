import { z } from 'zod';
import { prisma } from './prisma';
import { QUESTION_FORMATS } from '@/lib/game-engine/types';
import { findAliasConflicts, normalizeAnswer } from '@/lib/matching';
import { HttpError } from '@/lib/util/http';

export const answerInput = z.object({
  id: z.string().optional(),
  poolIndex: z.number().int().min(0).max(1).default(0),
  canonical: z.string().trim().min(1).max(120),
  aliases: z.array(z.string().trim().max(120)).default([]),
  score: z.number().int().min(0).max(100),
  correct: z.boolean().default(true),
  explanation: z.string().max(500).default(''),
  /** Index into boardItems (client side) or an existing board item id. */
  boardItemRef: z.union([z.number().int(), z.string()]).nullable().optional(),
});

export const boardItemInput = z.object({
  id: z.string().optional(),
  kind: z.enum(['TEXT', 'CLUE', 'IMAGE', 'PARTIAL', 'SCRAMBLED']).default('TEXT'),
  label: z.string().max(120).default(''),
  clue: z.string().max(300).default(''),
  imageUrl: z.string().max(2_000_000).nullable().optional(),
  decoy: z.boolean().default(false),
});

export const questionInput = z.object({
  category: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(400),
  instructions: z.string().max(600).default(''),
  format: z.enum(QUESTION_FORMATS as [string, ...string[]]),
  difficulty: z.number().int().min(1).max(5).default(2),
  status: z.enum(['DRAFT', 'READY', 'USED', 'ARCHIVED']).default('DRAFT'),
  explanation: z.string().max(1000).default(''),
  source: z.string().max(500).default(''),
  notes: z.string().max(2000).default(''),
  settings: z.record(z.string(), z.unknown()).default({}),
  mediaUrl: z.string().max(2_000_000).nullable().optional(),
  answers: z.array(answerInput).default([]),
  boardItems: z.array(boardItemInput).default([]),
});

export type QuestionInput = z.infer<typeof questionInput>;

/** Domain validation beyond shape: unique canonicals, alias conflicts, format rules. */
export function validateQuestion(q: QuestionInput, strict: boolean): string[] {
  const problems: string[] = [];
  const correct = q.answers.filter((a) => a.correct);
  const usesBoard = ['BOARD', 'CLUES', 'PICTURE', 'PARTIAL'].includes(q.format);
  for (const pool of [0, 1]) {
    const seen = new Map<string, string>();
    for (const a of q.answers.filter((x) => x.poolIndex === pool)) {
      const key = normalizeAnswer(a.canonical) + (usesBoard && q.format !== 'BOARD' ? `#${String(a.boardItemRef ?? '')}` : '');
      if (seen.has(key)) problems.push(`Duplicate answer "${a.canonical}"`);
      seen.set(key, a.canonical);
    }
    const conflicts = findAliasConflicts(q.answers.filter((x) => x.poolIndex === pool && (!usesBoard || q.format === 'BOARD')).map((a, i) => ({ id: a.id ?? String(i), canonical: a.canonical, aliases: a.aliases })));
    for (const c of conflicts) problems.push(`"${c.text}" is attached to more than one answer`);
  }
  if (strict) {
    if (correct.length === 0) problems.push('Add at least one accepted answer');
    if (q.format === 'LINKED') {
      if (!correct.some((a) => a.poolIndex === 0) || !correct.some((a) => a.poolIndex === 1)) problems.push('Linked questions need accepted answers in both categories');
      const labels = (q.settings.poolLabels as string[] | undefined) ?? [];
      if (labels.length !== 2 || labels.some((l) => !l)) problems.push('Linked questions need two category labels');
    }
    if (usesBoard) {
      if (q.boardItems.length < 2) problems.push('Board formats need at least two cards');
      if (q.format === 'BOARD' && !q.boardItems.some((b) => !b.decoy)) problems.push('A possible-answers board needs at least one correct card');
      if (q.format !== 'BOARD') {
        for (const [i, b] of q.boardItems.entries()) {
          if (!q.answers.some((a) => a.correct && (a.boardItemRef === i || (b.id && a.boardItemRef === b.id)))) problems.push(`Card ${i + 1} (${b.label || b.clue || 'image'}) has no accepted answer`);
        }
      }
      if (q.format === 'PICTURE' && q.boardItems.some((b) => !b.imageUrl)) problems.push('Every picture card needs an image');
      if (q.format === 'PARTIAL' && q.boardItems.some((b) => !b.clue)) problems.push('Every puzzle card needs its masked or scrambled text');
      if (q.format === 'CLUES' && q.boardItems.some((b) => !b.clue && !b.label)) problems.push('Every clue card needs clue text');
    }
  }
  return problems;
}

async function upsertMedia(url: string | null | undefined, alt: string) {
  if (!url) return null;
  const existing = await prisma.mediaAsset.findFirst({ where: { url } });
  if (existing) return existing.id;
  const kind = url.startsWith('data:image/svg') || url.endsWith('.svg') ? 'SVG' : 'IMAGE';
  const created = await prisma.mediaAsset.create({ data: { url, kind, alt, mimeType: url.startsWith('data:') ? url.slice(5, url.indexOf(';')) : null } });
  return created.id;
}

/** Writes a whole question (answers + board items) atomically, replacing children. */
export async function saveQuestion(input: QuestionInput, id?: string): Promise<string> {
  const problems = validateQuestion(input, input.status === 'READY');
  if (problems.length) throw new HttpError(400, problems.join('. '), 'VALIDATION');
  const mediaAssetId = await upsertMedia(input.mediaUrl, input.text);
  const itemMedia = await Promise.all(input.boardItems.map((b) => upsertMedia(b.imageUrl, b.label || b.clue || 'board image')));
  return prisma.$transaction(async (tx) => {
    const data = { category: input.category, text: input.text, instructions: input.instructions, format: input.format, difficulty: input.difficulty, status: input.status, explanation: input.explanation, source: input.source, notes: input.notes, settingsJson: JSON.stringify(input.settings), mediaAssetId };
    const question = id ? await tx.question.update({ where: { id }, data }) : await tx.question.create({ data });
    if (id) {
      await tx.questionAnswer.deleteMany({ where: { questionId: id } });
      await tx.boardItem.deleteMany({ where: { questionId: id } });
    }
    const itemIds: string[] = [];
    for (const [i, b] of input.boardItems.entries()) {
      const item = await tx.boardItem.create({ data: { questionId: question.id, kind: b.kind, label: b.label, clue: b.clue, decoy: b.decoy, sortOrder: i, mediaAssetId: itemMedia[i] } });
      itemIds.push(item.id);
    }
    for (const [i, a] of input.answers.entries()) {
      let boardItemId: string | null = null;
      if (typeof a.boardItemRef === 'number') boardItemId = itemIds[a.boardItemRef] ?? null;
      else if (typeof a.boardItemRef === 'string') {
        const idx = input.boardItems.findIndex((b) => b.id === a.boardItemRef);
        boardItemId = idx >= 0 ? itemIds[idx] : null;
      }
      await tx.questionAnswer.create({ data: { questionId: question.id, poolIndex: a.poolIndex, canonical: a.canonical, aliasesJson: JSON.stringify(a.aliases.filter(Boolean)), score: a.correct ? a.score : 100, correct: a.correct, explanation: a.explanation, boardItemId, sortOrder: i } });
    }
    return question.id;
  });
}

/** Reads a question back in editor shape (board refs as indices). */
export async function readQuestionInput(id: string) {
  const q = await prisma.question.findUnique({ where: { id }, include: { answers: { orderBy: { sortOrder: 'asc' } }, boardItems: { orderBy: { sortOrder: 'asc' }, include: { mediaAsset: true } }, mediaAsset: true, survey: { select: { id: true, title: true } } } });
  if (!q) throw new HttpError(404, 'Question not found');
  const itemIndex = new Map(q.boardItems.map((b, i) => [b.id, i]));
  return {
    id: q.id,
    category: q.category,
    text: q.text,
    instructions: q.instructions,
    format: q.format,
    difficulty: q.difficulty,
    status: q.status,
    explanation: q.explanation,
    source: q.source,
    notes: q.notes,
    settings: JSON.parse(q.settingsJson || '{}') as Record<string, unknown>,
    mediaUrl: q.mediaAsset?.url ?? null,
    usedCount: q.usedCount,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    survey: q.survey,
    answers: q.answers.map((a) => ({ id: a.id, poolIndex: a.poolIndex, canonical: a.canonical, aliases: JSON.parse(a.aliasesJson || '[]') as string[], score: a.score, correct: a.correct, explanation: a.explanation, boardItemRef: a.boardItemId ? itemIndex.get(a.boardItemId) ?? null : null })),
    boardItems: q.boardItems.map((b) => ({ id: b.id, kind: b.kind, label: b.label, clue: b.clue, imageUrl: b.mediaAsset?.url ?? null, decoy: b.decoy })),
  };
}
