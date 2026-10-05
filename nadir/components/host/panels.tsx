'use client';
import { useEffect, useState } from 'react';
import { Badge, Button, Input, Modal, cx } from '@/components/ui';
import type { HostView } from '@/lib/game-engine/views';
import type { GameAction } from '@/lib/game-engine/types';
import { formatMoney } from '@/lib/game-engine/helpers';
import { authHeaders, timerRemainingMs } from '@/lib/realtime/client';
import { formatClock } from '@/lib/util/format';
import { BoardGrid } from '@/components/game/BoardGrid';
import { useAudio } from '@/components/game/AudioProvider';

type Send = (a: GameAction) => Promise<unknown>;

/** Question + answer universe (with hidden scores) for the host. */
export function QuestionPanel({ view }: { view: HostView }) {
  const q = view.question;
  if (!q) return null;
  const pool = view.currentPoolIndex ?? 0;
  const answers = q.answers.filter((a) => a.poolIndex === pool && (q.format === 'LINKED' ? true : a.poolIndex === 0));
  const matched = view.currentSubmission?.matchedAnswerId;
  const itemFilter = view.currentSubmission?.boardItemId;
  const relevant = q.format === 'CLUES' || q.format === 'PICTURE' || q.format === 'PARTIAL' ? answers.filter((a) => !itemFilter || a.boardItemId === itemFilter) : answers;
  const sorted = [...relevant].sort((a, b) => (a.correct === b.correct ? a.score - b.score : a.correct ? -1 : 1));
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {q.category} · {q.format.toLowerCase()}
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold leading-snug">{q.text}</h2>
          {q.instructions ? <p className="mt-1 text-sm text-mist-400">{q.instructions}</p> : null}
          {q.format === 'LINKED' ? <p className="mt-1 text-xs text-cyan-300">Current half: {q.settings.poolLabels?.[pool]}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-mist-400">
          <span>{q.text ? '' : ''}</span>
          <Badge tone={view.question?.id ? 'neutral' : 'neutral'}>{relevant.filter((a) => a.correct && a.score === 0).length} zero</Badge>
        </div>
      </div>
      {q.boardItems && q.boardItems.length ? (
        <div className="mt-3">
          <BoardGrid question={q} items={q.boardItems} size="compact" highlightId={view.currentSubmission?.boardItemId ?? null} reducedMotion />
        </div>
      ) : null}
      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-ink-800 text-left text-xs uppercase tracking-wider text-mist-500">
            <tr>
              <th className="px-3 py-2">Accepted answer</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className={cx('border-t border-white/5', matched === a.id && 'bg-cyan-500/10', !a.correct && 'text-mist-500')}>
                <td className="px-3 py-1.5">
                  <span className={cx(!a.correct && 'line-through')}>{a.canonical}</span>
                  {q.format !== 'OPEN' && q.format !== 'LINKED' && a.boardItemId ? <span className="ml-2 text-xs text-mist-500">{q.boardItems?.find((b) => b.id === a.boardItemId)?.label || q.boardItems?.find((b) => b.id === a.boardItemId)?.clue}</span> : null}
                  {a.aliases.length ? <span className="ml-2 text-xs text-mist-500">({a.aliases.join(', ')})</span> : null}
                </td>
                <td className={cx('tabular px-3 py-1.5 text-right font-semibold', a.correct && a.score === 0 ? 'text-brass-300' : '')}>{a.correct ? a.score : '✕'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Current team, their answer, manual entry and overrides. */
export function TurnPanel({ view, send, busy }: { view: HostView; send: Send; busy: boolean }) {
  const q = view.question;
  const teamId = view.currentTeamId;
  const team = view.teams.find((t) => t.id === teamId);
  const sub = view.currentSubmission;
  const [text, setText] = useState('');
  const [boardItemId, setBoardItemId] = useState<string | null>(null);
  const [player, setPlayer] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState('');
  const [canonicalId, setCanonicalId] = useState('');
  useEffect(() => {
    setText(sub?.text ?? '');
    setBoardItemId(sub?.boardItemId ?? null);
  }, [sub?.text, sub?.boardItemId, teamId, view.currentPoolIndex]);
  if (!q || !team || !teamId) return null;
  const accepting = view.phase === 'ACCEPTING_ANSWER';
  const locked = view.phase === 'ANSWER_LOCKED';
  const revealed = view.phase === 'SCORE_REVEALED' || view.phase === 'REVEALING_SCORE';
  const needsBoard = q.format !== 'OPEN' && q.format !== 'LINKED';
  const needsText = q.format !== 'BOARD';
  const canSubmit = (!needsText || text.trim()) && (!needsBoard || boardItemId);
  const pool = view.currentPoolIndex ?? 0;
  const candidates = q.answers.filter((a) => a.correct && a.poolIndex === pool && (!needsBoard || q.format === 'BOARD' || a.boardItemId === (sub?.boardItemId ?? boardItemId)));
  const submitHost = async () => {
    await send({ type: 'SUBMIT_ANSWER', teamId, text: text.trim(), boardItemId, playerName: player || undefined, by: 'HOST' });
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: team.color }} aria-hidden />
          <h2 className="text-lg font-semibold">{team.name}</h2>
          {q.format === 'LINKED' ? <Badge tone="cyan">{q.settings.poolLabels?.[pool]}</Badge> : null}
          <Badge tone={accepting ? 'cyan' : locked ? 'brass' : 'neutral'}>{accepting ? 'Answering' : locked ? 'Locked' : revealed ? 'Revealed' : view.phase.replace(/_/g, ' ').toLowerCase()}</Badge>
          {!team.connected ? <span className="text-xs text-mist-500">no phone connected</span> : null}
        </div>
        <TeamPicker view={view} send={send} />
      </div>

      {accepting ? (
        <div className="mt-3 space-y-3">
          {needsBoard && q.boardItems ? (
            <div>
              <p className="label">Board selection {sub?.boardItemId ? '(sent by team)' : ''}</p>
              <BoardGrid question={q} items={q.boardItems} size="compact" selectedId={boardItemId} onSelect={setBoardItemId} reducedMotion />
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            {needsText ? (
              <div className="min-w-[14rem] flex-1">
                <label className="label" htmlFor="host-answer">
                  Answer {sub?.text && sub.text === text ? <span className="text-cyan-300">(received from team)</span> : '(type for the team)'}
                </label>
                <Input id="host-answer" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type the team’s answer" onKeyDown={(e) => e.key === 'Enter' && canSubmit && void submitHost()} autoComplete="off" />
              </div>
            ) : null}
            <div className="w-36">
              <label className="label" htmlFor="host-player">
                Player
              </label>
              <Input id="host-player" value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="optional" list={`players-${team.id}`} />
              <datalist id={`players-${team.id}`}>
                {team.players.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <Button variant="secondary" onClick={() => void submitHost()} disabled={!canSubmit || busy}>
              Enter answer
            </Button>
            <Button variant="primary" onClick={async () => { if (!sub || sub.text !== text.trim() || sub.boardItemId !== boardItemId) await submitHost(); await send({ type: 'LOCK_ANSWER' }); }} disabled={!canSubmit || busy}>
              Lock answer
            </Button>
          </div>
          {sub?.text || sub?.boardItemId ? (
            <p className="text-sm text-mist-400">
              Team sent: <span className="text-mist-100">{sub.text || sub.boardLabel}</span>
              {sub.playerName ? ` · ${sub.playerName}` : ''}
            </p>
          ) : (
            <p className="text-sm text-mist-500">Waiting for the team to submit from their phone, or enter it above.</p>
          )}
        </div>
      ) : null}

      {(locked || revealed) && sub ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-ink-800/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-semibold">{sub.text || sub.boardLabel}</p>
              <p className="text-sm text-mist-400">
                {sub.correct ? (
                  <>
                    Matched <span className="text-mist-100">{sub.canonical}</span>
                  </>
                ) : (
                  <span className="text-rose-400">Not in the accepted list</span>
                )}
                {sub.override ? <Badge tone="brass" className="ml-2">override: {sub.override.toLowerCase()}</Badge> : null}
              </p>
            </div>
            <div className={cx('font-display tabular text-4xl font-semibold', sub.correct && sub.score === 0 ? 'text-brass-300' : sub.correct ? '' : 'text-rose-400')} aria-label={`Hidden score ${sub.score}`}>
              {sub.score}
              <span className="ml-1 text-xs text-mist-500">hidden</span>
            </div>
          </div>
          {locked ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="danger" onClick={() => void send({ type: 'MARK_INCORRECT' })} disabled={busy}>
                Mark incorrect
              </Button>
              <select className="input w-auto py-1.5 text-sm" value={canonicalId} onChange={(e) => setCanonicalId(e.target.value)} aria-label="Choose canonical answer">
                <option value="">Mark correct as…</option>
                {candidates.sort((a, b) => a.score - b.score).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.canonical} ({a.score})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="cyan" onClick={() => void send({ type: 'MARK_CORRECT', answerId: canonicalId || undefined }).then(() => setCanonicalId(''))} disabled={busy || (!canonicalId && !sub.matchedAnswerId)}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOverrideOpen(true)}>
                Override score
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void send({ type: 'UNLOCK_ANSWER' })} disabled={busy}>
                Unlock
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <Modal open={overrideOpen} onClose={() => setOverrideOpen(false)} title="Override score">
        <p className="text-sm text-mist-400">Set the exact survey score for this answer (0–100). 0 counts as a {view.fullConfig.zeroTerm}.</p>
        <div className="mt-3 flex gap-2">
          <Input type="number" min={0} max={100} value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} autoFocus />
          <Button variant="primary" onClick={async () => { await send({ type: 'OVERRIDE_SCORE', score: Number(overrideScore) }); setOverrideOpen(false); }} disabled={overrideScore === ''}>
            Apply
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TeamPicker({ view, send }: { view: HostView; send: Send }) {
  const order = view.turnOrder;
  if (!order.length) return null;
  return (
    <div className="flex flex-wrap gap-1" aria-label="Select team">
      {order.map((id) => {
        const t = view.teams.find((x) => x.id === id)!;
        const done = view.submissions.filter((s) => s.teamId === id).length > 0 && view.submissions.filter((s) => s.teamId === id).every((s) => s.revealed);
        const current = view.currentTeamId === id;
        return (
          <button key={id} type="button" onClick={() => void send({ type: 'SELECT_TEAM', teamId: id })} disabled={done || !['ACCEPTING_ANSWER', 'SCORE_REVEALED', 'QUESTION_REVEALED'].includes(view.phase)} className={cx('rounded-full border px-2.5 py-0.5 text-xs font-semibold transition', current ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300' : done ? 'border-white/5 text-mist-500 line-through' : 'border-white/10 text-mist-200 hover:bg-white/10')} aria-pressed={current}>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

export function TimerControls({ view, send, clockOffset }: { view: HostView; send: Send; clockOffset: number }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setRemaining(timerRemainingMs(view.timer, clockOffset)), 200);
    return () => clearInterval(i);
  }, [view.timer, clockOffset]);
  const t = view.timer;
  const isFinal = view.phase.startsWith('FINAL');
  return (
    <div className="flex items-center gap-2">
      <span className={cx('font-display tabular w-16 text-xl font-semibold', remaining <= 10000 && t.kind !== 'NONE' ? 'text-rose-400' : '')} aria-label="Timer">
        {t.kind === 'NONE' ? '–:––' : formatClock(remaining)}
      </span>
      {t.kind === 'NONE' || (!t.running && t.remainingMs === t.durationMs) ? (
        <Button size="sm" onClick={() => void send({ type: 'TIMER_START', kind: isFinal ? 'FINAL' : 'TEAM', seconds: isFinal ? view.fullConfig.finalDiscussionSeconds : view.fullConfig.teamAnswerSeconds || 30 })}>
          Start
        </Button>
      ) : t.running ? (
        <Button size="sm" onClick={() => void send({ type: 'TIMER_PAUSE' })}>
          Pause
        </Button>
      ) : (
        <Button size="sm" onClick={() => void send({ type: 'TIMER_RESUME' })}>
          Resume
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => void send({ type: 'TIMER_RESET' })} disabled={t.kind === 'NONE'}>
        Reset
      </Button>
    </div>
  );
}

export function StandingsPanel({ view }: { view: HostView }) {
  return (
    <div className="card py-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Standings · lower is better</p>
        <p className="text-xs text-mist-500">pass · round · game</p>
      </div>
      <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(8, Math.max(2, view.leaderboard.filter((r) => !r.eliminated).length))}, minmax(0,1fr))` }}>
        {view.leaderboard
          .filter((r) => !r.eliminated)
          .map((r) => (
            <div key={r.teamId} className={cx('rounded-lg border px-2.5 py-1.5', r.teamId === view.currentTeamId ? 'border-cyan-400/50 bg-cyan-500/10' : r.atRisk ? 'border-rose-500/40 bg-rose-500/10' : r.tied ? 'border-brass-400/40 bg-brass-400/10' : 'border-white/10 bg-white/5')}>
              <div className="flex items-center gap-1.5 truncate text-xs font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden />
                <span className="truncate">{r.name}</span>
                {!view.teams.find((t) => t.id === r.teamId)?.connected ? <span className="ml-auto text-mist-600" title="No phone connected">○</span> : <span className="ml-auto text-mint-400" title="Phone connected">●</span>}
              </div>
              <div className="tabular mt-0.5 flex items-baseline gap-2 text-sm">
                <span className="text-mist-500">{r.passScore ?? '–'}</span>
                <span className={cx('font-display text-xl font-semibold', r.atRisk ? 'text-rose-400' : '')}>{r.played ? r.roundTotal : '–'}</span>
                <span className="text-mist-500">{r.gameTotal}</span>
              </div>
            </div>
          ))}
        {view.leaderboard.filter((r) => r.eliminated).length ? <p className="col-span-full text-xs text-mist-500">Out: {view.leaderboard.filter((r) => r.eliminated).map((r) => r.name).join(', ')}</p> : null}
      </div>
    </div>
  );
}

export function TiebreakPicker({ view, send, open, onClose, hostToken }: { view: HostView; send: Send; open: boolean; onClose: () => void; hostToken: string | null }) {
  const [options, setOptions] = useState<{ planned: { id: string; category: string; text: string; difficulty: number }[]; extra: { id: string; category: string; text: string; difficulty: number }[] } | null>(null);
  useEffect(() => {
    if (!open) return;
    fetch(`/api/games/${view.id}/tiebreak-options`, { headers: authHeaders({ hostToken }) })
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setOptions({ planned: [], extra: [] }));
  }, [open, view.id, hostToken]);
  const tied = view.pendingElimination?.tied.map((id) => view.teams.find((t) => t.id === id)?.name).join(' v ');
  return (
    <Modal open={open} onClose={onClose} title={`Tie-break: ${tied}`} wide>
      <p className="text-sm text-mist-400">Pick a fresh open question. Only the tied teams answer; highest score is eliminated.</p>
      {!options ? <p className="mt-4 text-sm">Loading…</p> : null}
      {options?.planned.length ? (
        <>
          <p className="label mt-4">Planned tie-break questions</p>
          <ul className="space-y-1.5">
            {options.planned.map((q) => (
              <li key={q.id}>
                <button className="w-full rounded-xl border border-brass-400/30 bg-brass-400/5 px-3 py-2 text-left hover:bg-brass-400/15" onClick={async () => { await send({ type: 'START_TIEBREAK', questionId: q.id }); onClose(); }}>
                  <span className="text-xs uppercase tracking-wider text-mist-500">{q.category}</span>
                  <p className="text-sm">{q.text}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {options?.extra.length ? (
        <>
          <p className="label mt-4">Other unused open questions</p>
          <ul className="max-h-72 space-y-1.5 overflow-auto">
            {options.extra.map((q) => (
              <li key={q.id}>
                <button className="w-full rounded-xl border border-white/10 px-3 py-2 text-left hover:bg-white/10" onClick={async () => { await send({ type: 'START_TIEBREAK', questionId: q.id }); onClose(); }}>
                  <span className="text-xs uppercase tracking-wider text-mist-500">{q.category}</span>
                  <p className="text-sm">{q.text}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {options && !options.planned.length && !options.extra.length ? <p className="mt-4 text-sm text-rose-400">No unused open questions remain. Add questions in Admin, or eliminate manually from the leaderboard.</p> : null}
    </Modal>
  );
}

export function H2HPanel({ view, send, busy }: { view: HostView; send: Send; busy: boolean }) {
  const h = view.h2h;
  if (!h) return null;
  const teams = h.teamIds.map((id) => view.teams.find((t) => t.id === id)!);
  const adv = view.teams.find((t) => t.id === h.advantageTeamId);
  return (
    <div className="card">
      <p className="eyebrow">Head-to-Head · first to {Math.floor(h.bestOf / 2) + 1}</p>
      <div className="mt-2 flex items-center gap-4">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: t.color }} aria-hidden />
            <span className="font-semibold">{t.name}</span>
            <span className="font-display tabular text-2xl text-brass-300">{h.points[t.id] ?? 0}</span>
          </div>
        ))}
      </div>
      {view.phase === 'HEAD_TO_HEAD_INTRO' ? (
        <div className="mt-3">
          <p className="text-sm text-mist-400">
            {adv?.name} had the better elimination total{view.fullConfig.h2hAdvantage === 'BEST_CHOOSES' ? ' and chooses who answers first.' : '.'} {h.firstTeamId ? '' : 'Choose the opener:'}
          </p>
          <div className="mt-2 flex gap-2">
            {teams.map((t) => (
              <Button key={t.id} size="sm" variant={h.firstTeamId === t.id ? 'primary' : 'secondary'} onClick={() => void send({ type: 'H2H_SET_FIRST', teamId: t.id })} disabled={busy}>
                {t.name} first
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {h.results.length ? (
        <ul className="mt-3 space-y-1 text-sm text-mist-400">
          {h.results.map((r, i) => (
            <li key={i}>
              Q{i + 1}: {teams.map((t) => `${t.name} ${r.scores[t.id]}`).join(' · ')} → {r.winnerTeamId ? view.teams.find((t) => t.id === r.winnerTeamId)?.name : 'tie'}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FinalPanel({ view, send, busy }: { view: HostView; send: Send; busy: boolean }) {
  const f = view.final;
  const [answers, setAnswers] = useState<string[]>([]);
  const [overrideIdx, setOverrideIdx] = useState<number | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideAnswer, setOverrideAnswer] = useState('');
  const count = view.fullConfig.finalAnswerCount;
  useEffect(() => {
    if (!f) return;
    setAnswers((prev) => {
      const next = Array.from({ length: count }, (_, i) => prev[i] ?? '');
      if (view.phase === 'FINAL_SUBMISSION' || view.phase === 'FINAL_DISCUSSION') {
        // reflect what the team has sent
        return next.map((v, i) => (view.submissions.length ? v : v));
      }
      return next;
    });
  }, [f, count, view.phase, view.submissions.length]);
  if (!f) return null;
  const team = view.teams.find((t) => t.id === f.teamId);
  const teamAnswersKnown = f.answerCount;
  const allAnswers = (f.promptDetails ?? []).flatMap((p) => p.answers.filter((a) => a.correct).map((a) => ({ ...a, prompt: p.text })));
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">The Final · {team?.name}</p>
        <span className="font-display tabular text-xl text-brass-300">{formatMoney(f.jackpotAtStake, view.fullConfig.currency)}</span>
      </div>
      {view.phase === 'FINAL_CATEGORY_SELECTION' ? (
        <div>
          <p className="text-sm text-mist-400">The team chooses on their phone, or pick for them:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {f.categoryOptions.map((c) => (
              <Button key={c.id} size="sm" onClick={() => void send({ type: 'FINAL_SELECT_CATEGORY', categoryId: c.id })} disabled={busy}>
                {c.title}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {f.chosenCategoryId && f.promptDetails ? (
        <div>
          <p className="text-sm font-semibold">{f.categoryTitle}</p>
          <ol className="mt-1 space-y-1 text-sm text-mist-300">
            {f.promptDetails.map((p, i) => (
              <li key={p.id}>
                <span className="text-brass-300">{i + 1}.</span> {p.text} <span className="text-xs text-mist-500">({p.answers.filter((a) => a.correct && a.score === 0).length} zero of {p.answers.filter((a) => a.correct).length})</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {view.phase === 'FINAL_DISCUSSION' || view.phase === 'FINAL_SUBMISSION' ? (
        <div>
          <p className="text-sm text-mist-400">{teamAnswersKnown ? `${teamAnswersKnown} answer(s) received from the team.` : 'No answers from the phone yet.'} Type or correct them here, then lock.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {answers.map((a, i) => (
              <Input key={i} value={a} placeholder={`Answer ${i + 1}`} onChange={(e) => setAnswers((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))} aria-label={`Final answer ${i + 1}`} />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => void send({ type: 'FINAL_SUBMIT_ANSWERS', answers: answers.map((text) => ({ text })), by: 'HOST' })} disabled={busy || answers.every((a) => !a.trim())}>
              Save answers
            </Button>
            <Button size="sm" variant="primary" onClick={async () => { if (answers.some((a) => a.trim())) await send({ type: 'FINAL_SUBMIT_ANSWERS', answers: answers.map((text) => ({ text })), by: 'HOST' }); await send({ type: 'FINAL_LOCK_ANSWERS' }); }} disabled={busy || (answers.every((a) => !a.trim()) && !teamAnswersKnown)}>
              Lock final answers
            </Button>
          </div>
        </div>
      ) : null}
      {view.phase === 'FINAL_REVEAL' || view.phase === 'VICTORY' || view.phase === 'DEFEAT' ? (
        <ol className="space-y-1.5">
          {f.fullResults.map((r, i) => (
            <li key={i} className={cx('flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm', i < f.completedCount ? 'border-white/10' : 'border-dashed border-white/15')}>
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.text || '—'}</p>
                <p className="text-xs text-mist-500">{r.correct ? `→ ${r.canonical}` : 'not accepted'}{r.override ? ` · override` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cx('font-display tabular text-2xl', r.isZero ? 'text-brass-300' : r.correct ? '' : 'text-rose-400')}>{r.score}</span>
                {i >= f.revealedCount && view.phase === 'FINAL_REVEAL' ? (
                  <Button size="sm" variant="ghost" onClick={() => { setOverrideIdx(i); setOverrideScore(String(r.score)); }}>
                    Override
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      <Modal open={overrideIdx !== null} onClose={() => setOverrideIdx(null)} title={`Override final answer ${(overrideIdx ?? 0) + 1}`}>
        <div className="space-y-3">
          <div>
            <p className="label">Accept as</p>
            <select className="input" value={overrideAnswer} onChange={(e) => setOverrideAnswer(e.target.value)}>
              <option value="">Choose canonical answer…</option>
              {allAnswers.sort((a, b) => a.score - b.score).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.canonical} ({a.score}) · {a.prompt}
                </option>
              ))}
            </select>
            <Button size="sm" className="mt-2" variant="cyan" disabled={!overrideAnswer} onClick={async () => { await send({ type: 'FINAL_OVERRIDE', index: overrideIdx!, override: 'CORRECT', answerId: overrideAnswer }); setOverrideIdx(null); }}>
              Mark correct
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <p className="label">Or set score</p>
              <Input type="number" min={0} max={100} value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} />
            </div>
            <Button size="sm" onClick={async () => { await send({ type: 'FINAL_OVERRIDE', index: overrideIdx!, override: 'SCORE', score: Number(overrideScore) }); setOverrideIdx(null); }}>
              Apply
            </Button>
            <Button size="sm" variant="danger" onClick={async () => { await send({ type: 'FINAL_OVERRIDE', index: overrideIdx!, override: 'INCORRECT' }); setOverrideIdx(null); }}>
              Incorrect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function AudioSettingsPanel() {
  const audio = useAudio();
  const s = audio.settings;
  const Row = ({ label, k }: { label: string; k: 'master' | 'music' | 'effects' }) => (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-16 text-mist-400">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={s[k]} onChange={(e) => audio.update({ [k]: Number(e.target.value) })} className="flex-1 accent-brass-400" aria-label={`${label} volume`} />
      <span className="tabular w-8 text-right text-xs text-mist-500">{Math.round(s[k] * 100)}</span>
    </label>
  );
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-sm">
        <span>Mute</span>
        <input type="checkbox" checked={s.muted} onChange={(e) => audio.update({ muted: e.target.checked })} className="h-4 w-4 accent-brass-400" />
      </label>
      <Row label="Master" k="master" />
      <Row label="Music" k="music" />
      <Row label="Effects" k="effects" />
      <Button size="sm" variant="ghost" onClick={() => { audio.unlock(); audio.play('scoreZero'); }}>
        Test sound
      </Button>
    </div>
  );
}

export const SHORTCUTS: [string, string][] = [
  ['Space', 'Advance / reveal (primary action)'],
  ['R', 'Reveal score'],
  ['L', 'Show leaderboard'],
  ['T', 'Start / pause timer'],
  ['N', 'Next team'],
  ['U', 'Undo last action'],
  ['⌘/Ctrl + Z', 'Undo last action'],
  ['Z', 'Force a zero on the next lock (debug)'],
  ['?', 'Show this help'],
  ['Esc', 'Close dialogs'],
];
