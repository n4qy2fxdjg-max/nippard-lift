// Shared display formatters — one source so the same number reads the same on
// every screen. (Progress, WorkoutDetailSheet, Settings and Home previously
// each had their own volume/duration formatting and disagreed: "5.3t" vs
// "5.3k kg" vs "5,321 kg" for the same workout.)
import { KG_TO_LB } from './theme'

/** 480 → "480" · 5321 → "5.3k" · 123456 → "123k" */
export function formatCompactNumber(n: number): string {
  if (n < 1000) return Math.round(n).toLocaleString()
  const k = n / 1000
  return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`
}

/** Workout volume in the user's unit, e.g. "5.3k kg" / "11.7k lb". */
export function formatVolume(kg: number, unit: 'kg' | 'lb'): string {
  const v = unit === 'lb' ? kg * KG_TO_LB : kg
  return `${formatCompactNumber(v)} ${unit}`
}

/** "<1 min", "45 min", "1h 12m" — never a bare "0 min". */
export function formatDurationMin(secs: number): string {
  if (secs < 60) return '<1 min'
  const m = Math.round(secs / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
