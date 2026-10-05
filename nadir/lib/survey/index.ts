/**
 * Survey system: collects real answers from a sample of participants and turns the counts
 * into a question's survey scores. Nothing here estimates or invents a score.
 */
import { prisma, json } from '@/lib/db/prisma';
import { normalizeAnswer } from '@/lib/matching';
import { saveQuestion } from '@/lib/db/question-input';
import { HttpError } from '@/lib/util/http';

export interface AcceptedAnswerDef {
  canonical: string;
  aliases: string[];
}

export interface SurveyTally {
  /** canonical (or raw normalised key when unmapped) -> count */
  rows: { key: string; label: string; count: number; mappedTo: string | null; accepted: boolean; samples: string[] }[];
  validParticipants: number;
  completed: number;
  limit: number;
  complete: boolean;
}

export function resolveAnswer(raw: string, accepted: AcceptedAnswerDef[], normalization: Record<string, string | null>): { canonical: string | null; key: string } {
  const key = normalizeAnswer(raw);
  if (key in normalization) return { canonical: normalization[key], key };
  for (const a of accepted) {
    if (normalizeAnswer(a.canonical) === key) return { canonical: a.canonical, key };
    if (a.aliases.some((al) => normalizeAnswer(al) === key)) return { canonical: a.canonical, key };
  }
  return { canonical: null, key };
}

export async function tallySurvey(surveyId: string): Promise<SurveyTally> {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { participants: { include: { responses: true } } } });
  if (!survey) throw new HttpError(404, 'Survey not found');
  const accepted = json.parse<AcceptedAnswerDef[]>(survey.acceptedAnswersJson, []);
  const normalization = json.parse<Record<string, string | null>>(survey.normalizationJson, {});
  const valid = survey.participants.filter((p) => !p.invalidated && p.completedAt);
  const counts = new Map<string, { label: string; count: number; mappedTo: string | null; accepted: boolean; samples: Set<string> }>();
  for (const p of valid) {
    const r = p.responses.find((x) => x.valid);
    if (!r) continue;
    const { canonical, key } = resolveAnswer(r.rawAnswer, accepted, normalization);
    const groupKey = canonical ? `c:${normalizeAnswer(canonical)}` : `r:${key}`;
    const entry = counts.get(groupKey) ?? { label: canonical ?? r.rawAnswer.trim(), count: 0, mappedTo: canonical, accepted: canonical !== null && accepted.some((a) => a.canonical === canonical), samples: new Set<string>() };
    entry.count++;
    entry.samples.add(r.rawAnswer.trim());
    counts.set(groupKey, entry);
  }
  // Accepted answers nobody gave: 0
  for (const a of accepted) {
    const k = `c:${normalizeAnswer(a.canonical)}`;
    if (!counts.has(k)) counts.set(k, { label: a.canonical, count: 0, mappedTo: a.canonical, accepted: true, samples: new Set() });
  }
  const rows = [...counts.entries()].map(([key, v]) => ({ key, label: v.label, count: v.count, mappedTo: v.mappedTo, accepted: v.accepted, samples: [...v.samples].slice(0, 5) })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { rows, validParticipants: valid.length, completed: survey.participants.filter((p) => p.completedAt).length, limit: survey.participantLimit, complete: valid.length >= survey.participantLimit };
}

/** Converts the tally into a question in the bank (status DRAFT so an admin reviews it). */
export async function publishSurvey(surveyId: string, opts: { category?: string; status?: 'DRAFT' | 'READY' } = {}): Promise<string> {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { question: true } });
  if (!survey) throw new HttpError(404, 'Survey not found');
  const tally = await tallySurvey(surveyId);
  if (tally.validParticipants === 0) throw new HttpError(400, 'No valid responses to publish');
  const accepted = json.parse<AcceptedAnswerDef[]>(survey.acceptedAnswersJson, []);
  // Score = share of the valid sample, expressed per 100 participants.
  const scale = 100 / tally.validParticipants;
  const answers = tally.rows
    .filter((r) => r.accepted && r.mappedTo)
    .map((r) => ({ poolIndex: 0, canonical: r.mappedTo!, aliases: [...new Set([...(accepted.find((a) => a.canonical === r.mappedTo)?.aliases ?? []), ...r.samples.filter((s) => normalizeAnswer(s) !== normalizeAnswer(r.mappedTo!))])], score: Math.min(100, Math.round(r.count * scale)), correct: true, explanation: '', boardItemRef: null }));
  if (answers.length === 0) throw new HttpError(400, 'Map at least one answer to an accepted answer before publishing');
  const input = { category: opts.category ?? survey.category ?? 'General', text: survey.questionText, instructions: survey.instructions, format: 'OPEN', difficulty: 2, status: opts.status ?? 'DRAFT', explanation: '', source: `Survey "${survey.title}" (${tally.validParticipants} valid participants, ${survey.timerSeconds}s timer)`, notes: `Published from survey ${survey.id} on ${new Date().toISOString()}`, settings: {}, mediaUrl: null, answers, boardItems: [] } as const;
  const qid = await saveQuestion({ ...input, answers: [...input.answers], boardItems: [] }, survey.question?.id);
  await prisma.survey.update({ where: { id: surveyId }, data: { status: 'PUBLISHED', closedAt: survey.closedAt ?? new Date() } });
  if (!survey.question) await prisma.question.update({ where: { id: qid }, data: { surveyId } });
  return qid;
}
