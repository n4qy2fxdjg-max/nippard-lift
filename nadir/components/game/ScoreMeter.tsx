'use client';
/**
 * The survey-score reveal: a counter and vertical meter that fall from 100 towards the
 * answer's score, decelerating as they approach it. Zero gets a held beat and a burst.
 * Resumable: the animation is a pure function of (startedAt, now), so a refreshed display
 * rejoins mid-count instead of restarting.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from './AudioProvider';
import { cx } from '@/components/ui';

export interface ScoreMeterProps {
  score: number;
  correct: boolean;
  startedAt: number;
  /** Total duration in ms (see revealDurationMs). */
  durationMs: number;
  clockOffset?: number;
  onComplete?: () => void;
  zeroTerm: string;
  reducedMotion?: boolean;
  /** 'tv' renders at broadcast scale; 'compact' is for host preview / phones. */
  size?: 'tv' | 'compact';
  muted?: boolean;
  incorrectScore?: number;
}

const HOLD_MS = 700;

function easeOutQuart(p: number) {
  return 1 - Math.pow(1 - p, 4);
}

/** Displayed value at elapsed time t. */
export function meterValueAt(score: number, durationMs: number, t: number): { value: number; done: boolean; holding: boolean } {
  if (durationMs <= 0 || t >= durationMs) return { value: score, done: true, holding: false };
  const target = score === 0 ? 1 : score;
  const countMs = score === 0 ? durationMs - HOLD_MS : durationMs;
  if (t >= countMs) return score === 0 ? { value: 1, done: false, holding: true } : { value: score, done: true, holding: false };
  const p = Math.min(1, t / countMs);
  const v = 100 - (100 - target) * easeOutQuart(p);
  return { value: Math.max(target, Math.round(v)), done: false, holding: false };
}

export function ScoreMeter({ score, correct, startedAt, durationMs, clockOffset = 0, onComplete, zeroTerm, reducedMotion, size = 'tv', muted, incorrectScore = 100 }: ScoreMeterProps) {
  const audio = useAudio();
  const [value, setValue] = useState(() => meterValueAt(score, reducedMotion ? 0 : durationMs, Date.now() + clockOffset - startedAt).value);
  const [done, setDone] = useState(false);
  const [holding, setHolding] = useState(false);
  const lastValue = useRef(value);
  const completed = useRef(false);
  const lowPlayed = useRef(false);

  useEffect(() => {
    let raf = 0;
    const dur = reducedMotion ? 0 : durationMs;
    const tick = () => {
      const t = Date.now() + clockOffset - startedAt;
      const r = meterValueAt(score, dur, t);
      if (r.value !== lastValue.current) {
        lastValue.current = r.value;
        setValue(r.value);
        if (!muted) audio.play('scoreTick', { gain: 0.5, rate: 1 + (100 - r.value) / 140 });
        if (!muted && r.value <= 8 && !lowPlayed.current && correct) {
          lowPlayed.current = true;
          audio.play('scoreLow', { gain: 0.6 });
        }
      }
      setHolding(r.holding);
      if (r.done) {
        setDone(true);
        if (!completed.current) {
          completed.current = true;
          if (!muted && score === 0 && correct) audio.play('scoreZero');
          onComplete?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, correct, startedAt, durationMs, clockOffset, reducedMotion, onComplete, audio, muted]);

  const isZero = done && score === 0 && correct;
  const incorrect = done && !correct;
  const tv = size === 'tv';
  const pct = Math.max(0, Math.min(100, value));
  const danger = value <= 10 && !incorrect;

  return (
    <div className={cx('relative flex items-center justify-center', tv ? 'gap-[4em]' : 'gap-6')} aria-live="polite">
      {/* Meter */}
      <div className={cx('relative overflow-hidden rounded-full border border-white/15 bg-ink-800/80', tv ? 'h-[26em] w-[3.4em]' : 'h-48 w-6')} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Survey score">
        <motion.div
          className={cx('absolute bottom-0 left-0 right-0 rounded-full', incorrect ? 'bg-gradient-to-t from-rose-500 to-rose-400' : 'bg-gradient-to-t from-brass-500 via-brass-400 to-cyan-300')}
          animate={{ height: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.12, ease: 'linear' }}
          style={{ boxShadow: danger ? '0 0 30px rgba(232,193,112,0.6)' : undefined }}
        />
        {[25, 50, 75].map((m) => (
          <div key={m} className="absolute left-0 right-0 border-t border-white/15" style={{ bottom: `${m}%` }} aria-hidden />
        ))}
      </div>

      {/* Counter */}
      <div className="flex flex-col items-center">
        <motion.div
          key={isZero ? 'zero' : 'count'}
          className={cx('font-display tabular font-semibold leading-none', tv ? 'text-[16em]' : 'text-7xl', incorrect ? 'text-rose-400' : isZero ? 'text-brass-300' : danger ? 'text-brass-300' : 'text-mist-100')}
          animate={isZero && !reducedMotion ? { scale: [1, 1.12, 1] } : holding ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ textShadow: isZero ? '0 0 60px rgba(232,193,112,0.8)' : undefined }}
        >
          {incorrect ? incorrectScore : value}
        </motion.div>
        <AnimatePresence>
          {incorrect ? (
            <motion.p key="wrong" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cx('eyebrow mt-[0.5em] text-rose-400', tv ? 'text-[1.4em]' : 'text-xs')}>
              Not accepted
            </motion.p>
          ) : isZero ? (
            <motion.p key="zero" initial={{ opacity: 0, y: 10, letterSpacing: '0.1em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.35em' }} transition={{ duration: 0.8 }} className={cx('font-semibold uppercase text-brass-300', tv ? 'mt-[0.4em] text-[2.4em]' : 'mt-2 text-sm')}>
              {zeroTerm}
            </motion.p>
          ) : (
            <p key="label" className={cx('eyebrow', tv ? 'mt-[0.6em] text-[1.2em]' : 'text-[10px]')}>
              of 100 people
            </p>
          )}
        </AnimatePresence>
      </div>

      {/* Zero burst */}
      <AnimatePresence>
        {isZero && !reducedMotion ? (
          <motion.div key="burst" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-[0.4em] w-[0.4em] rounded-full bg-brass-300"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos((i / 14) * Math.PI * 2) * (tv ? 320 : 120), y: Math.sin((i / 14) * Math.PI * 2) * (tv ? 320 : 120), opacity: 0, scale: 0.2 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
            ))}
            <motion.div className="absolute rounded-full border border-brass-400/50" initial={{ width: 0, height: 0, opacity: 0.9 }} animate={{ width: tv ? 900 : 300, height: tv ? 900 : 300, opacity: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
