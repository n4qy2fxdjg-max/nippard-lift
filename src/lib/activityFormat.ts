import type { ActivityLog } from '../types'

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

export function fmtActivityDistance(km: number): string {
  const rounded = km.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded} km`
}

export function fmtActivityPace(durationSec: number, km: number): string | null {
  if (km <= 0) return null
  const secPer = durationSec / km
  const m = Math.floor(secPer / 60)
  const s = Math.round(secPer % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

/** Compact one-line summary for list rows: "32m · 5.2 km" or just "45m". */
export function activitySubtitle(a: ActivityLog): string {
  const bits = [fmtActivityDuration(a.durationSec)]
  if (a.distanceKm && a.distanceKm > 0) bits.push(fmtActivityDistance(a.distanceKm))
  return bits.join(' · ')
}
