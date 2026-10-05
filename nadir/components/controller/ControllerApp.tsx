'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { createActionClient, timerRemainingMs, useGameChannel } from '@/lib/realtime/client';
import type { TeamView } from '@/lib/game-engine/views';
import { Button, Input, Spinner, cx } from '@/components/ui';
import { BoardGrid } from '@/components/game/BoardGrid';
import { ScoreMeter } from '@/components/game/ScoreMeter';
import { revealDurationMs } from '@/lib/game-engine/selectors';
import { formatMoney } from '@/lib/game-engine/helpers';
import { formatClock } from '@/lib/util/format';
import { readTeamSession } from './JoinForm';
import { useReducedMotion } from '@/lib/util/motion';

export function ControllerApp({ gameId, teamId }: { gameId: string; teamId: string }) {
  const [session, setSession] = useState<{ token: string; teamName: string } | null | undefined>(undefined);
  useEffect(() => {
    const s = readTeamSession(gameId);
    setSession(s && s.teamId === teamId ? { token: s.token, teamName: s.teamName } : null);
  }, [gameId, teamId]);
  const channel = useGameChannel<TeamView>({ gameId, role: 'team', teamId, teamToken: session?.token ?? null, enabled: !!session, pollMs: 2000 });
  const client = useMemo(() => createActionClient({ gameId, role: 'team', teamId, teamToken: session?.token ?? null }), [gameId, teamId, session?.token]);
  const { view, error, connection, clockOffset } = channel;
  const reducedMotion = useReducedMotion();
  const [text, setText] = useState('');
  const [boardItemId, setBoardItemId] = useState<string | null>(null);
  const [player, setPlayer] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [finalAnswers, setFinalAnswers] = useState<string[]>([]);
  const [finalSaved, setFinalSaved] = useState(false);
  const turnKey = useRef<string>('');

  // Presence heartbeat
  useEffect(() => {
    if (!session) return;
    const ping = (connected: boolean) => client.send({ type: 'TEAM_PRESENCE', teamId, connected }).catch(() => undefined);
    void ping(true);
    const i = setInterval(() => void ping(true), 45000);
    const bye = () => void ping(false);
    window.addEventListener('pagehide', bye);
    return () => {
      clearInterval(i);
      window.removeEventListener('pagehide', bye);
    };
  }, [session, client, teamId]);

  // Reset the input when a new turn begins for us.
  useEffect(() => {
    if (!view) return;
    const key = `${view.question?.id}:${view.currentPoolIndex}:${view.phase === 'ACCEPTING_ANSWER'}`;
    if (view.isMyTurn && key !== turnKey.current) {
      turnKey.current = key;
      setText(view.mySubmission?.text ?? '');
      setBoardItemId(view.mySubmission?.boardItemId ?? null);
      setSent(!!(view.mySubmission?.text || view.mySubmission?.boardItemId));
      setErr(null);
    }
  }, [view]);

  useEffect(() => {
    if (view?.final) setFinalAnswers((prev) => Array.from({ length: view.final!.answerCount }, (_, i) => prev[i] ?? view.final!.answers[i]?.text ?? ''));
  }, [view?.final]);

  const submit = useCallback(async () => {
    if (!view?.question) return;
    setSending(true);
    setErr(null);
    try {
      const v = (await client.send({ type: 'SUBMIT_ANSWER', teamId, text, boardItemId, playerName: player || undefined, by: 'TEAM' })) as TeamView;
      channel.setView(v);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }, [view, client, teamId, text, boardItemId, player, channel]);

  if (session === undefined) return null;
  if (session === null) {
    return (
      <Shell>
        <p className="text-center text-mist-300">This phone hasn’t joined that team yet.</p>
        <Link href="/join" className="btn-primary mt-4 w-full">
          Join a game
        </Link>
      </Shell>
    );
  }
  if (!view) {
    return (
      <Shell>
        {error ? (
          <>
            <p className="text-center text-rose-400">{error}</p>
            <Link href="/join" className="btn-secondary mt-4 w-full">
              Back to join
            </Link>
          </>
        ) : (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}
      </Shell>
    );
  }

  const q = view.question;
  const needsBoard = q && q.format !== 'OPEN' && q.format !== 'LINKED';
  const needsText = q && q.format !== 'BOARD';
  const canSubmit = !!q && (!needsText || text.trim()) && (!needsBoard || boardItemId) && !view.mySubmission?.locked;

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: view.team.color }} aria-hidden />
          <h1 className="text-lg font-semibold">{view.team.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-mist-400">
          <span>{view.stageTitle}</span>
          <span className={cx('h-2 w-2 rounded-full', connection === 'live' ? 'bg-mint-400' : connection === 'offline' ? 'bg-rose-400' : 'bg-brass-400')} aria-label={`Connection ${connection}`} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={view.phase + String(view.isMyTurn)} initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="mt-5 flex-1">
          {view.eliminated ? (
            <Card title="Thanks for playing" body="Your team has been eliminated. Watch the rest on the big screen." />
          ) : view.phase === 'LOBBY' ? (
            <Card title="You’re in" body="Keep this screen open. When it’s your turn the answer box appears here." />
          ) : view.phase === 'ACCEPTING_ANSWER' && view.isMyTurn && q ? (
            <div>
              <p className="eyebrow">{q.category}{view.poolLabel ? ` · ${view.poolLabel}` : ''}</p>
              <p className="font-display mt-1 text-xl font-semibold leading-snug">{q.text}</p>
              {q.instructions ? <p className="mt-1 text-sm text-mist-400">{q.instructions}</p> : null}
              {needsBoard && q.boardItems ? (
                <div className="mt-3">
                  <BoardGrid question={q} items={q.boardItems} size="phone" selectedId={boardItemId} onSelect={(id) => { setBoardItemId(id); setSent(false); }} reducedMotion={reducedMotion} />
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                {needsText ? <Input value={text} onChange={(e) => { setText(e.target.value); setSent(false); }} placeholder="Your answer" className="text-lg" autoComplete="off" autoCorrect="off" aria-label="Your answer" disabled={view.mySubmission?.locked} /> : null}
                {view.team.players.length > 1 ? (
                  <select className="input" value={player} onChange={(e) => setPlayer(e.target.value)} aria-label="Who is answering">
                    <option value="">Who’s answering? (optional)</option>
                    {view.team.players.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Button variant="primary" size="lg" className="w-full" onClick={() => void submit()} disabled={!canSubmit || sending} loading={sending}>
                  {view.mySubmission?.locked ? 'Locked by host' : sent ? 'Update answer' : 'Submit'}
                </Button>
                {sent && !view.mySubmission?.locked ? <p className="text-center text-sm text-mint-400">Answer sent. You can change it until the host locks it.</p> : null}
                {err ? <p className="text-center text-sm text-rose-400" role="alert">{err}</p> : null}
              </div>
            </div>
          ) : (view.phase === 'ANSWER_LOCKED' || view.phase === 'REVEALING_SCORE' || view.phase === 'SCORE_REVEALED') && view.mySubmission && view.currentTeamName === view.team.name ? (
            <div className="flex flex-col items-center">
              <p className="eyebrow">Your answer</p>
              <p className="font-display mt-1 text-2xl font-semibold">{view.mySubmission.text || 'Board selection'}</p>
              {view.mySubmission.revealed && view.mySubmission.score !== null ? (
                <div className="mt-6">
                  <ScoreMeter score={view.mySubmission.score} correct={!!view.mySubmission.correct} startedAt={0} durationMs={0} zeroTerm={view.config.zeroTerm} size="compact" muted reducedMotion />
                </div>
              ) : (
                <p className="mt-4 text-sm text-mist-400">{view.phase === 'ANSWER_LOCKED' ? 'Locked. Watch the screen for your score…' : 'Revealing on the big screen…'}</p>
              )}
            </div>
          ) : q && (view.phase === 'QUESTION_REVEALED' || view.phase === 'ACCEPTING_ANSWER' || view.phase === 'QUESTION_INTRO' || view.phase === 'ANSWER_LOCKED' || view.phase === 'REVEALING_SCORE' || view.phase === 'SCORE_REVEALED') ? (
            <div>
              <p className="eyebrow">{q.category}</p>
              {q.text ? <p className="font-display mt-1 text-lg font-semibold leading-snug">{q.text}</p> : <p className="mt-1 text-mist-400">Question coming up…</p>}
              {q.boardItems ? (
                <div className="mt-3 opacity-80">
                  <BoardGrid question={q} items={q.boardItems} size="phone" reducedMotion />
                </div>
              ) : null}
              <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-mist-300">{view.currentTeamName ? `${view.currentTeamName} are answering.` : 'Waiting for the host.'} Your turn will light up here.</p>
            </div>
          ) : view.phase === 'FINAL_CATEGORY_SELECTION' && view.final?.isFinalist ? (
            <div>
              <p className="eyebrow">The Final · choose a category</p>
              <ul className="mt-3 space-y-2">
                {view.final.categoryOptions.map((c) => (
                  <li key={c.id}>
                    <button className="glass w-full rounded-2xl px-4 py-3.5 text-left text-lg font-semibold hover:bg-white/10" onClick={() => client.send({ type: 'FINAL_SELECT_CATEGORY', categoryId: c.id }).then((v) => channel.setView(v as TeamView)).catch((e) => setErr(e.message))}>
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
              {err ? <p className="mt-2 text-sm text-rose-400">{err}</p> : null}
            </div>
          ) : (view.phase === 'FINAL_PROMPTS' || view.phase === 'FINAL_DISCUSSION' || view.phase === 'FINAL_SUBMISSION') && view.final?.isFinalist ? (
            <FinalEntry view={view} answers={finalAnswers} setAnswers={setFinalAnswers} saved={finalSaved} clockOffset={clockOffset} onSave={async () => {
              try {
                const v = (await client.send({ type: 'FINAL_SUBMIT_ANSWERS', answers: finalAnswers.map((text) => ({ text })), by: 'TEAM' })) as TeamView;
                channel.setView(v);
                setFinalSaved(true);
                setErr(null);
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Could not send');
              }
            }} error={err} />
          ) : view.phase === 'FINAL_REVEAL' && view.final?.isFinalist ? (
            <div>
              <p className="eyebrow">The Final · {view.final.categoryTitle}</p>
              <ol className="mt-3 space-y-2">
                {view.final.results.map((r, i) => (
                  <li key={i} className="glass flex items-center justify-between rounded-xl px-3 py-2.5">
                    <span className={cx('font-semibold', !r.revealed && 'text-mist-500')}>{r.revealed ? r.text || '—' : `Answer ${i + 1}`}</span>
                    <span className={cx('font-display tabular text-2xl', r.completed ? (r.isZero ? 'text-brass-300' : r.correct ? '' : 'text-rose-400') : 'text-mist-600')}>{r.completed ? r.score : '—'}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-center text-sm text-mist-400">Watch the big screen…</p>
            </div>
          ) : view.phase === 'VICTORY' && view.final?.isFinalist ? (
            <Card title={`You won ${formatMoney(view.jackpot.amount, view.jackpot.currency)}!`} body={`A ${view.config.zeroTerm}. Congratulations.`} tone="brass" />
          ) : view.phase === 'DEFEAT' && view.final?.isFinalist ? (
            <Card title="So close" body="No zero this time. The jackpot rolls over." />
          ) : view.phase === 'GAME_OVER' ? (
            <Card title="Game over" body="Thanks for playing." />
          ) : view.h2h ? (
            <div className="text-center">
              <p className="eyebrow">Head-to-Head v {view.h2h.opponentName}</p>
              <p className="font-display mt-2 text-3xl">
                {view.h2h.points[view.team.id] ?? 0} <span className="text-mist-500">–</span> {Object.entries(view.h2h.points).find(([id]) => id !== view.team.id)?.[1] ?? 0}
              </p>
              <p className="mt-3 text-sm text-mist-400">You may confer. Your turn lights up here.</p>
            </div>
          ) : (
            <Card title={view.stageTitle || 'Stand by'} body={view.myRank ? `You are ${ordinalWord(view.myRank)} with ${view.myRoundTotal} this round. Lower is better.` : 'Watch the big screen.'} />
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="mt-6 flex items-center justify-between text-xs text-mist-500">
        <span>Round total: {view.myRoundTotal}{view.myRank ? ` · ${ordinalWord(view.myRank)}` : ''}</span>
        <span className="text-brass-400">{formatMoney(view.jackpot.amount, view.jackpot.currency)}</span>
      </footer>
    </Shell>
  );
}

function ordinalWord(n: number) {
  return ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][n] ?? `${n}th`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="safe-pad mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5">{children}</main>;
}

function Card({ title, body, tone }: { title: string; body: string; tone?: 'brass' }) {
  return (
    <div className={cx('glass rounded-2xl p-5 text-center', tone === 'brass' && 'border-brass-400/50')}>
      <p className={cx('font-display text-2xl font-semibold', tone === 'brass' && 'text-brass-300')}>{title}</p>
      <p className="mt-1 text-sm text-mist-400">{body}</p>
    </div>
  );
}

function FinalEntry({ view, answers, setAnswers, onSave, saved, error, clockOffset }: { view: TeamView; answers: string[]; setAnswers: (a: string[]) => void; onSave: () => Promise<void>; saved: boolean; error: string | null; clockOffset: number }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setRemaining(timerRemainingMs(view.timer, clockOffset)), 250);
    return () => clearInterval(i);
  }, [view.timer, clockOffset]);
  const f = view.final!;
  const locked = f.locked;
  const discussing = view.phase === 'FINAL_DISCUSSION';
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="eyebrow">The Final · {f.categoryTitle}</p>
        {view.timer.kind === 'FINAL' ? <span className={cx('font-display tabular text-2xl', remaining <= 10000 ? 'text-rose-400' : '')}>{formatClock(remaining)}</span> : null}
      </div>
      {f.prompts ? (
        <ol className="mt-2 space-y-1 text-sm text-mist-300">
          {f.prompts.map((p, i) => (
            <li key={p.id}>
              <span className="text-brass-300">{i + 1}.</span> {p.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-mist-400">Prompts appear on the big screen.</p>
      )}
      <div className="mt-4 space-y-2">
        {answers.map((a, i) => (
          <Input key={i} value={a} onChange={(e) => setAnswers(answers.map((v, j) => (j === i ? e.target.value : v)))} placeholder={`Answer ${i + 1}`} className="text-lg" disabled={locked} aria-label={`Final answer ${i + 1}`} />
        ))}
        <Button variant="primary" size="lg" className="w-full" onClick={() => void onSave()} disabled={locked || answers.every((a) => !a.trim())}>
          {locked ? 'Locked' : saved ? 'Update answers' : discussing ? 'Send answers early' : 'Send answers'}
        </Button>
        {saved && !locked ? <p className="text-center text-sm text-mint-400">Answers sent. You can still change them until the host locks.</p> : null}
        {error ? <p className="text-center text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}
