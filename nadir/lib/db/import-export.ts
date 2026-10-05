import { prisma } from './prisma';
import { questionInput, saveQuestion, type QuestionInput } from './question-input';
import { readQuestionInput } from './question-input';

export interface ExportedQuestion extends Omit<QuestionInput, 'answers' | 'boardItems'> {
  answers: QuestionInput['answers'];
  boardItems: QuestionInput['boardItems'];
}

export async function exportQuestions(ids?: string[]): Promise<ExportedQuestion[]> {
  const rows = await prisma.question.findMany({ where: ids ? { id: { in: ids } } : {}, select: { id: true }, orderBy: { createdAt: 'asc' } });
  const out: ExportedQuestion[] = [];
  for (const r of rows) {
    const q = await readQuestionInput(r.id);
    out.push({ category: q.category, text: q.text, instructions: q.instructions, format: q.format as never, difficulty: q.difficulty, status: q.status as never, explanation: q.explanation, source: q.source, notes: q.notes, settings: q.settings, mediaUrl: q.mediaUrl, answers: q.answers.map(({ id: _i, ...a }) => a), boardItems: q.boardItems.map(({ id: _i, ...b }) => ({ ...b, kind: b.kind as QuestionInput['boardItems'][number]['kind'] })) });
  }
  return out;
}

/** CSV: one row per answer. Columns: category,question,instructions,format,difficulty,answer,aliases(|),score,correct,poolIndex,boardItem */
export function toCsv(questions: ExportedQuestion[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = ['category,question,instructions,format,difficulty,answer,aliases,score,correct,poolIndex,boardItem'];
  for (const q of questions) {
    for (const a of q.answers) {
      const item = typeof a.boardItemRef === 'number' ? q.boardItems[a.boardItemRef] : null;
      lines.push([q.category, q.text, q.instructions, q.format, q.difficulty, a.canonical, a.aliases.join('|'), a.score, a.correct, a.poolIndex, item ? item.label || item.clue : ''].map(esc).join(','));
    }
    if (q.answers.length === 0) lines.push([q.category, q.text, q.instructions, q.format, q.difficulty, '', '', '', '', '', ''].map(esc).join(','));
  }
  return lines.join('\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/** Groups CSV answer rows back into questions (OPEN/LINKED/BOARD by label). */
export function fromCsv(text: string): QuestionInput[] {
  const rows = parseCsv(text);
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  const ci = { category: col('category'), question: col('question'), instructions: col('instructions'), format: col('format'), difficulty: col('difficulty'), answer: col('answer'), aliases: col('aliases'), score: col('score'), correct: col('correct'), pool: col('poolindex'), item: col('boarditem') };
  if (ci.question < 0 || ci.answer < 0) throw new Error('CSV needs at least "question" and "answer" columns');
  const map = new Map<string, QuestionInput>();
  for (const r of rows) {
    const key = `${r[ci.category] ?? ''}::${r[ci.question]}`;
    if (!map.has(key)) {
      map.set(key, { category: r[ci.category] || 'General', text: r[ci.question], instructions: ci.instructions >= 0 ? r[ci.instructions] ?? '' : '', format: ((ci.format >= 0 && r[ci.format]) || 'OPEN').toUpperCase(), difficulty: Number(ci.difficulty >= 0 ? r[ci.difficulty] : 2) || 2, status: 'DRAFT', explanation: '', source: 'CSV import', notes: '', settings: {}, mediaUrl: null, answers: [], boardItems: [] });
    }
    const q = map.get(key)!;
    if (!r[ci.answer]) continue;
    const correct = ci.correct >= 0 ? !/^(false|0|no)$/i.test(r[ci.correct] ?? 'true') : true;
    let boardItemRef: number | null = null;
    const itemLabel = ci.item >= 0 ? r[ci.item] : '';
    if (itemLabel) {
      let idx = q.boardItems.findIndex((b) => b.label === itemLabel || b.clue === itemLabel);
      if (idx < 0) {
        q.boardItems.push({ kind: q.format === 'CLUES' ? 'CLUE' : 'TEXT', label: q.format === 'CLUES' ? '' : itemLabel, clue: q.format === 'CLUES' ? itemLabel : '', decoy: false, imageUrl: null });
        idx = q.boardItems.length - 1;
      }
      boardItemRef = idx;
    }
    q.answers.push({ poolIndex: Number(ci.pool >= 0 ? r[ci.pool] : 0) || 0, canonical: r[ci.answer], aliases: (ci.aliases >= 0 ? r[ci.aliases] ?? '' : '').split('|').map((s) => s.trim()).filter(Boolean), score: Math.min(100, Math.max(0, Number(ci.score >= 0 ? r[ci.score] : 100) || 0)), correct, explanation: '', boardItemRef });
  }
  return [...map.values()];
}

export async function importQuestions(items: unknown[]): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];
  for (const [i, raw] of items.entries()) {
    const parsed = questionInput.safeParse(raw);
    if (!parsed.success) {
      errors.push(`Item ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join(', ')}`);
      continue;
    }
    try {
      await saveQuestion({ ...parsed.data, status: parsed.data.status === 'READY' ? 'READY' : 'DRAFT' });
      imported++;
    } catch (e) {
      errors.push(`Item ${i + 1} (${parsed.data.text.slice(0, 40)}): ${e instanceof Error ? e.message : 'failed'}`);
    }
  }
  return { imported, errors };
}
