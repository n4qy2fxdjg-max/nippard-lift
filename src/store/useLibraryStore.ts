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
        set((state) => ({
          weightHistory: {
            ...state.weightHistory,
            [exerciseId]: [...(state.weightHistory[exerciseId] ?? []), entry],
          },
        }))
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
