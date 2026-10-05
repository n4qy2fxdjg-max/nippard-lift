'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { cx } from '@/components/ui';
import { BoardGrid } from '@/components/game/BoardGrid';
import { QrCode } from '@/components/game/QrCode';
import { ScoreMeter } from '@/components/game/ScoreMeter';
import type { DisplayView, PublicSubmission } from '@/lib/game-engine/views';
import { revealDurationMs } from '@/lib/game-engine/selectors';
import { formatMoney } from '@/lib/game-engine/helpers';
import { CountdownTimer, Eyebrow, H2HScoreboard, JackpotPanel, LeaderboardList, TeamChip, Wordmark } from './parts';
import { ease } from '@/lib/util/motion';

export interface SceneProps {
  view: DisplayView;
  clockOffset: number;
  reducedMotion: boolean;
  joinUrl: string;
}

const Center = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cx('flex h-full w-full flex-col items-center justify-center text-center', className)}>{children}</div>;

const Title = ({ children, className }: { children: React.ReactNode; className?: string }) => <h1 className={cx('font-display text-balance text-[7em] font-semibold leading-[0.95] tracking-tight text-mist-100', className)}>{children}</h1>;

export function LobbyScene({ view, joinUrl }: SceneProps) {
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-[4em]">
      <div>
        <Wordmark className="text-[2.2em]" />
        <p className="mt-[1.5em] max-w-[22em] font-display text-[3.2em] leading-tight text-mist-200">The quiz where the rarest right answer wins.</p>
        <p className="mt-[1em] text-[1.4em] text-mist-400">
          Each question was put to 100 people. Score the number who gave your answer. <span className="text-brass-300">Lower is better.</span> An answer nobody gave is a <span className="text-brass-300">{view.config.zeroTerm}</span>.
        </p>
        <div className="mt-[2.5em] flex flex-wrap gap-[0.8em]">
          {view.teams.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <TeamChip name={t.name} color={t.color} size="lg" className={cx(t.connected ? 'border-mint-500/50' : '')} />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="glass flex flex-col items-center rounded-[2em] p-[2.5em]">
        <Eyebrow>Join on your phone</Eyebrow>
        <p className="mt-[0.4em] font-display text-[6.5em] font-semibold tracking-[0.25em] text-mist-100">{view.roomCode}</p>
        <div className="mt-[1em] rounded-2xl bg-mist-100 p-[0.8em]">
          <QrCode value={joinUrl} size={260} />
        </div>
        <p className="mt-[1.2em] text-[1.3em] text-mist-400">{joinUrl.replace(/^https?:\/\//, '')}</p>
      </div>
    </div>
  );
}

export function IntroScene({ view }: SceneProps) {
  return (
    <Center>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease }}>
        <Wordmark className="justify-center text-[5em]" />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} className="mt-[1.5em] font-display text-[2.6em] text-mist-300">
        {view.name}
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-[2em]">
        <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} large className="items-center" />
      </motion.div>
    </Center>
  );
}

export function TeamIntroScene({ view }: SceneProps) {
  return (
    <Center>
      <Eyebrow>Tonight’s teams</Eyebrow>
      <div className={cx('mt-[2em] grid gap-[1.5em]', view.teams.length > 4 ? 'grid-cols-3' : 'grid-cols-2')}>
        {view.teams.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.18, duration: 0.6, ease }} className="glass min-w-[20em] rounded-[1.5em] px-[2em] py-[1.6em] text-left" style={{ borderTopColor: t.color, borderTopWidth: '0.3em' }}>
            <p className="font-display text-[3em] font-semibold leading-tight">{t.name}</p>
            <p className="mt-[0.4em] text-[1.3em] text-mist-400">{t.players.map((p) => p.name).join(' · ') || '—'}</p>
          </motion.div>
        ))}
      </div>
    </Center>
  );
}

export function RoundIntroScene({ view }: SceneProps) {
  const label = view.stageTitle || `Round ${view.roundIndex + 1}`;
  return (
    <Center>
      <motion.div initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.3em' }} transition={{ duration: 1.2, ease }}>
        <Eyebrow className="text-[1.8em]">{view.roundIndex + 1 === view.roundCount ? 'The decider' : 'Elimination round'}</Eyebrow>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9, ease }}>
        <Title className="mt-[0.3em] text-[9em]">{label}</Title>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-[1.5em] text-[1.6em] text-mist-400">
        {view.leaderboard.filter((r) => !r.eliminated).length} teams remain · highest total leaves
      </motion.p>
    </Center>
  );
}

export function CategoryScene({ view }: SceneProps) {
  return (
    <Center>
      <Eyebrow>{view.stageTitle}</Eyebrow>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}>
        <Title className="mt-[0.4em] text-[8em]">{view.question?.category}</Title>
      </motion.div>
    </Center>
  );
}

function AnswerStatusRow({ view }: { view: DisplayView }) {
  const order = view.turnOrder;
  return (
    <div className="flex flex-wrap items-center justify-center gap-[0.8em]" aria-label="Order of play">
      {order.map((teamId) => {
        const team = view.teams.find((t) => t.id === teamId)!;
        const subs = view.submissions.filter((s) => s.teamId === teamId);
        const revealed = subs.length > 0 && subs.every((s) => s.revealed);
        const current = view.currentTeamId === teamId;
        const total = subs.filter((s) => s.revealed).reduce((a, s) => a + (s.score ?? 0), 0);
        return (
          <div key={teamId} className={cx('flex items-center gap-[0.7em] rounded-full border px-[1.1em] py-[0.45em] text-[1.25em]', current ? 'border-cyan-400/70 bg-cyan-500/10 text-mist-100' : revealed ? 'border-white/10 bg-white/5 text-mist-300' : 'border-white/5 text-mist-500')}>
            <span className="h-[0.7em] w-[0.7em] rounded-full" style={{ background: team.color }} aria-hidden />
            <span className="font-semibold">{team.name}</span>
            {revealed ? <span className="font-display tabular text-[1.25em] text-brass-300">{total}</span> : current ? <span className="eyebrow text-[0.7em] text-cyan-300">Answering</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function QuestionScene({ view, reducedMotion }: SceneProps) {
  const q = view.question!;
  const current = view.currentTeamId ? view.teams.find((t) => t.id === view.currentTeamId) : null;
  const sub = view.currentSubmission;
  const hasBoard = !!q.boardItems;
  const poolLabel = q.format === 'LINKED' && view.currentPoolIndex !== null ? q.settings.poolLabels?.[view.currentPoolIndex] : null;
  const waiting = view.phase === 'ACCEPTING_ANSWER';
  return (
    <div className="flex h-full flex-col">
      <div className={cx('flex items-start justify-between gap-[2em]', !hasBoard && 'flex-1 items-center')}>
        <div className={cx(hasBoard ? 'max-w-[60em]' : 'max-w-[72em]')}>
          <Eyebrow>{q.category}</Eyebrow>
          <AnimatePresence mode="wait">
            {q.text ? (
              <motion.h1 key="q" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className={cx('font-display text-balance mt-[0.3em] font-semibold leading-[1.05] tracking-tight', hasBoard ? 'text-[3.4em]' : 'text-[5em]')}>
                {q.text}
              </motion.h1>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {q.instructions ? (
              <motion.p key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[0.8em] max-w-[50em] text-[1.5em] leading-snug text-mist-400">
                {q.instructions}
              </motion.p>
            ) : null}
          </AnimatePresence>
          {poolLabel ? <p className="mt-[0.8em] inline-block rounded-full border border-cyan-400/40 bg-cyan-500/10 px-[1em] py-[0.3em] text-[1.3em] font-semibold text-cyan-300">{poolLabel}</p> : null}
        </div>
        {q.mediaUrl && !hasBoard ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.mediaUrl} alt="" className="max-h-[18em] rounded-2xl" />
        ) : null}
      </div>

      {hasBoard && q.boardItems ? (
        <div className="mt-[1.6em] flex flex-1 flex-col justify-center">
          <BoardGrid question={q} items={q.boardItems} highlightId={sub?.boardItemId ?? null} reducedMotion={reducedMotion} />
        </div>
      ) : null}

      <div className="mt-[1.4em] flex items-center justify-between gap-[2em]">
        <AnswerStatusRow view={view} />
        <AnimatePresence mode="wait">
          {current && waiting ? (
            <motion.div key={current.id + (sub?.text ? 'a' : 'b')} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="glass flex items-center gap-[1.2em] rounded-2xl px-[1.6em] py-[0.9em]">
              <TeamChip name={current.name} color={current.color} />
              <span className="text-[1.3em] text-mist-300">{sub?.text || sub?.boardItemId ? 'Answer sent · awaiting lock' : 'thinking…'}</span>
              <span className={cx('h-[0.9em] w-[0.9em] rounded-full', sub?.text || sub?.boardItemId ? 'bg-mint-400' : 'animate-pulse bg-cyan-400')} aria-hidden />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function RevealScene({ view, clockOffset, reducedMotion }: SceneProps) {
  const sub = view.currentSubmission as PublicSubmission;
  const team = view.teams.find((t) => t.id === sub.teamId)!;
  const q = view.question!;
  const locked = view.phase === 'ANSWER_LOCKED';
  const showMeter = sub.revealing || sub.revealed;
  const answerText = sub.boardLabel && q.format === 'BOARD' ? sub.boardLabel : sub.text;
  const duration = revealDurationMs(sub.score ?? 100, view.config.animations);
  const zeroDone = sub.revealed && sub.isZero;
  const delta = useMemo(() => (zeroDone ? view.jackpot.history[view.jackpot.history.length - 1]?.delta ?? null : null), [zeroDone, view.jackpot.history]);
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-[3em]">
      <div>
        <Eyebrow>{q.category}</Eyebrow>
        <p className="mt-[0.4em] text-[1.6em] leading-snug text-mist-300">{q.text}</p>
        {sub.boardLabel && q.format !== 'BOARD' ? <p className="mt-[0.8em] font-mono text-[1.3em] text-mist-400">{sub.boardLabel}</p> : null}
        <div className="mt-[1.8em]">
          <TeamChip name={team.name} color={team.color} size="lg" />
          {sub.playerName ? <span className="ml-[1em] text-[1.3em] text-mist-400">{sub.playerName}</span> : null}
        </div>
        <motion.p key={answerText} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className={cx('font-display text-balance mt-[0.6em] font-semibold leading-[1.02] tracking-tight', answerText.length > 24 ? 'text-[4.6em]' : 'text-[6.5em]', sub.revealed && !sub.correct && 'text-rose-400 line-through decoration-rose-500/60')}>
          {answerText}
        </motion.p>
        <AnimatePresence>
          {sub.revealed && sub.correct && sub.canonical && sub.canonical.toLowerCase() !== answerText.toLowerCase() ? (
            <motion.p key="canon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[0.5em] text-[1.5em] text-mist-400">
              Accepted as <span className="text-mist-100">{sub.canonical}</span>
            </motion.p>
          ) : null}
        </AnimatePresence>
        {locked ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[1.2em] inline-block rounded-full border border-white/15 px-[1.2em] py-[0.4em] text-[1.3em] uppercase tracking-[0.3em] text-mist-300">
            Answer locked
          </motion.p>
        ) : null}
        <AnimatePresence>
          {zeroDone ? (
            <motion.div key="jp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-[2em]">
              <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} delta={delta} large className="items-start" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center">
        {showMeter ? (
          <ScoreMeter key={`${sub.teamId}:${sub.poolIndex}:${sub.revealStartedAt}`} score={sub.score ?? 100} correct={sub.correct ?? false} startedAt={sub.revealStartedAt ?? Date.now()} durationMs={sub.revealed ? 0 : duration} clockOffset={clockOffset} zeroTerm={view.config.zeroTerm} reducedMotion={reducedMotion} incorrectScore={view.config.incorrectScore} />
        ) : (
          <div className="flex flex-col items-center opacity-50" aria-hidden>
            <div className="h-[26em] w-[3.4em] rounded-full border border-white/15 bg-ink-800/80" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PassResultsScene({ view }: SceneProps) {
  const q = view.question!;
  const Col = ({ title, rows, tone }: { title: string; rows: DisplayView['results']['low']; tone: 'brass' | 'mist' }) => (
    <div className="glass flex-1 rounded-[1.5em] p-[1.8em]">
      <Eyebrow className={tone === 'brass' ? 'text-brass-300' : 'text-mist-400'}>{title}</Eyebrow>
      <ul className="mt-[1em] space-y-[0.7em]">
        <AnimatePresence>
          {rows
            ? rows.map((r, i) => (
                <motion.li key={r.canonical} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-center justify-between gap-[1em] border-b border-white/5 pb-[0.5em] text-[1.9em]">
                  <span className="truncate">
                    {r.canonical}
                    {r.givenBy.length ? <span className="ml-[0.6em] text-[0.6em] text-cyan-300">{r.givenBy.join(', ')}</span> : null}
                  </span>
                  <span className={cx('font-display tabular font-semibold', r.score === 0 ? 'text-brass-300' : 'text-mist-100')}>{r.score}</span>
                </motion.li>
              ))
            : Array.from({ length: 5 }).map((_, i) => <li key={i} className="h-[2.4em] rounded-lg bg-white/5" aria-hidden />)}
        </AnimatePresence>
      </ul>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <Eyebrow>{q.category}</Eyebrow>
      <h1 className="font-display mt-[0.3em] text-[3em] font-semibold leading-tight">{q.text}</h1>
      <div className="mt-[1.5em] flex flex-1 gap-[2em]">
        <Col title={`Rarest answers · ${view.config.zeroTerm}s in gold`} rows={view.results.low} tone="brass" />
        <Col title="Most common answers" rows={view.results.high} tone="mist" />
      </div>
    </div>
  );
}

export function LeaderboardScene({ view, reducedMotion }: SceneProps) {
  const tie = view.pendingElimination?.tied.length;
  return (
    <div className="flex h-full flex-col items-center">
      <Eyebrow>{view.stageTitle} · standings</Eyebrow>
      <h1 className="font-display mt-[0.2em] text-[4em] font-semibold">Lower is better</h1>
      {tie ? <p className="mt-[0.3em] text-[1.6em] text-brass-300">Tied for elimination: a tie-break decides</p> : null}
      <div className="mt-[1.5em] w-full max-w-[60em] flex-1 overflow-hidden">
        <LeaderboardList rows={view.leaderboard} reducedMotion={reducedMotion} showGameTotal={view.roundIndex > 0} />
      </div>
    </div>
  );
}

export function TiebreakScene({ view }: SceneProps) {
  const tied = view.pendingElimination?.tied ?? [];
  return (
    <Center>
      <Eyebrow className="text-[1.6em]">Tie-break</Eyebrow>
      <div className="mt-[1.5em] flex items-center gap-[2em]">
        {tied.map((id, i) => {
          const t = view.teams.find((x) => x.id === id)!;
          return (
            <div key={id} className="flex items-center gap-[2em]">
              {i > 0 ? <span className="font-display text-[3em] text-mist-500">v</span> : null}
              <TeamChip name={t.name} color={t.color} size="lg" className="text-[2em]" />
            </div>
          );
        })}
      </div>
      <p className="mt-[2em] text-[1.6em] text-mist-400">One fresh question. Highest score leaves.</p>
    </Center>
  );
}

export function EliminationScene({ view }: SceneProps) {
  const ids = view.pendingElimination?.eliminate ?? view.eliminations[view.eliminations.length - 1]?.teamIds ?? [];
  const teams = view.teams.filter((t) => ids.includes(t.id));
  return (
    <Center>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
        <Eyebrow className="text-[1.6em] text-rose-400">Leaving the game</Eyebrow>
      </motion.div>
      {teams.map((t, i) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.5 + i * 0.3, duration: 1, ease }}>
          <Title className="mt-[0.4em] text-[8em]">{t.name}</Title>
          <p className="mt-[0.5em] text-[1.6em] text-mist-400">{t.players.map((p) => p.name).join(' · ')}</p>
        </motion.div>
      ))}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="mt-[2em] text-[1.5em] text-mist-500">
        Thank you for playing.
      </motion.p>
    </Center>
  );
}

export function H2HIntroScene({ view }: SceneProps) {
  const h = view.h2h!;
  const teams = h.teamIds.map((id) => view.teams.find((t) => t.id === id)!);
  const first = h.firstTeamId ? view.teams.find((t) => t.id === h.firstTeamId) : null;
  return (
    <Center>
      <Eyebrow className="text-[1.6em]">Head-to-Head · first to {Math.floor(h.bestOf / 2) + 1}</Eyebrow>
      <div className="mt-[2em]">
        <H2HScoreboard teams={teams} points={h.points} bestOf={h.bestOf} />
      </div>
      <p className="mt-[2.5em] text-[1.7em] text-mist-400">
        {h.results.length ? `Question ${h.questionIndex + 1}` : 'Teams may now confer. Lower score takes the point.'}
        {first ? <span className="text-mist-200"> · {first.name} answer first</span> : null}
      </p>
    </Center>
  );
}

export function H2HResultScene({ view }: SceneProps) {
  const h = view.h2h!;
  const last = h.results[h.results.length - 1];
  const teams = h.teamIds.map((id) => view.teams.find((t) => t.id === id)!);
  const winner = last?.winnerTeamId ? view.teams.find((t) => t.id === last.winnerTeamId) : null;
  const matchWinner = h.winnerTeamId ? view.teams.find((t) => t.id === h.winnerTeamId) : null;
  return (
    <Center>
      <Eyebrow className="text-[1.6em]">{matchWinner ? 'Head-to-Head decided' : 'Point'}</Eyebrow>
      <div className="mt-[1.2em] grid grid-cols-2 gap-[3em]">
        {teams.map((t) => (
          <div key={t.id} className={cx('glass rounded-[1.5em] px-[2em] py-[1.5em]', last?.winnerTeamId === t.id && 'border-brass-400/60')}>
            <TeamChip name={t.name} color={t.color} />
            <p className="font-display tabular mt-[0.4em] text-[5em] font-semibold leading-none">{last?.scores[t.id] ?? '—'}</p>
          </div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-[2em]">
        <H2HScoreboard teams={teams} points={h.points} bestOf={h.bestOf} />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-[2em] font-display text-[3em]">
        {matchWinner ? `${matchWinner.name} go through to the Final` : winner ? `Point to ${winner.name}` : 'Tied: no point awarded'}
      </motion.p>
    </Center>
  );
}

export function FinalIntroScene({ view }: SceneProps) {
  const team = view.teams.find((t) => t.id === view.final?.teamId);
  return (
    <Center>
      <motion.div initial={{ opacity: 0, letterSpacing: '0.8em' }} animate={{ opacity: 1, letterSpacing: '0.35em' }} transition={{ duration: 1.4, ease }}>
        <Eyebrow className="text-[2em]">The Final</Eyebrow>
      </motion.div>
      {team ? <Title className="mt-[0.4em] text-[7em]">{team.name}</Title> : null}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 1 }} className="mt-[2em]">
        <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} large className="items-center" />
      </motion.div>
      <p className="mt-[1.5em] text-[1.6em] text-mist-400">Three answers. One {view.config.zeroTerm} wins the jackpot.</p>
    </Center>
  );
}

export function FinalCategoriesScene({ view }: SceneProps) {
  const f = view.final!;
  return (
    <Center>
      <Eyebrow className="text-[1.6em]">Choose one category</Eyebrow>
      <div className="mt-[2em] grid w-full max-w-[70em] grid-cols-5 gap-[1.2em]">
        {f.categoryOptions.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.6, ease }} className={cx('glass flex min-h-[12em] flex-col items-center justify-center rounded-[1.5em] p-[1.2em] text-center', f.chosenCategoryId === c.id && 'border-brass-400/70 bg-brass-400/10')}>
            <span className="font-display text-[1.6em] text-mist-500">{i + 1}</span>
            <span className="font-display text-balance mt-[0.3em] text-[2.1em] font-semibold leading-tight">{c.title}</span>
          </motion.div>
        ))}
      </div>
    </Center>
  );
}

export function FinalPromptsScene({ view, clockOffset }: SceneProps) {
  const f = view.final!;
  const discussing = view.phase === 'FINAL_DISCUSSION';
  const submitting = view.phase === 'FINAL_SUBMISSION';
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] items-center gap-[3em]">
      <div>
        <Eyebrow>The Final · {f.categoryTitle}</Eyebrow>
        <h1 className="font-display mt-[0.3em] text-[3.2em] font-semibold leading-tight">Give {view.config.finalAnswerCount} answers from any of these</h1>
        <ol className="mt-[1.5em] space-y-[0.9em]">
          {(f.prompts ?? []).map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25, duration: 0.6 }} className="glass flex items-center gap-[1.2em] rounded-2xl px-[1.5em] py-[1em]">
              <span className="font-display text-[2em] text-brass-300">{i + 1}</span>
              <span className="text-[2em] leading-tight">{p.text}</span>
            </motion.li>
          ))}
          {!f.prompts ? <li className="text-[1.6em] text-mist-500">Prompts revealed shortly…</li> : null}
        </ol>
      </div>
      <div className="flex flex-col items-center justify-center">
        {discussing || submitting ? (
          <>
            <CountdownTimer timer={view.timer} clockOffset={clockOffset} />
            <p className="mt-[1.5em] text-[1.6em] text-mist-400">{submitting ? (f.answerCount >= view.config.finalAnswerCount ? 'Answers received · locking' : 'Time up: submit your answers') : 'Discuss freely. Submit at zero.'}</p>
          </>
        ) : (
          <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} large className="items-center" />
        )}
      </div>
    </div>
  );
}

export function FinalRevealScene({ view, clockOffset, reducedMotion }: SceneProps) {
  const f = view.final!;
  const active = f.results.findIndex((r) => r.revealed && !r.completed);
  const current = active >= 0 ? f.results[active] : null;
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] items-center gap-[3em]">
      <div>
        <Eyebrow>The Final · {f.categoryTitle}</Eyebrow>
        <p className="mt-[0.3em] text-[1.4em] text-mist-400">One {view.config.zeroTerm} wins {formatMoney(f.jackpotAtStake, view.config.currency)}</p>
        <ol className="mt-[1.8em] space-y-[1em]">
          {f.results.map((r, i) => (
            <motion.li key={i} layout className={cx('glass flex items-center justify-between gap-[1.5em] rounded-2xl px-[1.6em] py-[1.1em]', r.revealed && !r.completed && 'border-cyan-400/50', r.completed && r.isZero && 'border-brass-400/70 bg-brass-400/10')}>
              <div className="min-w-0">
                <span className="eyebrow text-[0.8em]">Answer {i + 1}</span>
                <p className={cx('font-display truncate text-[2.6em] font-semibold leading-tight', !r.revealed && 'text-mist-600', r.completed && r.correct === false && 'text-rose-400 line-through')}>{r.revealed ? r.text || '—' : '· · ·'}</p>
                {r.completed && r.promptText ? <p className="text-[1.1em] text-mist-400">{r.promptText}</p> : null}
              </div>
              <span className={cx('font-display tabular text-[3.4em] font-semibold', r.completed ? (r.isZero ? 'text-brass-300' : r.correct ? 'text-mist-100' : 'text-rose-400') : 'text-mist-600')}>{r.completed ? (r.correct ? r.score : view.config.incorrectScore) : '—'}</span>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-center">
        {current ? (
          <ScoreMeter key={active} score={current.score ?? 100} correct={current.correct ?? false} startedAt={current.revealStartedAt ?? Date.now()} durationMs={revealDurationMs(current.score ?? 100, view.config.animations) + 800} clockOffset={clockOffset} zeroTerm={view.config.zeroTerm} reducedMotion={reducedMotion} incorrectScore={view.config.incorrectScore} />
        ) : (
          <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} large className="items-center" />
        )}
      </div>
    </div>
  );
}

export function VictoryScene({ view, reducedMotion }: SceneProps) {
  const team = view.teams.find((t) => t.id === view.final?.teamId);
  const prize = view.config.prize;
  return (
    <Center>
      {!reducedMotion ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.span key={i} className="absolute h-[0.5em] w-[0.5em] rounded-full" style={{ left: `${(i * 37) % 100}%`, background: i % 3 ? '#e8c170' : '#6fd3ff' }} initial={{ y: '-10vh', opacity: 0 }} animate={{ y: '110vh', opacity: [0, 1, 1, 0] }} transition={{ duration: 6 + (i % 5), delay: (i % 9) * 0.4, repeat: Infinity, ease: 'linear' }} />
          ))}
        </div>
      ) : null}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease }}>
        <Eyebrow className="text-[2em] text-brass-300">Jackpot won</Eyebrow>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }}>
        <p className="font-display tabular mt-[0.3em] text-[12em] font-semibold leading-none text-brass-300" style={{ textShadow: '0 0 80px rgba(232,193,112,0.6)' }}>
          {formatMoney(view.final?.jackpotAtStake ?? view.jackpot.amount, view.config.currency)}
        </p>
      </motion.div>
      {team ? <Title className="mt-[0.5em] text-[5em]">{team.name}</Title> : null}
      {prize.type !== 'NONE' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-[1.5em] flex items-center gap-[1em] rounded-full border border-brass-400/40 bg-brass-400/10 px-[1.6em] py-[0.6em] text-[1.6em] text-brass-300">
          <PrizeMark type={prize.type} /> {prize.label}
        </motion.div>
      ) : null}
    </Center>
  );
}

export function PrizeMark({ type, className }: { type: string; className?: string }) {
  if (type === 'BADGE') return <span className={cx('inline-block h-[1.2em] w-[1.2em] rounded-full border-2 border-brass-300', className)} aria-hidden />;
  return (
    <svg viewBox="0 0 48 48" className={cx('h-[1.4em] w-[1.4em]', className)} aria-hidden>
      <path d="M12 6h24v10a12 12 0 0 1-24 0z" fill="none" stroke="#e8c170" strokeWidth="2.5" />
      <path d="M12 10H6v4a6 6 0 0 0 6 6M36 10h6v4a6 6 0 0 1-6 6M24 28v8M16 40h16" fill="none" stroke="#e8c170" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="16" r="3" fill="#6fd3ff" />
    </svg>
  );
}

export function DefeatScene({ view }: SceneProps) {
  const team = view.teams.find((t) => t.id === view.final?.teamId);
  return (
    <Center>
      <Eyebrow className="text-[1.8em]">So close</Eyebrow>
      {team ? <Title className="mt-[0.4em] text-[6em]">{team.name}</Title> : null}
      <p className="mt-[1em] text-[1.8em] text-mist-300">No {view.config.zeroTerm} tonight. The jackpot rolls over.</p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-[2em] flex items-end gap-[2em]">
        <div className="text-right">
          <span className="eyebrow text-[0.9em]">Next game’s jackpot</span>
          <p className="font-display tabular text-[6em] font-semibold leading-none text-brass-300">{formatMoney(view.jackpot.nextGameAmount ?? view.jackpot.amount, view.config.currency)}</p>
        </div>
      </motion.div>
    </Center>
  );
}

export function GameOverScene({ view }: SceneProps) {
  const winner = view.teams.find((t) => t.id === view.winnerTeamId);
  return (
    <Center>
      <Wordmark className="text-[3em]" />
      <p className="mt-[1.5em] text-[1.6em] text-mist-400">Thanks for playing {view.name}</p>
      {winner ? (
        <p className="mt-[0.8em] font-display text-[3.5em]">
          Champions: <span className="text-brass-300">{winner.name}</span>
        </p>
      ) : null}
      <p className="mt-[1em] text-[1.4em] text-mist-400">
        {view.jackpot.zeroCount} {view.config.zeroTerm}
        {view.jackpot.zeroCount === 1 ? '' : 's'} tonight · {view.jackpot.won ? `Jackpot won: ${formatMoney(view.final?.jackpotAtStake ?? 0, view.config.currency)}` : `Next jackpot: ${formatMoney(view.jackpot.nextGameAmount ?? view.jackpot.amount, view.config.currency)}`}
      </p>
    </Center>
  );
}
