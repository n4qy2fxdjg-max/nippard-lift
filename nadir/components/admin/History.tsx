'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, cx } from '@/components/ui';
import { formatMoney } from '@/lib/game-engine/helpers';
import { formatDate } from '@/lib/util/format';
import { PageHeader, useAdminApi } from './AdminShell';

interface Row {
  id: string;
  name: string;
  currency: string;
  completedAt: string | null;
  createdAt: string;
  finalJackpot: number | null;
  jackpotWon: boolean | null;
  zeroCount: number;
  winner: string | null;
  teams: { id: string; name: string; color: string }[];
  _count: { answers: number };
}

export function HistoryList() {
  const api = useAdminApi();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    api<Row[]>('/api/admin/history').then(setRows).catch(() => setRows([]));
  }, [api]);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Game history" />
      {rows && rows.length === 0 ? <EmptyState title="No completed games" body="Finished games appear here with every answer and score." /> : null}
      <ul className="space-y-2">
        {rows?.map((g) => (
          <li key={g.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/admin/history/${g.id}`} className="font-semibold hover:underline">{g.name}</Link>
              <p className="text-xs text-mist-500">{g.completedAt ? formatDate(g.completedAt) : formatDate(g.createdAt)} · {g.teams.length} teams · {g._count.answers} answers · {g.zeroCount} zero</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span>Winner: <span className="font-semibold">{g.winner ?? '—'}</span></span>
              <span className={cx('font-display tabular', g.jackpotWon ? 'text-brass-300' : 'text-mist-400')}>{g.finalJackpot !== null ? formatMoney(g.finalJackpot, g.currency) : ''}</span>
              <Badge tone={g.jackpotWon ? 'brass' : 'neutral'}>{g.jackpotWon ? 'Jackpot won' : 'Rolled over'}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

interface Detail {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  completedAt: string | null;
  finalJackpot: number | null;
  jackpotWon: boolean | null;
  zeroCount: number;
  winnerTeamId: string | null;
  teams: { id: string; name: string; color: string; eliminatedRound: number | null; players: { name: string }[] }[];
  answers: { id: string; teamId: string; stage: string; roundIndex: number; passIndex: number; submitted: string; score: number; correct: boolean; isZero: boolean; overridden: boolean; question: { text: string; category: string } }[];
  rounds: { index: number; type: string; passes: number; questions: { id: string; text: string; category: string; format: string; role: string }[] }[];
  roundScores: Record<string, Record<string, (number | null)[]>>;
  jackpotHistory: { at: number; delta: number; reason: string; amount: number }[];
  final: { chosenCategoryId: string | null; outcome: string | null; results: { text: string; canonical: string | null; score: number; correct: boolean; isZero: boolean }[] } | null;
  events: { seq: number; type: string; actor: string; createdAt: string; payload: unknown }[];
}

export function HistoryDetail({ id }: { id: string }) {
  const api = useAdminApi();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Detail>(`/api/admin/history/${id}`).then(setD).catch((e) => setError(e.message));
  }, [api, id]);
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!d) return <p className="text-mist-400">Loading…</p>;
  const team = (tid: string) => d.teams.find((t) => t.id === tid);
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/history" className="hover:underline">← History</Link> as unknown as string} title={d.name}>
        <p className="mt-1 text-sm text-mist-400">{d.completedAt ? `Completed ${formatDate(d.completedAt)}` : 'In progress'} · winner {team(d.winnerTeamId ?? '')?.name ?? '—'} · {d.zeroCount} zero answers · {d.finalJackpot !== null ? `${formatMoney(d.finalJackpot, d.currency)} ${d.jackpotWon ? 'won' : 'rolled over'}` : ''}</p>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="card">
            <h2 className="font-semibold">Scores by round <span className="text-sm text-mist-500">(lower is better)</span></h2>
            <div className="mt-2 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-mist-500"><tr><th className="py-1">Team</th>{Object.keys(d.roundScores).map((r) => <th key={r} className="py-1 text-right">R{Number(r) + 1}</th>)}<th className="py-1 text-right">Total</th><th className="py-1">Result</th></tr></thead>
                <tbody>
                  {d.teams.map((t) => {
                    const totals = Object.values(d.roundScores).map((rs) => (rs[t.id] ?? []).reduce<number>((a, s) => a + (s ?? 0), 0));
                    return (
                      <tr key={t.id} className="border-t border-white/5">
                        <td className="py-1.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}<span className="ml-2 text-xs text-mist-500">{t.players.map((p) => p.name).join(', ')}</span></td>
                        {Object.keys(d.roundScores).map((r, i) => <td key={r} className="tabular py-1.5 text-right">{(d.roundScores[r][t.id] ?? []).some((s) => s !== null) ? totals[i] : <span className="text-mist-600">–</span>}</td>)}
                        <td className="tabular py-1.5 text-right font-semibold">{totals.reduce((a, b) => a + b, 0)}</td>
                        <td className="py-1.5">{t.id === d.winnerTeamId ? <Badge tone="brass">finalist</Badge> : t.eliminatedRound !== null ? <span className="text-xs text-mist-500">out in round {t.eliminatedRound + 1}</span> : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card">
            <h2 className="font-semibold">Every answer ({d.answers.length})</h2>
            <div className="mt-2 max-h-[32rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-mist-500"><tr><th className="py-1">Stage</th><th className="py-1">Team</th><th className="py-1">Question</th><th className="py-1">Answer</th><th className="py-1 text-right">Score</th></tr></thead>
                <tbody>
                  {d.answers.map((a) => (
                    <tr key={a.id} className="border-t border-white/5">
                      <td className="py-1 text-xs text-mist-500">{a.stage === 'ELIMINATION' ? `R${a.roundIndex + 1}${a.passIndex ? ` P${a.passIndex + 1}` : ''}` : a.stage.replace('_', ' ').toLowerCase()}</td>
                      <td className="py-1">{team(a.teamId)?.name}</td>
                      <td className="py-1 text-mist-400">{a.question.text}</td>
                      <td className={cx('py-1', !a.correct && 'text-rose-400 line-through')}>{a.submitted}{a.overridden ? <span className="ml-1 text-xs text-brass-300">(host override)</span> : null}</td>
                      <td className={cx('tabular py-1 text-right font-semibold', a.isZero && 'text-brass-300')}>{a.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {d.final ? (
            <section className="card">
              <h2 className="font-semibold">Final · {d.final.outcome === 'WON' ? 'jackpot won' : d.final.outcome === 'LOST' ? 'jackpot lost' : 'not completed'}</h2>
              <ol className="mt-2 space-y-1 text-sm">{d.final.results.map((r, i) => <li key={i} className="flex justify-between"><span className={cx(!r.correct && 'text-rose-400 line-through')}>{r.text || '—'}{r.canonical && r.canonical !== r.text ? <span className="text-mist-500"> → {r.canonical}</span> : null}</span><span className={cx('tabular font-semibold', r.isZero && 'text-brass-300')}>{r.score}</span></li>)}</ol>
            </section>
          ) : null}
        </div>
        <aside className="space-y-4">
          <section className="card">
            <p className="eyebrow">Jackpot</p>
            <ul className="mt-2 space-y-1 text-sm">{d.jackpotHistory.map((h, i) => <li key={i} className="flex justify-between gap-2"><span className="text-mist-400">{h.reason}</span><span className="tabular">{formatMoney(h.amount, d.currency)}</span></li>)}</ul>
          </section>
          <section className="card">
            <p className="eyebrow">Questions used</p>
            <ul className="mt-2 space-y-1 text-sm">{d.rounds.flatMap((r) => r.questions.map((q) => ({ ...q, round: r })) ).map((q) => <li key={`${q.round.index}-${q.id}-${q.role}`}><span className="text-xs text-mist-500">{q.round.type === 'FINAL' ? 'Final' : q.round.type === 'HEAD_TO_HEAD' ? 'H2H' : `R${q.round.index + 1}`}{q.role === 'TIEBREAK' ? ' tb' : ''} · </span><Link href={`/admin/questions/${q.id}`} className="hover:underline">{q.text}</Link></li>)}</ul>
          </section>
          <section className="card">
            <p className="eyebrow">Event log ({d.events.length})</p>
            <ul className="mt-2 max-h-72 space-y-0.5 overflow-auto font-mono text-[11px] text-mist-400">{d.events.map((e) => <li key={e.seq}>{e.seq}. {e.type} <span className="text-mist-600">{e.actor}</span></li>)}</ul>
          </section>
        </aside>
      </div>
    </>
  );
}
