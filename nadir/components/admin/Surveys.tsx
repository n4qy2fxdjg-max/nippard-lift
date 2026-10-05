'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, EmptyState, Field, Input, Modal, Textarea, Toast } from '@/components/ui';
import { formatDate } from '@/lib/util/format';
import { PageHeader, useAdminApi } from './AdminShell';

interface Row {
  id: string;
  title: string;
  category: string;
  questionText: string;
  status: string;
  token: string;
  participantLimit: number;
  timerSeconds: number;
  started: number;
  completed: number;
  createdAt: string;
  questionId: string | null;
}

const TONE: Record<string, 'neutral' | 'mint' | 'cyan' | 'brass'> = { DRAFT: 'neutral', OPEN: 'mint', CLOSED: 'cyan', PUBLISHED: 'brass' };

export function SurveyList() {
  const api = useAdminApi();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', questionText: '', instructions: '', participantLimit: 100, timerSeconds: 100, accepted: '' });
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<Row[]>('/api/admin/surveys').then(setRows).catch((e) => setError(e.message)), [api]);
  useEffect(() => {
    void load();
  }, [load]);
  const create = async () => {
    try {
      const acceptedAnswers = form.accepted.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [c, ...al] = l.split('|').map((s) => s.trim()); return { canonical: c, aliases: al.filter(Boolean) }; });
      await api('/api/admin/surveys', { method: 'POST', body: JSON.stringify({ ...form, accepted: undefined, acceptedAnswers }) });
      setCreating(false);
      setForm({ title: '', category: '', questionText: '', instructions: '', participantLimit: 100, timerSeconds: 100, accepted: '' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Surveys" actions={<Button variant="primary" onClick={() => setCreating(true)}>New survey</Button>}>
        <p className="mt-1 max-w-2xl text-sm text-mist-400">A survey shows one question to real participants (default 100, with a 100-second timer) and turns their answers into survey scores. It records the actual sample, nothing more.</p>
      </PageHeader>
      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
      {rows && rows.length === 0 ? <EmptyState title="No surveys yet" body="Create one, share its link, and publish the result to the question bank." /> : null}
      <ul className="space-y-2">
        {rows?.map((r) => (
          <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/admin/surveys/${r.id}`} className="font-semibold hover:underline">{r.title}</Link>
              <p className="truncate text-sm text-mist-400">{r.questionText}</p>
              <p className="text-xs text-mist-500">{formatDate(r.createdAt)} · {r.timerSeconds}s timer</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <div className="flex justify-between text-xs text-mist-400"><span>{r.completed} / {r.participantLimit}</span><span>{r.started} started</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (r.completed / r.participantLimit) * 100)}%` }} /></div>
              </div>
              <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status.toLowerCase()}</Badge>
              <Link href={`/admin/surveys/${r.id}`} className="btn-secondary px-3 py-1.5 text-xs">Open</Link>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={creating} onClose={() => setCreating(false)} title="New survey" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="st"><Input id="st" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Countries beginning with B" /></Field>
          <Field label="Category" htmlFor="sc"><Input id="sc" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Geography" /></Field>
          <div className="sm:col-span-2"><Field label="Question shown to participants" htmlFor="sq"><Textarea id="sq" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Instructions (optional)" htmlFor="si"><Input id="si" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field></div>
          <Field label="Participants needed" htmlFor="sp"><Input id="sp" type="number" min={1} value={form.participantLimit} onChange={(e) => setForm({ ...form, participantLimit: Number(e.target.value) })} /></Field>
          <Field label="Timer (seconds)" htmlFor="sts"><Input id="sts" type="number" min={10} value={form.timerSeconds} onChange={(e) => setForm({ ...form, timerSeconds: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2"><Field label="Accepted answer universe (one per line; aliases after |)" hint="Optional now; you can add and merge answers while reviewing. Accepted answers nobody gives score 0." htmlFor="sa"><Textarea id="sa" className="min-h-[140px] font-mono text-sm" value={form.accepted} onChange={(e) => setForm({ ...form, accepted: e.target.value })} placeholder={'Brazil | Brasil\nBelgium\nBrunei | Brunei Darussalam'} /></Field></div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={() => void create()} disabled={!form.title.trim() || !form.questionText.trim()}>Create</Button></div>
      </Modal>
    </>
  );
}

interface Detail {
  id: string;
  title: string;
  category: string;
  questionText: string;
  instructions: string;
  status: string;
  token: string;
  participantLimit: number;
  timerSeconds: number;
  acceptedAnswers: { canonical: string; aliases: string[] }[];
  normalization: Record<string, string | null>;
  question: { id: string; status: string } | null;
  tally: { rows: { key: string; label: string; count: number; mappedTo: string | null; accepted: boolean; samples: string[] }[]; validParticipants: number; completed: number; limit: number; complete: boolean };
  participants: { id: string; anonId: string; startedAt: string; completedAt: string | null; invalidated: boolean; invalidReason: string; answer: string | null; elapsedMs: number | null }[];
}

export function SurveyDetail({ id }: { id: string }) {
  const api = useAdminApi();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newAccepted, setNewAccepted] = useState('');
  const [origin, setOrigin] = useState('');
  const load = useCallback(() => api<Detail>(`/api/admin/surveys/${id}`).then(setD).catch((e) => setError(e.message)), [api, id]);
  useEffect(() => {
    void load();
    setOrigin(window.location.origin);
    const i = setInterval(() => void load(), 10000);
    return () => clearInterval(i);
  }, [load]);
  const patch = async (body: Record<string, unknown>, msg = 'Saved') => {
    try {
      await api(`/api/admin/surveys/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setToast(msg);
      setTimeout(() => setToast(null), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };
  if (!d) return error ? <p className="text-rose-400">{error}</p> : <p className="text-mist-400">Loading…</p>;
  const link = `${origin}/survey/${d.token}`;
  const unmapped = d.tally.rows.filter((r) => !r.accepted);
  const mapRaw = (key: string, canonical: string | null) => patch({ normalization: { ...d.normalization, [key.replace(/^r:/, '')]: canonical } }, canonical ? `Merged into ${canonical}` : 'Marked invalid');
  const addAccepted = (canonical: string) => patch({ acceptedAnswers: [...d.acceptedAnswers, { canonical, aliases: [] }] }, 'Accepted answer added');
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/surveys" className="hover:underline">← Surveys</Link> as unknown as string} title={d.title} actions={<>
        {d.status === 'DRAFT' || d.status === 'CLOSED' ? <Button variant="primary" onClick={() => void patch({ status: 'OPEN' }, 'Survey open')}>{d.status === 'CLOSED' ? 'Re-open' : 'Open survey'}</Button> : null}
        {d.status === 'OPEN' ? <Button onClick={() => void patch({ status: 'CLOSED' }, 'Survey closed')}>Close survey</Button> : null}
        <Button variant="cyan" disabled={d.tally.validParticipants === 0} onClick={async () => { try { const r = await api<{ questionId: string }>(`/api/admin/surveys/${id}/publish`, { method: 'POST', body: JSON.stringify({ category: d.category }) }); setToast('Published to question bank'); setTimeout(() => setToast(null), 2000); await load(); window.open(`/admin/questions/${r.questionId}`, '_blank'); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } }}>{d.question ? 'Re-publish question' : 'Publish to question bank'}</Button>
      </>}>
        <p className="mt-1 text-mist-300">{d.questionText}</p>
      </PageHeader>
      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="eyebrow">Responses</p><p className="font-display text-3xl">{d.tally.validParticipants} <span className="text-base text-mist-500">/ {d.participantLimit} valid</span></p></div>
              <Badge tone={TONE[d.status] ?? 'neutral'}>{d.status.toLowerCase()}</Badge>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, (d.tally.validParticipants / d.participantLimit) * 100)}%` }} /></div>
            <p className="mt-2 text-xs text-mist-500">{d.tally.complete ? 'Target reached: counts are final. Review, merge variants, then publish.' : 'Counts update as participants finish. Scores are computed per 100 of the valid sample.'}</p>
          </section>
          <section className="card">
            <h2 className="font-semibold">Tally <span className="text-sm text-mist-500">(score = count ÷ valid × 100)</span></h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-mist-500"><tr><th className="py-1">Answer</th><th className="py-1 text-right">Count</th><th className="py-1 text-right">Score</th><th className="py-1">Status</th><th></th></tr></thead>
              <tbody>
                {d.tally.rows.map((r) => (
                  <tr key={r.key} className="border-t border-white/5">
                    <td className="py-1.5">{r.label}{r.samples.length > 1 || (r.samples[0] && r.samples[0] !== r.label) ? <span className="ml-2 text-xs text-mist-500">({r.samples.join(', ')})</span> : null}</td>
                    <td className="tabular py-1.5 text-right">{r.count}</td>
                    <td className="tabular py-1.5 text-right font-semibold">{d.tally.validParticipants ? Math.round((r.count / d.tally.validParticipants) * 100) : '–'}</td>
                    <td className="py-1.5">{r.accepted ? <Badge tone="mint">accepted</Badge> : r.mappedTo === null && r.key in { } ? null : <Badge tone="rose">unmapped</Badge>}</td>
                    <td className="py-1.5 text-right">
                      {!r.accepted ? (
                        <div className="flex justify-end gap-1">
                          <select className="input w-auto py-1 text-xs" defaultValue="" onChange={(e) => { if (e.target.value === '__new') void addAccepted(r.label).then(() => mapRaw(r.key, r.label)); else if (e.target.value === '__invalid') void mapRaw(r.key, null); else if (e.target.value) void mapRaw(r.key, e.target.value); }} aria-label={`Map ${r.label}`}>
                            <option value="">Merge into…</option>
                            {d.acceptedAnswers.map((a) => <option key={a.canonical} value={a.canonical}>{a.canonical}</option>)}
                            <option value="__new">+ accept “{r.label}” as new answer</option>
                            <option value="__invalid">✕ treat as incorrect</option>
                          </select>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unmapped.length ? <p className="mt-2 text-xs text-mist-500">Unmapped answers are not included in the published question (they count as incorrect for the sample).</p> : null}
          </section>
          <section className="card">
            <h2 className="font-semibold">Participants ({d.participants.length})</h2>
            <div className="mt-2 max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-left uppercase tracking-wider text-mist-500"><tr><th className="py-1">Anon ID</th><th className="py-1">Started</th><th className="py-1">Answer</th><th className="py-1 text-right">Time</th><th className="py-1">Valid</th><th></th></tr></thead>
                <tbody>
                  {d.participants.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="py-1 font-mono">{p.anonId}</td>
                      <td className="py-1 text-mist-400">{formatDate(p.startedAt)}</td>
                      <td className="py-1">{p.answer ?? <span className="text-mist-600">incomplete</span>}</td>
                      <td className="tabular py-1 text-right text-mist-400">{p.elapsedMs !== null ? `${Math.round(p.elapsedMs / 1000)}s` : ''}</td>
                      <td className="py-1">{p.invalidated ? <span className="text-rose-400">no{p.invalidReason ? ` (${p.invalidReason})` : ''}</span> : p.completedAt ? <span className="text-mint-400">yes</span> : '–'}</td>
                      <td className="py-1 text-right">{p.completedAt ? <Button size="sm" variant="ghost" onClick={() => void patch({ invalidate: { participantId: p.id, invalidated: !p.invalidated, reason: p.invalidated ? '' : 'Manually invalidated' } }, 'Updated')}>{p.invalidated ? 'Restore' : 'Invalidate'}</Button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card">
            <p className="eyebrow">Share link</p>
            <p className="mt-1 break-all font-mono text-sm text-cyan-300">{link}</p>
            <Button size="sm" className="mt-2" onClick={() => navigator.clipboard?.writeText(link)}>Copy link</Button>
            <p className="mt-2 text-xs text-mist-500">Participants see the question for {d.timerSeconds}s. Duplicate devices are detected by cookie; you can invalidate any response.</p>
          </section>
          <section className="card">
            <p className="eyebrow">Accepted answers ({d.acceptedAnswers.length})</p>
            <ul className="mt-2 space-y-1 text-sm">
              {d.acceptedAnswers.map((a) => (
                <li key={a.canonical} className="flex items-center justify-between gap-2">
                  <span>{a.canonical}{a.aliases.length ? <span className="text-xs text-mist-500"> ({a.aliases.join(', ')})</span> : null}</span>
                  <Button size="sm" variant="ghost" onClick={() => void patch({ acceptedAnswers: d.acceptedAnswers.filter((x) => x.canonical !== a.canonical) })}>✕</Button>
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newAccepted.trim()) { void addAccepted(newAccepted.trim()); setNewAccepted(''); } }}>
              <Input value={newAccepted} onChange={(e) => setNewAccepted(e.target.value)} placeholder="Add accepted answer" />
              <Button type="submit" size="sm">Add</Button>
            </form>
          </section>
          {d.question ? <section className="card text-sm"><p className="eyebrow">Published question</p><Link href={`/admin/questions/${d.question.id}`} className="text-cyan-300 underline">Open in question bank</Link> <span className="text-mist-500">({d.question.status.toLowerCase()})</span></section> : null}
        </aside>
      </div>
      <Toast message={toast} tone="mint" />
    </>
  );
}
