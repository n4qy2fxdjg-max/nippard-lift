'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Modal, Spinner, Toast, cx } from '@/components/ui';
import { DisplayApp } from '@/components/display/DisplayApp';
import { PHASE_LABELS } from '@/lib/game-engine/selectors';
import type { GameAction } from '@/lib/game-engine/types';
import { formatMoney } from '@/lib/game-engine/helpers';
import { debugEnabled } from '@/lib/game/actions-schema';
import { useHost } from './useHost';
import { AudioSettingsPanel, FinalPanel, H2HPanel, QuestionPanel, SHORTCUTS, StandingsPanel, TiebreakPicker, TimerControls, TurnPanel } from './panels';
import { QrCode } from '@/components/game/QrCode';

export function HostApp({ gameId }: { gameId: string }) {
  const host = useHost(gameId);
  const { view, send, undo, busy, toast, notify, token, connection, clockOffset, error } = host;
  const [help, setHelp] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [tiebreakOpen, setTiebreakOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const primary = useCallback(async () => {
    if (!view) return;
    const n = view.next;
    if (!n.enabled) {
      if (n.action === 'START_TIEBREAK') setTiebreakOpen(true);
      else notify(n.hint ?? 'Nothing to do yet');
      return;
    }
    if (n.action === 'NONE') return;
    await send({ type: n.action } as GameAction);
  }, [view, send, notify]);

  // Keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void undo();
        return;
      }
      if (typing) return;
      if (!view) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          void primary();
          break;
        case 'r':
        case 'R':
          if (view.phase === 'ANSWER_LOCKED') void send({ type: 'REVEAL_SCORE' });
          break;
        case 'l':
        case 'L':
          if (['PASS_RESULTS', 'SCORE_REVEALED'].includes(view.phase)) void send({ type: 'SHOW_LEADERBOARD' });
          break;
        case 't':
        case 'T':
          if (view.timer.kind !== 'NONE' && view.timer.running) void send({ type: 'TIMER_PAUSE' });
          else if (view.timer.kind !== 'NONE' && view.timer.remainingMs > 0 && view.timer.remainingMs < view.timer.durationMs) void send({ type: 'TIMER_RESUME' });
          else void send({ type: 'TIMER_START', kind: view.phase.startsWith('FINAL') ? 'FINAL' : 'TEAM', seconds: view.phase.startsWith('FINAL') ? view.fullConfig.finalDiscussionSeconds : view.fullConfig.teamAnswerSeconds || 30 });
          break;
        case 'n':
        case 'N':
          if (view.phase === 'SCORE_REVEALED') void send({ type: 'NEXT_TEAM' });
          break;
        case 'u':
        case 'U':
          void undo();
          break;
        case 'z':
        case 'Z':
          if (debugEnabled()) void send({ type: 'DEBUG_FORCE_SCORE', score: view.forcedScore === 0 ? null : 0 });
          break;
        case '?':
          setHelp((h) => !h);
          break;
        case 'Escape':
          setHelp(false);
          setAudioOpen(false);
          setTiebreakOpen(false);
          setDebugOpen(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, primary, send, undo]);

  const secondary = useMemo(() => {
    if (!view) return [] as { label: string; action: GameAction; variant?: 'secondary' | 'danger' | 'ghost' | 'cyan' }[];
    const list: { label: string; action: GameAction; variant?: 'secondary' | 'danger' | 'ghost' | 'cyan' }[] = [];
    const p = view.phase;
    if (p === 'QUESTION_REVEALED') {
      if (!view.question?.instructions) list.push({ label: 'Show rules', action: { type: 'REVEAL_INSTRUCTIONS' } });
      if (view.question?.boardItems === null) list.push({ label: 'Reveal board', action: { type: 'REVEAL_BOARD' } });
      list.push({ label: 'Open answers', action: { type: 'OPEN_ANSWERS' } });
    }
    if (p === 'ACCEPTING_ANSWER' && view.question?.instructions && !view.question.instructions) list.push({ label: 'Show rules', action: { type: 'REVEAL_INSTRUCTIONS' } });
    if (p === 'ANSWER_LOCKED') list.push({ label: 'Unlock', action: { type: 'UNLOCK_ANSWER' }, variant: 'ghost' });
    if (p === 'SCORE_REVEALED') {
      list.push({ label: 'Next team', action: { type: 'NEXT_TEAM' } });
      list.push({ label: 'Rarest answers', action: { type: 'REVEAL_LOW_ANSWERS' }, variant: 'ghost' });
      list.push({ label: 'End pass', action: { type: 'END_PASS' }, variant: 'ghost' });
    }
    if (p === 'PASS_RESULTS') {
      list.push({ label: 'Rarest answers', action: { type: 'REVEAL_LOW_ANSWERS' } });
      list.push({ label: 'Most common', action: { type: 'REVEAL_HIGH_ANSWERS' } });
      list.push({ label: 'Leaderboard', action: { type: 'SHOW_LEADERBOARD' } });
      list.push({ label: 'End round', action: { type: 'END_ROUND' }, variant: 'ghost' });
    }
    if (p === 'ROUND_RESULTS') {
      if (view.pendingElimination?.tied.length) list.push({ label: 'Pick tie-break question', action: { type: 'ADVANCE' }, variant: 'cyan' });
      list.push({ label: 'Next round', action: { type: 'NEXT_ROUND' }, variant: 'ghost' });
    }
    if (p === 'TIEBREAK_INTRO') list.push({ label: 'Eliminate manually instead…', action: { type: 'ADVANCE' }, variant: 'ghost' });
    if (p === 'ELIMINATION') list.push({ label: 'Next round', action: { type: 'NEXT_ROUND' } });
    if (p === 'FINAL_PROMPTS') list.push({ label: 'Reveal prompts', action: { type: 'FINAL_REVEAL_PROMPTS' }, variant: 'ghost' });
    if (p === 'FINAL_DISCUSSION') list.push({ label: 'Collect answers now', action: { type: 'ADVANCE' } });
    if (p === 'VICTORY' || p === 'DEFEAT') list.push({ label: 'End game', action: { type: 'END_GAME' } });
    return list;
  }, [view]);

  if (token === undefined) return null;
  if (!view) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        {error ? (
          <>
            <p className="text-lg text-rose-400">{error}</p>
            <p className="max-w-md text-sm text-mist-400">The host view needs the host token. Open this game from the <Link href="/host" className="text-cyan-300 underline">host dashboard</Link>, which carries it along.</p>
          </>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }

  const n = view.next;
  const roomUrl = `${origin}/join?code=${view.roomCode}`;
  const displayUrl = `${origin}/display/${view.id}`;

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-mist-100">
      {/* TOP: round / question */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/host" className="font-display text-lg font-semibold tracking-[0.18em]">
            NADIR
          </Link>
          <span className="h-5 w-px bg-white/15" aria-hidden />
          <span className="text-sm font-semibold">{view.name}</span>
          <Badge tone="brass">{view.stageTitle || PHASE_LABELS[view.phase]}</Badge>
          <Badge>{PHASE_LABELS[view.phase]}</Badge>
          {view.forcedScore !== null ? <Badge tone="rose">next score forced to {view.forcedScore}</Badge> : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-display tabular text-lg text-brass-300">{formatMoney(view.jackpot.amount, view.fullConfig.currency)}</span>
          <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-xs tracking-widest">{view.roomCode}</span>
          <span className={cx('h-2 w-2 rounded-full', connection === 'live' ? 'bg-mint-400' : connection === 'offline' ? 'bg-rose-400' : 'bg-brass-400')} title={`Connection: ${connection}`} />
          <TimerControls view={view} send={send} clockOffset={clockOffset} />
          <Button size="sm" variant="ghost" onClick={() => setAudioOpen(true)} aria-label="Sound settings">
            ♪
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts">
            ?
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* CENTER */}
        <main className="flex min-w-0 flex-col gap-3">
          {view.phase === 'LOBBY' ? (
            <div className="card flex flex-wrap items-center gap-6">
              <div className="rounded-xl bg-mist-100 p-2">{origin ? <QrCode value={roomUrl} size={140} /> : null}</div>
              <div className="flex-1">
                <p className="eyebrow">Room code</p>
                <p className="font-display text-5xl font-semibold tracking-[0.25em]">{view.roomCode}</p>
                <p className="mt-1 text-sm text-mist-400">Phones: {roomUrl}</p>
                <p className="text-sm text-mist-400">
                  TV: <a className="text-cyan-300 underline" href={displayUrl} target="_blank" rel="noreferrer">{displayUrl}</a>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {view.teams.map((t) => (
                    <Badge key={t.id} tone={t.connected ? 'mint' : 'neutral'}>
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name} {t.connected ? '· connected' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {view.h2h && (view.phase.startsWith('HEAD_TO_HEAD') || view.stage === 'HEAD_TO_HEAD') ? <H2HPanel view={view} send={send} busy={busy} /> : null}
          {view.final && view.phase.startsWith('FINAL') || view.phase === 'VICTORY' || view.phase === 'DEFEAT' ? <FinalPanel view={view} send={send} busy={busy} /> : null}
          {view.question && !view.phase.startsWith('FINAL') ? <TurnPanel view={view} send={send} busy={busy} /> : null}
          {view.pendingElimination && (view.phase === 'ROUND_RESULTS' || view.phase === 'TIEBREAK_INTRO') ? (
            <div className={cx('card border', view.pendingElimination.tied.length ? 'border-brass-400/40' : 'border-rose-500/40')}>
              {view.pendingElimination.tied.length ? (
                <>
                  <p className="font-semibold text-brass-300">Tied for elimination: {view.pendingElimination.tied.map((id) => view.teams.find((t) => t.id === id)?.name).join(', ')}</p>
                  <p className="mt-1 text-sm text-mist-400">Run a tie-break (recommended) or eliminate a team manually.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => setTiebreakOpen(true)}>Choose tie-break question</Button>
                    {view.pendingElimination.tied.map((id) => (
                      <Button key={id} variant="danger" size="sm" onClick={() => void send({ type: 'ELIMINATE', teamIds: [...view.pendingElimination!.eliminate, id] })}>
                        Eliminate {view.teams.find((t) => t.id === id)?.name}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm">
                  <span className="font-semibold text-rose-400">To be eliminated:</span> {view.pendingElimination.eliminate.map((id) => view.teams.find((t) => t.id === id)?.name).join(', ') || 'nobody'}
                  <span className="ml-2 text-mist-500">Override by eliminating another team:</span>
                  {view.leaderboard.filter((r) => !r.eliminated && !view.pendingElimination!.eliminate.includes(r.teamId)).map((r) => (
                    <Button key={r.teamId} size="sm" variant="ghost" className="ml-1" onClick={() => void send({ type: 'ELIMINATE', teamIds: [r.teamId] })}>
                      {r.name}
                    </Button>
                  ))}
                </p>
              )}
            </div>
          ) : null}
          <div className="min-h-[18rem] flex-1">{view.question && !view.phase.startsWith('FINAL') ? <QuestionPanel view={view} /> : view.phase === 'LOBBY' ? <LobbyHelp /> : null}</div>
          <StandingsPanel view={view} />
        </main>

        {/* RIGHT: controls */}
        <aside className="flex flex-col gap-3">
          <div className="card space-y-2">
            <Button variant="primary" size="lg" className="w-full" onClick={() => void primary()} disabled={busy || (!n.enabled && n.action !== 'START_TIEBREAK')} loading={busy}>
              {n.action === 'START_TIEBREAK' ? 'Choose tie-break question' : n.label}
              <span className="kbd ml-2">Space</span>
            </Button>
            {n.hint && !n.enabled ? <p className="text-center text-xs text-mist-500">{n.hint}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((b) => (
                <Button key={b.label} variant={b.variant ?? 'secondary'} size="sm" onClick={() => void send(b.action)} disabled={busy}>
                  {b.label}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => void undo()} disabled={busy}>
              Undo last action <span className="kbd ml-2">U</span>
            </Button>
          </div>

          <div className="card p-0">
            <button className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-mist-400" onClick={() => setPreviewOpen((o) => !o)} aria-expanded={previewOpen}>
              TV preview <span>{previewOpen ? '−' : '+'}</span>
            </button>
            {previewOpen ? (
              <ScaledPreview gameId={view.id} />
            ) : null}
          </div>

          <div className="card">
            <p className="eyebrow">Recent events</p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-xs text-mist-400">
              {[...view.log].reverse().map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="tabular shrink-0 text-mist-600">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className={cx(e.type === 'JACKPOT_CHANGED' && 'text-brass-300', e.type === 'TEAM_ELIMINATED' && 'text-rose-400')}>{e.summary}</span>
                </li>
              ))}
            </ul>
          </div>

          {debugEnabled() ? (
            <div className="card">
              <button className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-mist-400" onClick={() => setDebugOpen((o) => !o)} aria-expanded={debugOpen}>
                Demo / debug <span>{debugOpen ? '−' : '+'}</span>
              </button>
              {debugOpen ? <DebugPanel view={view} send={send} /> : null}
            </div>
          ) : null}
        </aside>
      </div>

      <TiebreakPicker view={view} send={send} open={tiebreakOpen} onClose={() => setTiebreakOpen(false)} hostToken={token ?? null} />
      <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
        <ul className="space-y-2">
          {SHORTCUTS.map(([k, d]) => (
            <li key={k} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-mist-300">{d}</span>
              <span className="kbd">{k}</span>
            </li>
          ))}
        </ul>
      </Modal>
      <Modal open={audioOpen} onClose={() => setAudioOpen(false)} title="Sound">
        <AudioSettingsPanel />
        <p className="mt-3 text-xs text-mist-500">These settings apply to this device. Set them on the TV browser too (tap the screen once to enable sound there).</p>
      </Modal>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  );
}

/** Renders the real TV display at 1920×1080 and scales it to the panel width. */
function ScaledPreview({ gameId }: { gameId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    setScale(el.clientWidth / 1920);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="pointer-events-none overflow-hidden rounded-b-2xl border-t border-white/10 bg-ink-950" style={{ height: 1080 * scale }} aria-label="Preview of the TV display">
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <DisplayApp gameId={gameId} embedded />
      </div>
    </div>
  );
}

function LobbyHelp() {
  return (
    <div className="card h-full text-sm text-mist-400">
      <p className="eyebrow">Before you start</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Open the TV link on the big screen (full-screen the browser, tap once to allow sound).</li>
        <li>Teams scan the QR code or type the room code at /join and pick their team.</li>
        <li>Press <span className="kbd">Space</span> to start. Space always does the next sensible thing; the right-hand panel shows what that is.</li>
        <li>You can type answers for a team at any time, override any score, and undo any action.</li>
      </ol>
    </div>
  );
}

function DebugPanel({ view, send }: { view: ReturnType<typeof useHost>['view'] & object; send: (a: GameAction) => Promise<unknown> }) {
  return (
    <div className="mt-2 space-y-2 text-xs">
      <p className="text-mist-500">Force the next locked answer’s score:</p>
      <div className="flex flex-wrap gap-1">
        {[100, 50, 25, 10, 5, 1, 0].map((s) => (
          <Button key={s} size="sm" variant={view.forcedScore === s ? 'primary' : 'secondary'} onClick={() => void send({ type: 'DEBUG_FORCE_SCORE', score: view.forcedScore === s ? null : s })}>
            {s}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 pt-1">
        <Button size="sm" variant="ghost" onClick={() => void send({ type: 'DEBUG_SKIP_TO_H2H' })}>Skip to Head-to-Head</Button>
        <Button size="sm" variant="ghost" onClick={() => void send({ type: 'DEBUG_SKIP_TO_FINAL' })}>Skip to Final</Button>
        <Button size="sm" variant="ghost" onClick={() => void send({ type: 'DEBUG_FORCE_FINAL', outcome: 'WON' })}>Force jackpot win</Button>
        <Button size="sm" variant="ghost" onClick={() => void send({ type: 'DEBUG_FORCE_FINAL', outcome: 'LOST' })}>Force jackpot loss</Button>
      </div>
    </div>
  );
}
