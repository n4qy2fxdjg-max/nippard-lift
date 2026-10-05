'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, EmptyState, Spinner, cx } from '@/components/ui';
import { formatMoney } from '@/lib/game-engine/helpers';
import { formatDate } from '@/lib/util/format';
import { AdminGate } from './AdminGate';
import { Wordmark } from '@/components/display/parts';

interface GameRow {
  id: string;
  name: string;
  roomCode: string;
  status: string;
  currency: string;
  createdAt: string;
  completedAt: string | null;
  zeroCount: number;
  finalJackpot: number | null;
  jackpotWon: boolean | null;
  winnerTeamId: string | null;
  hostToken: string;
  teams: { id: string; name: string; color: string }[];
}

export function HostDashboard() {
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [banks, setBanks] = useState<{ currency: string; amount: number }[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const res = await fetch('/api/games', { cache: 'no-store' });
    if (res.status === 401) return setLocked(true);
    if (!res.ok) return setError('Could not load games');
    const body = await res.json();
    setGames(body.games);
    setBanks(body.banks);
    setLocked(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (locked) return <AdminGate onUnlocked={() => void load()} />;
  const live = games?.filter((g) => g.status === 'LOBBY' || g.status === 'LIVE') ?? [];
  const done = games?.filter((g) => g.status === 'COMPLETED') ?? [];
  const openHost = (g: GameRow) => `/host/${g.id}?t=${g.hostToken}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Wordmark className="text-lg" />
          <h1 className="font-display mt-3 text-3xl font-semibold">Host dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {banks.map((b) => (
            <div key={b.currency} className="text-right">
              <p className="eyebrow">Next jackpot</p>
              <p className="font-display tabular text-2xl text-brass-300">{formatMoney(b.amount, b.currency)}</p>
            </div>
          ))}
          <Link href="/host/new" className="btn-primary">
            New game
          </Link>
          <Link href="/admin" className="btn-secondary">
            Admin
          </Link>
        </div>
      </header>

      {error ? <p className="mt-6 text-rose-400">{error}</p> : null}
      {!games ? (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <section className="mt-8">
            <p className="eyebrow">Live and upcoming</p>
            {live.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No game in progress" body="Create a game to get a room code and a TV link." action={<Link href="/host/new" className="btn-primary">New game</Link>} />
              </div>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {live.map((g) => (
                  <li key={g.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{g.name}</p>
                        <p className="text-xs text-mist-500">{formatDate(g.createdAt)}</p>
                      </div>
                      <Badge tone={g.status === 'LIVE' ? 'mint' : 'cyan'}>{g.status === 'LIVE' ? 'In progress' : 'Lobby'}</Badge>
                    </div>
                    <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{g.roomCode}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.teams.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={openHost(g)} className="btn-primary">
                        {g.status === 'LIVE' ? 'Resume hosting' : 'Open host'}
                      </Link>
                      <a href={`/display/${g.id}`} target="_blank" rel="noreferrer" className="btn-secondary">
                        TV display ↗
                      </a>
                      <Button variant="ghost" size="sm" onClick={async () => { if (confirm(`Delete "${g.name}"? This cannot be undone.`)) { await fetch(`/api/games/${g.id}`, { method: 'DELETE' }); void load(); } }}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Completed games</p>
              <Link href="/admin/history" className="text-sm text-cyan-300 underline">
                Full history
              </Link>
            </div>
            {done.length === 0 ? (
              <p className="mt-3 text-sm text-mist-500">No completed games yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
                {done.slice(0, 12).map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-mist-500">{g.completedAt ? formatDate(g.completedAt) : ''} · {g.teams.length} teams · {g.zeroCount} zero</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cx('font-display tabular', g.jackpotWon ? 'text-brass-300' : 'text-mist-400')}>{g.finalJackpot !== null ? formatMoney(g.finalJackpot, g.currency) : ''}</span>
                      <Badge tone={g.jackpotWon ? 'brass' : 'neutral'}>{g.jackpotWon ? 'Jackpot won' : 'Rolled over'}</Badge>
                      <span className="text-mist-300">{g.teams.find((t) => t.id === g.winnerTeamId)?.name ?? ''}</span>
                      <Link href={`/admin/history/${g.id}`} className="text-cyan-300 underline">
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
