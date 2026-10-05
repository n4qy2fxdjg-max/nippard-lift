'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cx } from '@/components/ui';
import { AnimatedNumber } from '@/components/game/AnimatedNumber';
import { formatMoney } from '@/lib/game-engine/helpers';
import type { LeaderboardRow } from '@/lib/game-engine/selectors';
import type { TimerState } from '@/lib/game-engine/types';
import { timerRemainingMs } from '@/lib/realtime/client';
import { formatClock } from '@/lib/util/format';
import { useAudio } from '@/components/game/AudioProvider';

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-[0.6em]', className)} aria-label="NADIR">
      <svg viewBox="0 0 64 64" className="h-[1.6em] w-[1.6em]" aria-hidden>
        <circle cx="32" cy="38" r="16" fill="none" stroke="#e8c170" strokeWidth="3" />
        <path d="M14 22 Q32 48 50 22" fill="none" stroke="#6fd3ff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="38" r="3" fill="#e8c170" />
      </svg>
      <span className="font-display text-[1.5em] font-semibold tracking-[0.18em] text-mist-100">NADIR</span>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('eyebrow text-[1.1em] text-brass-300', className)}>{children}</p>;
}

export function TeamChip({ name, color, className, size = 'md' }: { name: string; color: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={cx('inline-flex items-center gap-[0.5em] rounded-full border border-white/10 bg-white/5 font-semibold', size === 'lg' ? 'px-[1.2em] py-[0.5em] text-[1.6em]' : size === 'sm' ? 'px-[0.8em] py-[0.25em] text-[0.95em]' : 'px-[1em] py-[0.35em] text-[1.15em]', className)}>
      <span className="h-[0.7em] w-[0.7em] rounded-full" style={{ background: color }} aria-hidden />
      {name}
    </span>
  );
}

export function JackpotPanel({ amount, currency, delta, className, large }: { amount: number; currency: string; delta?: number | null; className?: string; large?: boolean }) {
  return (
    <div className={cx('relative flex flex-col items-end', className)}>
      <span className="eyebrow text-[0.9em]">Jackpot</span>
      <AnimatedNumber value={amount} format={(n) => formatMoney(n, currency)} className={cx('font-display tabular font-semibold text-brass-300', large ? 'text-[6em] leading-none' : 'text-[2.4em] leading-tight')} durationMs={1200} />
      <AnimatePresence>
        {delta ? (
          <motion.span key={delta + amount} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx('absolute -top-[1.4em] right-0 rounded-full bg-brass-400/20 px-[0.8em] py-[0.2em] font-semibold text-brass-300', large ? 'text-[1.6em]' : 'text-[0.95em]')}>
            +{formatMoney(delta, currency)}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function LeaderboardList({ rows, highlightTeamId, showGameTotal, compact, reducedMotion, zeroTerm: _z }: { rows: LeaderboardRow[]; highlightTeamId?: string | null; showGameTotal?: boolean; compact?: boolean; reducedMotion?: boolean; zeroTerm?: string }) {
  const live = rows.filter((r) => !r.eliminated);
  const out = rows.filter((r) => r.eliminated);
  return (
    <div className={cx('w-full', compact ? 'space-y-[0.5em]' : 'space-y-[0.8em]')} role="table" aria-label="Leaderboard, lower is better">
      {live.map((row) => (
        <motion.div
          key={row.teamId}
          layout={!reducedMotion}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          role="row"
          className={cx('flex items-center gap-[1.2em] rounded-2xl border px-[1.4em]', compact ? 'py-[0.6em]' : 'py-[1em]', row.atRisk ? 'border-rose-500/50 bg-rose-500/10' : row.tied ? 'border-brass-400/50 bg-brass-400/10' : 'glass', highlightTeamId === row.teamId && 'ring-2 ring-cyan-400/60')}
        >
          <span className={cx('font-display tabular w-[1.6em] text-right font-semibold text-mist-400', compact ? 'text-[1.4em]' : 'text-[2em]')} role="cell">
            {row.rank}
          </span>
          <span className="h-[1em] w-[1em] shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
          <span className={cx('flex-1 truncate font-semibold', compact ? 'text-[1.3em]' : 'text-[1.9em]')} role="cell">
            {row.name}
          </span>
          {row.atRisk ? <span className="eyebrow text-[0.85em] text-rose-400">At risk</span> : null}
          {row.tied ? <span className="eyebrow text-[0.85em] text-brass-300">Tied</span> : null}
          {showGameTotal ? (
            <span className={cx('tabular text-mist-400', compact ? 'text-[1em]' : 'text-[1.3em]')} role="cell" aria-label={`Game total ${row.gameTotal}`}>
              {row.gameTotal}
            </span>
          ) : null}
          <span className={cx('font-display tabular font-semibold', compact ? 'text-[1.8em]' : 'text-[2.6em]', row.atRisk ? 'text-rose-400' : 'text-mist-100')} role="cell" aria-label={`Round total ${row.roundTotal}`}>
            {row.roundTotal}
          </span>
        </motion.div>
      ))}
      {out.length ? (
        <div className="flex flex-wrap gap-[0.6em] pt-[0.5em]" aria-label="Eliminated teams">
          {out.map((r) => (
            <span key={r.teamId} className={cx('rounded-full border border-white/10 px-[0.9em] py-[0.3em] text-mist-500 line-through', compact ? 'text-[0.9em]' : 'text-[1.1em]')}>
              {r.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StandingsStrip({ rows, currentTeamId, compact }: { rows: LeaderboardRow[]; currentTeamId: string | null; compact?: boolean }) {
  const live = rows.filter((r) => !r.eliminated);
  return (
    <div className={cx('flex items-stretch gap-[0.7em]', compact && 'gap-1.5')} aria-label="Standings (lower is better)">
      {live.map((r) => (
        <div key={r.teamId} className={cx('flex min-w-[8em] flex-col rounded-xl border px-[1em] py-[0.5em]', r.teamId === currentTeamId ? 'border-cyan-400/60 bg-cyan-500/10' : r.atRisk ? 'border-rose-500/40 bg-rose-500/10' : 'border-white/10 bg-white/5')}>
          <span className="flex items-center gap-[0.4em] truncate text-[0.95em] font-semibold text-mist-200">
            <span className="h-[0.6em] w-[0.6em] rounded-full" style={{ background: r.color }} aria-hidden />
            {r.name}
          </span>
          <span className={cx('font-display tabular text-[1.7em] font-semibold leading-tight', r.atRisk ? 'text-rose-400' : r.played ? 'text-mist-100' : 'text-mist-500')} aria-label={r.played ? `${r.roundTotal}` : 'not yet played'}>{r.played ? r.roundTotal : '–'}</span>
        </div>
      ))}
    </div>
  );
}

export function CountdownTimer({ timer, clockOffset, size = 'tv', warnAt = 10, beep = true }: { timer: TimerState; clockOffset: number; size?: 'tv' | 'compact'; warnAt?: number; beep?: boolean }) {
  const audio = useAudio();
  const [remaining, setRemaining] = useState(() => timerRemainingMs(timer, clockOffset));
  const [lastSecond, setLastSecond] = useState(-1);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const r = timerRemainingMs(timer, clockOffset);
      setRemaining(r);
      const sec = Math.ceil(r / 1000);
      setLastSecond((prev) => {
        if (prev !== sec && beep && timer.running) {
          if (sec > 0 && sec <= warnAt) audio.play('timerWarning', { gain: 0.5 });
          if (sec === 0 && prev > 0) audio.play('timerEnd');
        }
        return sec;
      });
      if (timer.running) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [timer, clockOffset, audio, beep, warnAt]);
  const pct = timer.durationMs ? (remaining / timer.durationMs) * 100 : 0;
  const warn = remaining <= warnAt * 1000;
  const tv = size === 'tv';
  const r = tv ? 120 : 44;
  const circ = 2 * Math.PI * r;
  return (
    <div className={cx('relative flex items-center justify-center', tv ? 'h-[22em] w-[22em]' : 'h-28 w-28')} role="timer" aria-live="off" aria-label={`${formatClock(remaining)} remaining`}>
      <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="150" cy="150" r={120} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle cx="150" cy="150" r={120} fill="none" stroke={warn ? '#ff6b81' : '#6fd3ff'} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 120} strokeDashoffset={(2 * Math.PI * 120) * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.2s linear', filter: warn ? 'drop-shadow(0 0 12px rgba(255,107,129,0.6))' : 'drop-shadow(0 0 10px rgba(111,211,255,0.4))' }} />
      </svg>
      <span className={cx('font-display tabular font-semibold', tv ? 'text-[6.5em]' : 'text-3xl', warn ? 'text-rose-400' : 'text-mist-100', !timer.running && 'opacity-70')} data-circ={circ}>
        {formatClock(remaining)}
      </span>
      {!timer.running && remaining > 0 && remaining < timer.durationMs ? <span className={cx('absolute bottom-[12%] eyebrow', tv ? 'text-[1em]' : 'text-[9px]')}>Paused</span> : null}
      {lastSecond === 0 ? <span className="sr-only">Time is up</span> : null}
    </div>
  );
}

export function H2HScoreboard({ teams, points, bestOf, size = 'tv' }: { teams: { id: string; name: string; color: string }[]; points: Record<string, number>; bestOf: number; size?: 'tv' | 'compact' }) {
  const target = Math.floor(bestOf / 2) + 1;
  const tv = size === 'tv';
  return (
    <div className={cx('grid grid-cols-[1fr_auto_1fr] items-center', tv ? 'gap-[3em]' : 'gap-4')} aria-label="Head-to-Head score">
      {teams.map((t, i) => (
        <div key={t.id} className={cx('flex flex-col items-center', i === 0 ? 'justify-self-end' : 'justify-self-start')} style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1 }}>
          <TeamChip name={t.name} color={t.color} size={tv ? 'lg' : 'sm'} />
          <div className={cx('mt-[1em] flex', tv ? 'gap-[0.9em]' : 'gap-1.5')} aria-label={`${t.name}: ${points[t.id] ?? 0} of ${target}`}>
            {Array.from({ length: target }).map((_, j) => (
              <motion.span key={j} initial={false} animate={{ scale: j < (points[t.id] ?? 0) ? 1 : 0.85 }} className={cx('rounded-full border', tv ? 'h-[2.2em] w-[2.2em]' : 'h-4 w-4', j < (points[t.id] ?? 0) ? 'border-brass-300 bg-brass-400 shadow-glow-brass' : 'border-white/20 bg-white/5')} />
            ))}
          </div>
        </div>
      ))}
      <span className={cx('font-display text-mist-400', tv ? 'text-[3em]' : 'text-lg')} style={{ gridColumn: 2, gridRow: 1 }}>
        v
      </span>
    </div>
  );
}
