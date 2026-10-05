'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createActionClient, useGameChannel } from '@/lib/realtime/client';
import type { HostView } from '@/lib/game-engine/views';
import { revealDurationMs } from '@/lib/game-engine/selectors';
import type { GameAction } from '@/lib/game-engine/types';

const tokenKey = (gameId: string) => `nadir.host.${gameId}`;

export function readHostToken(gameId: string): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('t');
  if (fromUrl) {
    try {
      window.localStorage.setItem(tokenKey(gameId), fromUrl);
    } catch {
      /* ignore */
    }
    url.searchParams.delete('t');
    window.history.replaceState({}, '', url.toString());
    return fromUrl;
  }
  try {
    return window.localStorage.getItem(tokenKey(gameId));
  } catch {
    return null;
  }
}

export function useHost(gameId: string) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(readHostToken(gameId)), [gameId]);
  const channel = useGameChannel<HostView>({ gameId, role: 'host', hostToken: token ?? null, enabled: token !== undefined });
  const client = useMemo(() => createActionClient({ gameId, role: 'host', hostToken: token ?? null }), [gameId, token]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'neutral' | 'rose' | 'mint' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, tone: 'neutral' | 'rose' | 'mint' = 'neutral') => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const send = useCallback(
    async (action: GameAction, opts: { silent?: boolean } = {}) => {
      setBusy(true);
      try {
        const view = (await client.send(action as unknown as Record<string, unknown>)) as HostView;
        channel.setView(view);
        return view;
      } catch (e) {
        if (!opts.silent) notify(e instanceof Error ? e.message : 'Action failed', 'rose');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [client, channel, notify],
  );

  const undo = useCallback(async () => {
    setBusy(true);
    try {
      const view = (await client.undo()) as HostView;
      channel.setView(view);
      notify('Undone', 'mint');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Undo failed', 'rose');
    } finally {
      setBusy(false);
    }
  }, [client, channel, notify]);

  // Auto-complete reveal animations so the engine moves on in step with the TV.
  const view = channel.view;
  useEffect(() => {
    if (!view) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const now = Date.now() + channel.clockOffset;
    if (view.phase === 'REVEALING_SCORE' && view.currentSubmission?.revealStartedAt) {
      const dur = revealDurationMs(view.currentSubmission.score, view.fullConfig.animations) + 350;
      const wait = Math.max(50, view.currentSubmission.revealStartedAt + dur - now);
      timer = setTimeout(() => void send({ type: 'SCORE_REVEAL_COMPLETE' }, { silent: true }), wait);
    }
    if (view.phase === 'FINAL_REVEAL' && view.final && view.final.revealedCount > view.final.completedCount) {
      const r = view.final.fullResults[view.final.completedCount];
      const dur = revealDurationMs(r.score, view.fullConfig.animations) + 800 + 350;
      const wait = Math.max(50, (r.revealStartedAt ?? now) + dur - now);
      timer = setTimeout(() => void send({ type: 'FINAL_REVEAL_COMPLETE' }, { silent: true }), wait);
    }
    if (view.phase === 'FINAL_DISCUSSION' && view.timer.running && view.timer.endsAt) {
      const wait = Math.max(50, view.timer.endsAt - now + 200);
      timer = setTimeout(() => void send({ type: 'ADVANCE' }, { silent: true }), wait);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [view, channel.clockOffset, send]);

  return { ...channel, token, send, undo, busy, toast, notify };
}
