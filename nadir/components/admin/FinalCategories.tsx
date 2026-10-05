'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Toast } from '@/components/ui';
import { PageHeader, useAdminApi } from './AdminShell';

interface Cat {
  id: string;
  title: string;
  description: string;
  status: string;
  prompts: { id: string; text: string; category: string; answerCount: number; zeroCount: number }[];
}
interface QSummary {
  id: string;
  category: string;
  text: string;
  format: string;
  status: string;
  zeroCount: number;
}

export function FinalCategories() {
  const api = useAdminApi();
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [questions, setQuestions] = useState<QSummary[]>([]);
  const [editing, setEditing] = useState<Partial<Cat> & { questionIds: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, q] = await Promise.all([api<Cat[]>('/api/admin/final-categories'), api<{ items: QSummary[] }>('/api/admin/questions?format=OPEN')]);
      setCats(c);
      setQuestions(q.items.filter((x) => x.status !== 'ARCHIVED'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    try {
      const body = { title: editing.title ?? '', description: editing.description ?? '', status: editing.status ?? 'READY', questionIds: editing.questionIds };
      if (editing.id) await api(`/api/admin/final-categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/admin/final-categories', { method: 'POST', body: JSON.stringify(body) });
      setEditing(null);
      setToast('Saved');
      setTimeout(() => setToast(null), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Final categories" actions={<Button variant="primary" onClick={() => setEditing({ title: '', description: '', status: 'READY', questionIds: [] })}>New category</Button>}>
        <p className="mt-1 text-sm text-mist-400">Each category offers 3–5 prompts. Prompts are open questions from the bank with their own survey scores.</p>
      </PageHeader>
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {cats && cats.length === 0 ? <EmptyState title="No final categories" body="Create one with three to five open questions." /> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {cats?.map((c) => (
          <li key={c.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{c.title}</h2>
                {c.description ? <p className="text-sm text-mist-400">{c.description}</p> : null}
              </div>
              <Badge tone={c.status === 'READY' ? 'mint' : c.status === 'USED' ? 'cyan' : 'neutral'}>{c.status.toLowerCase()}</Badge>
            </div>
            <ol className="mt-3 space-y-1 text-sm">
              {c.prompts.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span><span className="text-brass-300">{i + 1}.</span> <Link href={`/admin/questions/${p.id}`} className="hover:underline">{p.text}</Link></span>
                  <span className="shrink-0 text-xs text-mist-500">{p.answerCount} answers · {p.zeroCount} zero</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => setEditing({ ...c, questionIds: c.prompts.map((p) => p.id) })}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={async () => { if (confirm('Delete this category?')) { await api(`/api/admin/final-categories/${c.id}`, { method: 'DELETE' }); void load(); } }}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit category' : 'New category'} wide>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
              <Field label="Title" htmlFor="ct"><Input id="ct" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Movies of the 1990s" /></Field>
              <Field label="Description" htmlFor="cd"><Input id="cd" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Status" htmlFor="cs"><Select id="cs" value={editing.status ?? 'READY'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>{['DRAFT', 'READY', 'USED', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            </div>
            <div>
              <p className="label">Prompts ({editing.questionIds.length}/5)</p>
              <ol className="space-y-1 text-sm">
                {editing.questionIds.map((id, i) => {
                  const q = questions.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-1.5">
                      <span>{i + 1}. {q?.text ?? id}</span>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, questionIds: editing.questionIds.filter((x) => x !== id) })}>✕</Button>
                    </li>
                  );
                })}
              </ol>
              {editing.questionIds.length < 5 ? (
                <div className="mt-2">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search open questions to add" />
                  <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-white/10">
                    {questions.filter((q) => !editing.questionIds.includes(q.id) && (q.text + q.category).toLowerCase().includes(search.toLowerCase())).slice(0, 30).map((q) => (
                      <li key={q.id}>
                        <button className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-white/10" onClick={() => setEditing({ ...editing, questionIds: [...editing.questionIds, q.id] })}>
                          <span><span className="text-mist-500">{q.category} · </span>{q.text}</span>
                          <span className="text-xs text-mist-500">{q.zeroCount} zero</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void save()} disabled={!editing.title?.trim() || editing.questionIds.length < 1}>Save</Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Toast message={toast} tone="mint" />
    </>
  );
}
