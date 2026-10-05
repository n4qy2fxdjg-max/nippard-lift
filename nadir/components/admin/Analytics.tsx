'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, useAdminApi } from './AdminShell';

interface Data {
  gamesPlayed: number;
  gamesCompleted: number;
  teamsPlayed: number;
  answersGiven: number;
  averageAnswerScore: number;
  zeroAnswers: number;
  finalWinRate: number | null;
  averageJackpot: number | null;
  mostPlayedCategories: { name: string; count: number }[];
  mostUsedQuestions: { id: string; text: string; category: string; usedCount: number }[];
  hardestQuestions: { id: string; text: string; averageScore: number; plays: number }[];
  easiestQuestions: { id: string; text: string; averageScore: number; plays: number }[];
}

export function Analytics() {
  const api = useAdminApi();
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Data>('/api/admin/analytics').then(setD).catch((e) => setError(e.message));
  }, [api]);
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!d) return <p className="text-mist-400">Loading…</p>;
  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="card"><p className="eyebrow">{label}</p><p className="font-display tabular mt-1 text-3xl">{value}</p></div>
  );
  const List = ({ title, rows }: { title: string; rows: { id: string; text: string; meta: string }[] }) => (
    <section className="card">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-mist-500">Not enough data yet.</p> : (
        <ol className="mt-2 space-y-1 text-sm">{rows.map((r) => <li key={r.id} className="flex items-center justify-between gap-3"><Link href={`/admin/questions/${r.id}`} className="truncate hover:underline">{r.text}</Link><span className="shrink-0 text-xs text-mist-500">{r.meta}</span></li>)}</ol>
      )}
    </section>
  );
  return (
    <>
      <PageHeader eyebrow="Admin" title="Analytics"><p className="mt-1 text-sm text-mist-400">Computed from completed games.</p></PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Games played" value={d.gamesPlayed} />
        <Stat label="Games completed" value={d.gamesCompleted} />
        <Stat label="Teams played" value={d.teamsPlayed} />
        <Stat label="Answers given" value={d.answersGiven} />
        <Stat label="Average answer score" value={d.answersGiven ? d.averageAnswerScore : '–'} />
        <Stat label="Zero answers" value={d.zeroAnswers} />
        <Stat label="Final win rate" value={d.finalWinRate === null ? '–' : `${Math.round(d.finalWinRate * 100)}%`} />
        <Stat label="Average jackpot at stake" value={d.averageJackpot === null ? '–' : d.averageJackpot.toLocaleString()} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Most played categories</h2>
          {d.mostPlayedCategories.length === 0 ? <p className="mt-2 text-sm text-mist-500">No games completed yet.</p> : (
            <ul className="mt-3 space-y-2">{d.mostPlayedCategories.map((c) => { const max = d.mostPlayedCategories[0].count; return <li key={c.name} className="text-sm"><div className="flex justify-between"><span>{c.name}</span><span className="tabular text-mist-400">{c.count}</span></div><div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${(c.count / max) * 100}%` }} /></div></li>; })}</ul>
          )}
        </section>
        <List title="Most used questions" rows={d.mostUsedQuestions.map((q) => ({ id: q.id, text: q.text, meta: `${q.usedCount}×` }))} />
        <List title="Hardest questions (highest average score)" rows={d.hardestQuestions.map((q) => ({ id: q.id, text: q.text, meta: `avg ${q.averageScore} · ${q.plays} plays` }))} />
        <List title="Easiest questions (lowest average score)" rows={d.easiestQuestions.map((q) => ({ id: q.id, text: q.text, meta: `avg ${q.averageScore} · ${q.plays} plays` }))} />
      </div>
    </>
  );
}
