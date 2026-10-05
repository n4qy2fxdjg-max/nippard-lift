'use client';
import { useEffect, useRef, useState } from 'react';

/** Counts smoothly between values (used for the jackpot). */
export function AnimatedNumber({ value, format, durationMs = 900, className }: { value: number; format: (n: number) => string; durationMs?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    if (begin === value) return;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(begin + (value - begin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
