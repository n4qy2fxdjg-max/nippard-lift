'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, EmptyState, Input, Modal, Select, Spinner, Toast, cx } from '@/components/ui';
import { FORMAT_LABELS, QUESTION_FORMATS, type QuestionFormat } from '@/lib/game-engine/types';
import { formatDate } from '@/lib/util/format';
import { PageHeader, useAdminApi } from './AdminShell';

interface Row {
  id: string;
  category: string;
  text: string;
  format: QuestionFormat;
  difficulty: number;
  status: string;
  answerCount: number;
  zeroCount: number;
  usedCount: number;
  createdAt: string;
}

const STATUS_TONE: Record<string, 'neutral' | 'mint' | 'cyan' | 'rose' | 'brass'> = { DRAFT: 'neutral', READY: 'mint', USED: 'cyan', ARCHIVED: 'rose' };

export function QuestionBank() {
  const api = useAdminApi();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (format) params.set('format', format);
      if (category) params.set('category', category);
      if (q) params.set('q', q);
      const body = await api<{ items: Row[]; categories: { name: string; count: number }[] }>(`/api/admin/questions?${params}`);
      setRows(body.items);
      setCategories(body.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [api, status, format, category, q]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 150);
    return () => clearTimeout(t);
  }, [load]);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      notify(done);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed');
    }
  };
  const bulk = async (newStatus: string) => act(() => Promise.all([...selected].map(async (id) => { const full = await api<Record<string, unknown>>(`/api/admin/questions/${id}`); await api(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify({ ...full, status: newStatus }) }); })), `${selected.size} updated`).then(() => setSelected(new Set()));

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const isCsv = file.name.endsWith('.csv');
    try {
      const res = await api<{ imported: number; errors: string[] }>('/api/admin/questions/import', { method: 'POST', headers: isCsv ? { 'Content-Type': 'text/csv' } : undefined, body: isCsv ? text : text });
      notify(`Imported ${res.imported} question(s)${res.errors.length ? `, ${res.errors.length} skipped` : ''}`);
      if (res.errors.length) setError(res.errors.slice(0, 5).join('\n'));
      setImportOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const stats = useMemo(() => rows ? { total: rows.length, ready: rows.filter((r) => r.status === 'READY').length, zeros: rows.reduce((n, r) => n + r.zeroCount, 0) } : null, [rows]);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Question bank" actions={<>
        <Button onClick={() => setImportOpen(true)}>Import</Button>
        <a className="btn-secondary" href={`/api/admin/questions/export${selected.size ? `?ids=${[...selected].join(',')}` : ''}`}>Export JSON</a>
        <a className="btn-secondary" href={`/api/admin/questions/export?format=csv${selected.size ? `&ids=${[...selected].join(',')}` : ''}`}>Export CSV</a>
        <Link href="/admin/questions/new" className="btn-primary">New question</Link>
      </>}>
        {stats ? <p className="mt-1 text-sm text-mist-400">{stats.total} shown · {stats.ready} ready · {stats.zeros} zero answers</p> : null}
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search question or category" aria-label="Search" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>
          {['DRAFT', 'READY', 'USED', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={format} onChange={(e) => setFormat(e.target.value)} aria-label="Format filter">
          <option value="">All formats</option>
          {QUESTION_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
        </Select>
      </div>

      {selected.size ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brass-400/30 bg-brass-400/5 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <Button size="sm" onClick={() => void bulk('READY')}>Mark ready</Button>
          <Button size="sm" onClick={() => void bulk('DRAFT')}>Mark draft</Button>
          <Button size="sm" onClick={() => void bulk('ARCHIVED')}>Archive</Button>
          <Button size="sm" variant="danger" onClick={() => { if (confirm(`Delete ${selected.size} question(s)? Used questions are archived instead.`)) void act(() => Promise.all([...selected].map((id) => api(`/api/admin/questions/${id}`, { method: 'DELETE' }))), 'Deleted').then(() => setSelected(new Set())); }}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      ) : null}

      {error ? <pre className="mb-3 whitespace-pre-wrap rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</pre> : null}
      {!rows ? <div className="flex justify-center py-20"><Spinner /></div> : rows.length === 0 ? (
        <EmptyState title="No questions match" body="Create a question or import a JSON/CSV file." action={<Link href="/admin/questions/new" className="btn-primary">New question</Link>} />
      ) : (
        <div className="overflow-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-left text-xs uppercase tracking-wider text-mist-500">
              <tr>
                <th className="px-3 py-2"><input type="checkbox" aria-label="Select all" checked={selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Diff.</th>
                <th className="px-3 py-2 text-right">Answers</th>
                <th className="px-3 py-2 text-right">Zero</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cx('border-t border-white/5 hover:bg-white/3', selected.has(r.id) && 'bg-brass-400/5')}>
                  <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${r.text}`} checked={selected.has(r.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} /></td>
                  <td className="px-3 py-2 text-mist-400">{r.category}</td>
                  <td className="px-3 py-2"><Link href={`/admin/questions/${r.id}`} className="hover:underline">{r.text}</Link></td>
                  <td className="px-3 py-2 text-mist-400">{FORMAT_LABELS[r.format]}</td>
                  <td className="px-3 py-2 text-mist-400">{'●'.repeat(r.difficulty)}<span className="text-mist-700">{'●'.repeat(5 - r.difficulty)}</span></td>
                  <td className="tabular px-3 py-2 text-right">{r.answerCount}</td>
                  <td className={cx('tabular px-3 py-2 text-right', r.zeroCount > 0 && 'text-brass-300')}>{r.zeroCount}</td>
                  <td className="px-3 py-2 text-mist-500">{formatDate(r.createdAt)}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status.toLowerCase()}</Badge>{r.usedCount ? <span className="ml-1 text-xs text-mist-500">×{r.usedCount}</span> : null}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/questions/${r.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</Link>
                      <Button size="sm" variant="ghost" onClick={() => void act(() => api(`/api/admin/questions/${r.id}/duplicate`, { method: 'POST' }), 'Duplicated')}>Duplicate</Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this question?')) void act(() => api(`/api/admin/questions/${r.id}`, { method: 'DELETE' }), 'Deleted'); }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import questions">
        <p className="text-sm text-mist-400">JSON: the format produced by Export (an array or <code>{'{ questions: [...] }'}</code>). CSV: columns <code>category, question, instructions, format, difficulty, answer, aliases (| separated), score, correct, poolIndex, boardItem</code>, one row per answer. Imported questions arrive as drafts.</p>
        <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="mt-4 block w-full text-sm" onChange={(e) => e.target.files?.[0] && void onImportFile(e.target.files[0])} aria-label="Import file" />
      </Modal>
      <Toast message={toast} />
    </>
  );
}
