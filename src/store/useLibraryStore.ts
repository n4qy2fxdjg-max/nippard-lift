import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeightHistoryEntry, WarmupSetPref } from '../types'

interface LibraryStore {
  weightHistory: Record<string, WeightHistoryEntry[]>
  /** Customised warm-up ramps by exercise id, saved at workout completion and
      reused in future sessions. Device-local (not part of cross-device sync). */
  warmupPrefs: Record<string, WarmupSetPref[]>
  recordSession: (exerciseId: string, date: string, weight: number, reps: number, sets: number) => void
  getHistory: (exerciseId: string) => WeightHistoryEntry[]
  setWarmupPref: (exerciseId: string, sets: WarmupSetPref[]) => void
  clearWarmupPref: (exerciseId: string) => void
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      weightHistory: {},
      warmupPrefs: {},
      recordSession: (exerciseId, date, weight, reps, sets) => {
        const e1rm = parseFloat((weight * (1 + reps / 30)).toFixed(1))
        const entry: WeightHistoryEntry = { date, weight, reps, sets, e1rm }
        set((state) => {
          // Keep entries in date order. A session recovered after the fact is
          // dated when it was trained, so it can land before existing entries —
          // and callers read the last entry as "the weight you used last time".
          const prior = state.weightHistory[exerciseId] ?? []
          let at = prior.length
          while (at > 0 && prior[at - 1].date > date) at--
          const next = [...prior.slice(0, at), entry, ...prior.slice(at)]
          return { weightHistory: { ...state.weightHistory, [exerciseId]: next } }
        })
      },
      getHistory: (exerciseId) => get().weightHistory[exerciseId] ?? [],
      setWarmupPref: (exerciseId, sets) =>
        set((state) => ({ warmupPrefs: { ...state.warmupPrefs, [exerciseId]: sets } })),
      clearWarmupPref: (exerciseId) =>
        set((state) => {
          if (!(exerciseId in state.warmupPrefs)) return state
          const next = { ...state.warmupPrefs }
          delete next[exerciseId]
          return { warmupPrefs: next }
        }),
    }),
    { name: 'lift-library-v1' }
  )
)
