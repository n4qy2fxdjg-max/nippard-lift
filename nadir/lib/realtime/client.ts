'use client';
/**
 * Client-side realtime: subscribes to the game's SSE stream and re-fetches the role-scoped
 * view whenever the version changes. Falls back to polling when SSE is unavailable
 * (serverless hosting, proxies) and always polls slowly as a safety net.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'offline';

export interface GameChannelOptions {
  gameId: string;
  role: 'display' | 'host' | 'team';
  teamId?: string | null;
  hostToken?: string | null;
  teamToken?: string | null;
  /** Interval (ms) for the fallback poll. */
  pollMs?: number;
  enabled?: boolean;
}

export interface GameChannel<V> {
  view: V | null;
  error: string | null;
  connection: ConnectionState;
  refresh: () => Promise<void>;
  /** Clock offset: serverNow - clientNow, for timers. */
  clockOffset: number;
  setView: (v: V) => void;
}

export function authHeaders(opts: Pick<GameChannelOptions, 'hostToken' | 'teamToken'>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.hostToken) h['x-host-token'] = opts.hostToken;
  if (opts.teamToken) h['x-team-token'] = opts.teamToken;
  return h;
}

export function useGameChannel<V extends { version: number; serverNow?: number }>(opts: GameChannelOptions): GameChannel<V> {
  const { gameId, role, teamId, hostToken, teamToken, pollMs = 2500, enabled = true } = opts;
  const [view, setViewState] = useState<V | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [clockOffset, setClockOffset] = useState(0);
  const versionRef = useRef(-1);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (inflight.current) return inflight.current;
    const p = (async () => {
      try {
        const params = new URLSearchParams({ role });
        if (teamId) params.set('teamId', teamId);
        const res = await fetch(`/api/games/${gameId}/view?${params}`, { headers: authHeaders({ hostToken, teamToken }), cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as V;
        if (typeof data.serverNow === 'number') setClockOffset(data.serverNow - Date.now());
        if (data.version >= versionRef.current) {
          versionRef.current = data.version;
          setViewState(data);
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection problem');
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, [enabled, gameId, role, teamId, hostToken, teamToken]);

  const setView = useCallback((v: V) => {
    if (v.version >= versionRef.current) {
      versionRef.current = v.version;
      setViewState(v);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let stopped = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    void refresh();

    const startPolling = (ms: number) => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => void refresh(), ms);
    };

    const connect = () => {
      if (stopped || typeof EventSource === 'undefined') {
        setConnection('polling');
        startPolling(pollMs);
        return;
      }
      es = new EventSource(`/api/games/${gameId}/stream`);
      es.addEventListener('hello', () => {
        failures = 0;
        setConnection('live');
        startPolling(15000); // slow safety-net poll while live
        void refresh();
      });
      es.addEventListener('change', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { version: number };
          if (data.version > versionRef.current) void refresh();
        } catch {
          void refresh();
        }
      });
      es.onerror = () => {
        es?.close();
        es = null;
        failures++;
        setConnection(failures > 2 ? 'polling' : 'connecting');
        startPolling(pollMs);
        reconnectTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(failures, 5)));
      };
    };
    connect();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onOnline = () => {
      setConnection('connecting');
      void refresh();
    };
    const onOffline = () => setConnection('offline');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [enabled, gameId, pollMs, refresh]);

  return { view, error, connection, refresh, clockOffset, setView };
}

export interface ActionClient {
  send: (action: Record<string, unknown>) => Promise<unknown>;
  undo: () => Promise<unknown>;
}

export function createActionClient(opts: { gameId: string; role: 'host' | 'team'; teamId?: string | null; hostToken?: string | null; teamToken?: string | null }): ActionClient {
  const headers = authHeaders(opts);
  return {
    async send(action) {
      const res = await fetch(`/api/games/${opts.gameId}/actions`, { method: 'POST', headers, body: JSON.stringify({ role: opts.role, teamId: opts.teamId ?? undefined, action }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Action failed (${res.status})`);
      return body;
    },
    async undo() {
      const res = await fetch(`/api/games/${opts.gameId}/undo`, { method: 'POST', headers });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Undo failed');
      return body;
    },
  };
}

/** Remaining ms on a server-authoritative timer, corrected for clock offset. */
export function timerRemainingMs(timer: { running: boolean; endsAt: number | null; remainingMs: number; kind: string }, clockOffset: number, now = Date.now()): number {
  if (timer.kind === 'NONE') return 0;
  if (!timer.running || timer.endsAt === null) return Math.max(0, timer.remainingMs);
  return Math.max(0, timer.endsAt - (now + clockOffset));
}
