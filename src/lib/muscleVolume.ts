import { subDays, parseISO, isAfter, startOfDay } from 'date-fns'
import { getExerciseById } from '../data/exercises'
import type { WorkoutLog } from '../types'

export interface MuscleTarget {
  key: string
  label: string
  min: number
  max: number
}

/**
 * Weekly working-set targets per muscle group — INTERMEDIATE landmarks
 * (Jeff Nippard / Renaissance Periodization MEV–MRV ranges).
 * Upper traps and neck are intentionally omitted.
 */
export const MUSCLE_TARGETS: MuscleTarget[] = [
  { key: 'Chest',      label: 'Chest',      min: 8,  max: 15 },
  { key: 'Back',       label: 'Back',       min: 10, max: 20 },
  { key: 'Shoulders',  label: 'Shoulders',  min: 10, max: 20 },
  { key: 'Biceps',     label: 'Biceps',     min: 6,  max: 10 },
  { key: 'Triceps',    label: 'Triceps',    min: 6,  max: 10 },
  { key: 'Forearms',   label: 'Forearms',   min: 3,  max: 8  },
  { key: 'Quads',      label: 'Quads',      min: 10, max: 15 },
  { key: 'Hamstrings', label: 'Hamstrings', min: 8,  max: 12 },
  { key: 'Glutes',     label: 'Glutes',     min: 10, max: 20 },
  { key: 'Calves',     label: 'Calves',     min: 6,  max: 10 },
  { key: 'Abs',        label: 'Abs',        min: 6,  max: 10 },
]

/** Map an exercise's primaryMuscle to a tracker category (null = not tracked) */
const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Chest',
  lats: 'Back', 'mid-back': 'Back', 'rear-delts': 'Back', traps: 'Back', 'lower-back': 'Back',
  shoulders: 'Shoulders', 'side-delts': 'Shoulders', 'front-delts': 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs', obliques: 'Abs',
  // adductors, neck → not tracked
}

export type VolumeStatus = 'none' | 'under' | 'on' | 'over'

/** Count completed working sets per muscle category over the trailing N days (inclusive of today). */
export function trailingWeekSets(logs: WorkoutLog[], days = 7): Record<string, number> {
  const cutoff = startOfDay(subDays(new Date(), days - 1))
  const counts: Record<string, number> = {}
  for (const t of MUSCLE_TARGETS) counts[t.key] = 0

  for (const log of logs) {
    if (log.deleted) continue // skip tombstoned workouts
    const d = parseISO(log.date)
    if (isAfter(cutoff, d)) continue // log is before the trailing window
    for (const ex of log.exerciseResults) {
      const exercise = getExerciseById(ex.exerciseId)
      if (!exercise) continue
      const cat = MUSCLE_TO_CATEGORY[exercise.primaryMuscle]
      if (!cat) continue
      const completed = ex.sets.filter((s) => s.completed).length
      counts[cat] += completed
    }
  }
  return counts
}

export function volumeStatus(sets: number, t: MuscleTarget): VolumeStatus {
  if (sets <= 0) return 'none'
  if (sets < t.min) return 'under'
  if (sets > t.max) return 'over'
  return 'on'
}

export const STATUS_COLOR: Record<VolumeStatus, string> = {
  none: '#3A3A38',
  under: '#C8A96E', // gold — below MEV, do more
  on: '#34C759',    // green — within the optimal range
  over: '#FF9F0A',  // orange — above MRV, consider easing off
}
