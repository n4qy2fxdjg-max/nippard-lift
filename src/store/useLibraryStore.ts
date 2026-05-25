import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeightHistoryEntry } from '../types'

interface LibraryStore {
  weightHistory: Record<string, WeightHistoryEntry[]>
  recordSession: (exerciseId: string, date: string, weight: number, reps: number, sets: number) => void
  getHistory: (exerciseId: string) => WeightHistoryEntry[]
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      weightHistory: {},
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
    }),
    { name: 'nippard-library-v1' }
  )
)
