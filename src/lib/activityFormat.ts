import type { ActivityLog } from '../types'

const KM_TO_MI = 0.621371

export function fmtActivityDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s && !h) parts.push(`${s}s`)
  return parts.join(' ') || '0m'
}

export function fmtActivityDistance(km: number, unit: 'kg' | 'lb'): string {
  const v = unit === 'lb' ? km * KM_TO_MI : km
  const rounded = v.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded} ${unit === 'lb' ? 'mi' : 'km'}`
}

export function fmtActivityPace(durationSec: number, km: number, unit: 'kg' | 'lb'): string | null {
  const dist = unit === 'lb' ? km * KM_TO_MI : km
  if (dist <= 0) return null
  const secPer = durationSec / dist
  const m = Math.floor(secPer / 60)
  const s = Math.round(secPer % 60)
  return `${m}:${String(s).padStart(2, '0')} /${unit === 'lb' ? 'mi' : 'km'}`
}

/** Compact one-line summary for list rows: "32m · 5.2 km" or just "45m". */
export function activitySubtitle(a: ActivityLog, unit: 'kg' | 'lb'): string {
  const bits = [fmtActivityDuration(a.durationSec)]
  if (a.distanceKm && a.distanceKm > 0) bits.push(fmtActivityDistance(a.distanceKm, unit))
  return bits.join(' · ')
}
