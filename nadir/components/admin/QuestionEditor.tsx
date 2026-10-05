'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Field, Input, Select, Textarea, Toast, Toggle, cx } from '@/components/ui';
import { FORMAT_LABELS, QUESTION_FORMATS, type QuestionFormat } from '@/lib/game-engine/types';
import { BoardGrid } from '@/components/game/BoardGrid';
import { PageHeader, useAdminApi } from './AdminShell';

export interface EditorAnswer {
  id?: string;
  poolIndex: number;
  canonical: string;
  aliases: string[];
  score: number;
  correct: boolean;
  explanation: string;
  boardItemRef: number | null;
}
export interface EditorItem {
  id?: string;
  kind: 'TEXT' | 'CLUE' | 'IMAGE' | 'PARTIAL' | 'SCRAMBLED';
  label: string;
  clue: string;
  imageUrl: string | null;
  decoy: boolean;
}
export interface EditorQuestion {
  id?: string;
  category: string;
  text: string;
  instructions: string;
  format: QuestionFormat;
  difficulty: number;
  status: 'DRAFT' | 'READY' | 'USED' | 'ARCHIVED';
  explanation: string;
  source: string;
  notes: string;
  settings: Record<string, unknown>;
  mediaUrl: string | null;
  answers: EditorAnswer[];
  boardItems: EditorItem[];
  survey?: { id: string; title: string } | null;
}

const blank: EditorQuestion = { category: '', text: '', instructions: '', format: 'OPEN', difficulty: 2, status: 'DRAFT', explanation: '', source: '', notes: '', settings: {}, mediaUrl: null, answers: [], boardItems: [] };
const usesBoard = (f: QuestionFormat) => f === 'BOARD' || f === 'CLUES' || f === 'PICTURE' || f === 'PARTIAL';
const itemKind = (f: QuestionFormat): EditorItem['kind'] => (f === 'CLUES' ? 'CLUE' : f === 'PICTURE' ? 'IMAGE' : f === 'PARTIAL' ? 'PARTIAL' : 'TEXT');

export function QuestionEditor({ id }: { id?: string }) {
  const api = useAdminApi();
  const router = useRouter();
  const [q, setQ] = useState<EditorQuestion>(blank);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    api<{ categories: { name: string }[] }>('/api/admin/questions').then((b) => setCategories(b.categories.map((c) => c.name))).catch(() => undefined);
    if (!id) return;
    api<EditorQuestion>(`/api/admin/questions/${id}`)
      .then((data) => setQ({ ...blank, ...data, format: data.format as QuestionFormat }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [api, id]);

  const set = useCallback(<K extends keyof EditorQuestion>(k: K, v: EditorQuestion[K]) => setQ((p) => ({ ...p, [k]: v })), []);
  const setAnswer = (i: number, patch: Partial<EditorAnswer>) => setQ((p) => ({ ...p, answers: p.answers.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const addAnswer = (pool = 0, boardItemRef: number | null = null) => setQ((p) => ({ ...p, answers: [...p.answers, { poolIndex: pool, canonical: '', aliases: [], score: 0, correct: true, explanation: '', boardItemRef }] }));
  const removeAnswer = (i: number) => setQ((p) => ({ ...p, answers: p.answers.filter((_, j) => j !== i) }));
  const setItem = (i: number, patch: Partial<EditorItem>) => setQ((p) => ({ ...p, boardItems: p.boardItems.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const addItem = () => setQ((p) => ({ ...p, boardItems: [...p.boardItems, { kind: itemKind(p.format), label: '', clue: '', imageUrl: null, decoy: false }] }));
  const removeItem = (i: number) => setQ((p) => ({ ...p, boardItems: p.boardItems.filter((_, j) => j !== i), answers: p.answers.filter((a) => a.boardItemRef !== i).map((a) => ({ ...a, boardItemRef: a.boardItemRef !== null && a.boardItemRef > i ? a.boardItemRef - 1 : a.boardItemRef })) }));

  const problems = useMemo(() => localValidation(q), [q]);

  const save = async (status?: EditorQuestion['status']) => {
    setSaving(true);
    setError(null);
    const payload = { ...q, status: status ?? q.status, survey: undefined };
    try {
      if (id) {
        await api(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setQ((p) => ({ ...p, status: payload.status }));
        setToast('Saved');
      } else {
        const res = await api<{ id: string }>('/api/admin/questions', { method: 'POST', body: JSON.stringify(payload) });
        router.replace(`/admin/questions/${res.id}`);
        setToast('Created');
      }
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('alt', file.name);
    const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? 'Upload failed');
      return null;
    }
    return body.url as string;
  };

  if (loading) return <p className="text-mist-400">Loading…</p>;
  const board = usesBoard(q.format);
  const poolLabels = (q.settings.poolLabels as [string, string] | undefined) ?? ['Category A', 'Category B'];

  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/questions" className="hover:underline">← Question bank</Link> as unknown as string} title={id ? 'Edit question' : 'New question'} actions={<>
        <Badge tone={q.status === 'READY' ? 'mint' : q.status === 'USED' ? 'cyan' : 'neutral'}>{q.status.toLowerCase()}</Badge>
        <Button onClick={() => setPreview((p) => !p)}>{preview ? 'Hide preview' : 'Preview'}</Button>
        <Button onClick={() => void save('DRAFT')} loading={saving}>Save draft</Button>
        <Button variant="primary" onClick={() => void save('READY')} loading={saving} disabled={problems.length > 0} title={problems.join('\n')}>Save as ready</Button>
      </>} />

      {error ? <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}
      {q.survey ? <p className="mb-4 text-sm text-mist-400">Scores for this question came from the survey <Link className="text-cyan-300 underline" href={`/admin/surveys/${q.survey.id}`}>{q.survey.title}</Link>.</p> : null}

      {preview ? <Preview q={q} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card grid gap-4 sm:grid-cols-2">
            <Field label="1. Category" htmlFor="cat">
              <Input id="cat" list="cats" value={q.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Geography" />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="4. Format" htmlFor="fmt">
              <Select id="fmt" value={q.format} onChange={(e) => { const f = e.target.value as QuestionFormat; setQ((p) => ({ ...p, format: f, boardItems: p.boardItems.map((b) => ({ ...b, kind: itemKind(f) })) })); }}>
                {QUESTION_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="2. Question" htmlFor="text">
                <Textarea id="text" value={q.text} onChange={(e) => set('text', e.target.value)} placeholder="Name a country beginning with B" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="3. Instructions / acceptance rules" htmlFor="inst" hint="Shown on the TV after the question. Say exactly what counts.">
                <Textarea id="inst" value={q.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="We accepted sovereign states whose common English name begins with B." />
              </Field>
            </div>
            <Field label="Difficulty" htmlFor="diff">
              <Select id="diff" value={q.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} · {['very easy', 'easy', 'medium', 'hard', 'fiendish'][d - 1]}</option>)}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" value={q.status} onChange={(e) => set('status', e.target.value as EditorQuestion['status'])}>
                {['DRAFT', 'READY', 'USED', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            {q.format === 'LINKED' ? (
              <>
                <Field label="Category A label" htmlFor="pa"><Input id="pa" value={poolLabels[0]} onChange={(e) => set('settings', { ...q.settings, poolLabels: [e.target.value, poolLabels[1]] })} /></Field>
                <Field label="Category B label" htmlFor="pb"><Input id="pb" value={poolLabels[1]} onChange={(e) => set('settings', { ...q.settings, poolLabels: [poolLabels[0], e.target.value] })} /></Field>
              </>
            ) : null}
            {board ? (
              <Field label="Board columns" htmlFor="cols"><Select id="cols" value={(q.settings.boardColumns as number) ?? 4} onChange={(e) => set('settings', { ...q.settings, boardColumns: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            ) : null}
            {q.format === 'PICTURE' ? (
              <Field label="Picture mode" htmlFor="pm"><Select id="pm" value={(q.settings.pictureMode as string) ?? 'NUMBERED'} onChange={(e) => set('settings', { ...q.settings, pictureMode: e.target.value })}>
                <option value="IMAGE_ONLY">Image only</option><option value="NUMBERED">Numbered grid</option><option value="IMAGE_LETTERS">Image + partial letters (label)</option><option value="IMAGE_CLUE">Image as a clue</option><option value="IMAGE_QUESTION">Image + question (label)</option>
              </Select></Field>
            ) : null}
            {q.format === 'BOARD' ? <div className="sm:col-span-2"><Toggle checked={(q.settings.removeOnPick as boolean) ?? true} onChange={(v) => set('settings', { ...q.settings, removeOnPick: v })} label="Remove a card from the board once chosen" /></div> : null}
          </section>

          {board ? (
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Board cards <span className="text-sm text-mist-500">({q.boardItems.length}; clue boards usually hold teams + 3)</span></h2>
                <Button size="sm" onClick={addItem}>+ card</Button>
              </div>
              <ul className="mt-3 space-y-3">
                {q.boardItems.map((b, i) => {
                  const itemAnswers = q.answers.map((a, idx) => ({ a, idx })).filter((x) => x.a.boardItemRef === i);
                  return (
                    <li key={i} className="rounded-xl border border-white/10 p-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="font-display text-xl text-mist-500">{i + 1}</span>
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          {q.format === 'BOARD' ? <Input value={b.label} onChange={(e) => setItem(i, { label: e.target.value })} placeholder="Card text" aria-label={`Card ${i + 1} text`} /> : null}
                          {q.format === 'CLUES' ? <Input value={b.clue} onChange={(e) => setItem(i, { clue: e.target.value })} placeholder="Clue (e.g. Battle of Hastings)" aria-label={`Clue ${i + 1}`} /> : null}
                          {q.format === 'PARTIAL' ? (
                            <>
                              <Input value={b.clue} onChange={(e) => setItem(i, { clue: e.target.value })} placeholder="Puzzle text, e.g. C _ R _ S T _ P H _ R   N _ L _ N" className="font-mono" aria-label={`Puzzle ${i + 1}`} />
                              <div className="flex gap-2">
                                <Select value={b.kind} onChange={(e) => setItem(i, { kind: e.target.value as EditorItem['kind'] })} aria-label="Puzzle kind"><option value="PARTIAL">Missing letters</option><option value="SCRAMBLED">Scrambled</option></Select>
                                <Button size="sm" variant="ghost" onClick={() => { const ans = itemAnswers[0]?.a.canonical; if (ans) setItem(i, { clue: b.kind === 'SCRAMBLED' ? scramble(ans) : maskWord(ans) }); }} disabled={!itemAnswers[0]?.a.canonical}>Generate from answer</Button>
                              </div>
                            </>
                          ) : null}
                          {q.format === 'PICTURE' ? (
                            <>
                              <div className="flex items-center gap-2">
                                {b.imageUrl ? <img src={b.imageUrl} alt="" className="h-12 w-16 rounded object-contain bg-ink-900" /> : <span className="flex h-12 w-16 items-center justify-center rounded border border-dashed border-white/20 text-xs text-mist-500">no image</span>}
                                <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">Upload<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(f); if (url) setItem(i, { imageUrl: url }); } }} /></label>
                              </div>
                              <Input value={b.imageUrl?.startsWith('data:') ? '' : b.imageUrl ?? ''} onChange={(e) => setItem(i, { imageUrl: e.target.value || null })} placeholder="…or image URL (/images/flags/japan.svg)" aria-label="Image URL" />
                              <Input value={b.label} onChange={(e) => setItem(i, { label: e.target.value })} placeholder="Label / partial letters / mini question (optional)" aria-label="Image label" />
                            </>
                          ) : null}
                          {q.format === 'BOARD' ? <label className="flex items-center gap-2 text-sm text-mist-300"><input type="checkbox" checked={b.decoy} onChange={(e) => { setItem(i, { decoy: e.target.checked }); if (e.target.checked) setQ((p) => ({ ...p, answers: p.answers.filter((a) => a.boardItemRef !== i) })); }} /> Decoy (incorrect option)</label> : null}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(i)} aria-label={`Remove card ${i + 1}`}>✕</Button>
                      </div>
                      {!b.decoy ? (
                        <div className="mt-2 pl-8">
                          {itemAnswers.map(({ a, idx }) => <AnswerRow key={idx} a={a} onChange={(patch) => setAnswer(idx, patch)} onRemove={() => removeAnswer(idx)} compact />)}
                          {q.format !== 'BOARD' || itemAnswers.length === 0 ? <Button size="sm" variant="ghost" onClick={() => addAnswer(0, i)}>+ accepted answer for this card</Button> : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <>
              <AnswerPool title={q.format === 'LINKED' ? `5. Accepted answers · ${poolLabels[0]}` : '5. Accepted answers'} answers={q.answers} pool={0} onAdd={() => addAnswer(0)} onChange={setAnswer} onRemove={removeAnswer} />
              {q.format === 'LINKED' ? <AnswerPool title={`Accepted answers · ${poolLabels[1]}`} answers={q.answers} pool={1} onAdd={() => addAnswer(1)} onChange={setAnswer} onRemove={removeAnswer} /> : null}
            </>
          )}

          <section className="card grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="8. Question media (optional)" hint="Shown beside the question. Max 1.5 MB." htmlFor="media">
              <div className="flex items-center gap-3">
                {q.mediaUrl ? <img src={q.mediaUrl} alt="" className="h-16 rounded bg-ink-900 object-contain" /> : null}
                <label className="btn-secondary cursor-pointer text-xs">Upload<input id="media" type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(f); if (url) set('mediaUrl', url); } }} /></label>
                {q.mediaUrl ? <Button size="sm" variant="ghost" onClick={() => set('mediaUrl', null)}>Remove</Button> : null}
              </div>
            </Field></div>
            <Field label="Explanation (host notes shown after reveal)" htmlFor="expl"><Textarea id="expl" value={q.explanation} onChange={(e) => set('explanation', e.target.value)} /></Field>
            <Field label="9. Source / research notes" htmlFor="src"><Textarea id="src" value={q.source} onChange={(e) => set('source', e.target.value)} placeholder="Where the answer universe and survey came from" /></Field>
            <div className="sm:col-span-2"><Field label="Internal notes" htmlFor="notes"><Textarea id="notes" value={q.notes} onChange={(e) => set('notes', e.target.value)} /></Field></div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card">
            <p className="eyebrow">Checks</p>
            {problems.length === 0 ? <p className="mt-2 text-sm text-mint-400">Ready to play.</p> : (
              <ul className="mt-2 space-y-1 text-sm text-mist-300">{problems.map((p) => <li key={p} className="flex gap-2"><span className="text-brass-300">•</span>{p}</li>)}</ul>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-mist-500">Accepted</dt><dd className="tabular text-right">{q.answers.filter((a) => a.correct).length}</dd>
              <dt className="text-mist-500">Zero answers</dt><dd className="tabular text-right text-brass-300">{q.answers.filter((a) => a.correct && a.score === 0).length}</dd>
              <dt className="text-mist-500">Cards</dt><dd className="tabular text-right">{q.boardItems.length}</dd>
            </dl>
          </div>
          <div className="card text-sm text-mist-400">
            <p className="eyebrow">Format guide</p>
            <p className="mt-2">{FORMAT_HELP[q.format]}</p>
          </div>
          <div className="card text-sm text-mist-400">
            <p className="eyebrow">Survey scores</p>
            <p className="mt-2">Scores are entered here by hand or produced by a <Link className="text-cyan-300 underline" href="/admin/surveys">survey</Link> of real participants. Nothing invents them.</p>
          </div>
        </aside>
      </div>
      <Toast message={toast} tone="mint" />
    </>
  );
}

const FORMAT_HELP: Record<QuestionFormat, string> = {
  OPEN: 'Contestants type any answer. Add every accepted answer with its survey score; incorrect answers score 100 automatically. You can also list known wrong answers (untick “correct”) for the host’s reference.',
  BOARD: 'A grid of options. Correct cards carry an accepted answer with its score; decoys are plain cards that score 100. Twelve cards with three or four decoys plays well.',
  CLUES: 'Each card is a clue (e.g. a battle) with one or more accepted answers (e.g. its country). Wrong answers leave the clue available. Aim for number of teams + 3 clues.',
  LINKED: 'Each team answers two linked categories (one player each). Scores are combined per the game settings (sum by default).',
  PICTURE: 'A grid of images. Upload or link an image per card and attach accepted answers. Use the numbered mode when teams choose by number.',
  PARTIAL: 'Each card is a masked or scrambled answer. Use “Generate from answer” after typing the accepted answer. Great for Head-to-Head.',
};

function localValidation(q: EditorQuestion): string[] {
  const p: string[] = [];
  if (!q.category.trim()) p.push('Category is required');
  if (!q.text.trim()) p.push('Question text is required');
  const correct = q.answers.filter((a) => a.correct);
  if (correct.length === 0) p.push('Add at least one accepted answer');
  if (q.answers.some((a) => !a.canonical.trim())) p.push('Every answer needs text');
  if (q.answers.some((a) => a.score < 0 || a.score > 100)) p.push('Scores must be 0–100');
  const seen = new Set<string>();
  for (const a of q.answers) {
    const k = `${a.poolIndex}:${a.boardItemRef ?? ''}:${a.canonical.trim().toLowerCase()}`;
    if (a.canonical.trim() && seen.has(k)) p.push(`Duplicate answer “${a.canonical}”`);
    seen.add(k);
  }
  if (q.format === 'LINKED' && (!correct.some((a) => a.poolIndex === 0) || !correct.some((a) => a.poolIndex === 1))) p.push('Both linked categories need answers');
  if (usesBoard(q.format)) {
    if (q.boardItems.length < 2) p.push('Add at least two cards');
    if (q.format === 'BOARD' && !q.boardItems.some((b) => !b.decoy)) p.push('Add at least one correct card');
    q.boardItems.forEach((b, i) => {
      if (!b.decoy && q.format !== 'BOARD' && !q.answers.some((a) => a.correct && a.boardItemRef === i)) p.push(`Card ${i + 1} needs an accepted answer`);
      if (q.format === 'BOARD' && !b.decoy && !q.answers.some((a) => a.correct && a.boardItemRef === i)) p.push(`Card ${i + 1} needs a score (add its answer)`);
      if (q.format === 'PICTURE' && !b.imageUrl) p.push(`Card ${i + 1} needs an image`);
      if (q.format === 'PARTIAL' && !b.clue) p.push(`Card ${i + 1} needs puzzle text`);
      if (q.format === 'CLUES' && !b.clue) p.push(`Card ${i + 1} needs clue text`);
      if (q.format === 'BOARD' && !b.label) p.push(`Card ${i + 1} needs text`);
    });
  }
  return [...new Set(p)];
}

export function maskWord(s: string): string {
  const up = s.toUpperCase();
  return up.split('').map((ch, i) => (ch === ' ' ? '  ' : /[A-Z0-9]/.test(ch) && i % 2 === 1 ? '_' : ch)).join(' ');
}
export function scramble(s: string): string {
  const a = s.toUpperCase().replace(/\s/g, '').split('');
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join(' ');
}

function AnswerPool({ title, answers, pool, onAdd, onChange, onRemove }: { title: string; answers: EditorAnswer[]; pool: number; onAdd: () => void; onChange: (i: number, p: Partial<EditorAnswer>) => void; onRemove: (i: number) => void }) {
  const rows = answers.map((a, i) => ({ a, i })).filter((x) => x.a.poolIndex === pool);
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title} <span className="text-sm text-mist-500">({rows.filter((r) => r.a.correct).length})</span></h2>
        <Button size="sm" onClick={onAdd}>+ answer</Button>
      </div>
      <p className="mt-1 text-xs text-mist-500">6. Score = how many of 100 people gave it. 7. Aliases are alternative spellings, comma separated.</p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-mist-500">No answers yet.</p> : null}
        {rows.map(({ a, i }) => <AnswerRow key={i} a={a} onChange={(p) => onChange(i, p)} onRemove={() => onRemove(i)} />)}
      </div>
    </section>
  );
}

function AnswerRow({ a, onChange, onRemove, compact }: { a: EditorAnswer; onChange: (p: Partial<EditorAnswer>) => void; onRemove: () => void; compact?: boolean }) {
  return (
    <div className={cx('grid items-center gap-2', compact ? 'grid-cols-[1fr_1fr_5rem_auto_auto]' : 'grid-cols-[1.2fr_1.5fr_5rem_auto_auto]')}>
      <Input value={a.canonical} onChange={(e) => onChange({ canonical: e.target.value })} placeholder="Canonical answer" aria-label="Canonical answer" />
      <Input value={a.aliases.join(', ')} onChange={(e) => onChange({ aliases: e.target.value.split(',').map((s) => s.trim()).filter((s, i, arr) => s || i === arr.length - 1) })} placeholder="Aliases, comma separated" aria-label="Aliases" />
      <Input type="number" min={0} max={100} value={a.correct ? a.score : 100} disabled={!a.correct} onChange={(e) => onChange({ score: Math.min(100, Math.max(0, Number(e.target.value))) })} aria-label="Score" className={cx('tabular text-right', a.correct && a.score === 0 && 'border-brass-400/60 text-brass-300')} />
      <label className="flex items-center gap-1 text-xs text-mist-400" title="Untick to record a known wrong answer (scores 100)"><input type="checkbox" checked={a.correct} onChange={(e) => onChange({ correct: e.target.checked })} /> ok</label>
      <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove answer">✕</Button>
    </div>
  );
}

function Preview({ q }: { q: EditorQuestion }) {
  const items = q.boardItems.map((b, i) => ({ id: String(i), kind: b.kind, label: b.label, clue: b.clue, imageUrl: b.imageUrl, sortOrder: i, used: false }));
  return (
    <div className="tv-root mb-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-950 p-[2em]" style={{ fontSize: 10 }} aria-label="TV preview">
      <p className="eyebrow text-[1.1em] text-brass-300">{q.category || 'Category'}</p>
      <h2 className={cx('font-display mt-[0.3em] font-semibold leading-[1.05]', items.length ? 'text-[3.4em]' : 'text-[5em]')}>{q.text || 'Question text'}</h2>
      {q.instructions ? <p className="mt-[0.8em] max-w-[50em] text-[1.5em] text-mist-400">{q.instructions}</p> : null}
      {items.length ? <div className="mt-[1.6em]"><BoardGrid question={{ id: 'p', category: q.category, text: q.text, instructions: q.instructions, format: q.format, settings: q.settings as never, boardItems: items, mediaUrl: null }} items={items} reducedMotion /></div> : null}
    </div>
  );
}
