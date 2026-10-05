'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, cx } from '@/components/ui';
import { Wordmark } from '@/components/display/parts';

interface Lookup {
  gameId: string;
  name: string;
  status: string;
  teams: { id: string; name: string; color: string; players: string[] }[];
}

export function saveTeamSession(gameId: string, teamId: string, token: string, teamName: string) {
  try {
    window.localStorage.setItem(`nadir.team.${gameId}`, JSON.stringify({ teamId, token, teamName }));
    window.localStorage.setItem('nadir.team.last', JSON.stringify({ gameId, teamId }));
  } catch {
    /* ignore */
  }
}

export function readTeamSession(gameId: string): { teamId: string; token: string; teamName: string } | null {
  try {
    const raw = window.localStorage.getItem(`nadir.team.${gameId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase());
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const find = async (c: string) => {
    if (c.length < 5) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/join?code=${encodeURIComponent(c)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Room not found');
      setLookup(body);
    } catch (e) {
      setLookup(null);
      setError(e instanceof Error ? e.message : 'Could not find that room');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const c = params.get('code');
    if (c && c.length >= 5) void find(c.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async (teamId: string) => {
    if (!lookup) return;
    setJoining(teamId);
    setError(null);
    try {
      const res = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, teamId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not join');
      saveTeamSession(body.gameId, body.teamId, body.token, body.teamName);
      router.push(`/play/${body.gameId}/${body.teamId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join');
      setJoining(null);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <Wordmark className="justify-center text-xl" />
      <h1 className="font-display mt-6 text-center text-3xl font-semibold">Join the game</h1>
      <p className="mt-1 text-center text-sm text-mist-400">Enter the room code shown on the TV.</p>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void find(code);
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} placeholder="ROOM CODE" className="text-center font-mono text-2xl tracking-[0.4em] uppercase" inputMode="text" autoCapitalize="characters" autoComplete="off" aria-label="Room code" autoFocus />
        <Button type="submit" variant="primary" loading={busy} disabled={code.length < 5}>
          Find
        </Button>
      </form>
      {error ? (
        <p className="mt-3 text-center text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {lookup ? (
        <div className="mt-6">
          <p className="eyebrow text-center">{lookup.name} · choose your team</p>
          <ul className="mt-3 space-y-2">
            {lookup.teams.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => void join(t.id)} disabled={joining !== null} className={cx('glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-white/10 active:scale-[0.99]', joining === t.id && 'border-brass-400/60')}>
                  <span className="h-4 w-4 rounded-full" style={{ background: t.color }} aria-hidden />
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">{t.name}</span>
                    {t.players.length ? <span className="block text-xs text-mist-400">{t.players.join(' · ')}</span> : null}
                  </span>
                  <span className="text-mist-500">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
