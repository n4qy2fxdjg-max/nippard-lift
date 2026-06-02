import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'
import type { BodyweightEntry } from '../types'

interface AppStore {
  userName: string
  unit: 'kg' | 'lb'
  onboarded: boolean
  bodyweightLog: BodyweightEntry[]
  setUserName: (name: string) => void
  setUnit: (unit: 'kg' | 'lb') => void
  completeOnboarding: (name: string, unit: 'kg' | 'lb') => void
  logBodyweight: (weightKg: number) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userName: '',
      unit: 'kg',
      onboarded: false,
      bodyweightLog: [],
      setUserName: (name) => set({ userName: name }),
      setUnit: (unit) => set({ unit }),
      completeOnboarding: (name, unit) =>
        set({ userName: name.trim() || 'You', unit, onboarded: true }),
      logBodyweight: (weightKg) => {
        set((s) => {
          const today = format(new Date(), 'yyyy-MM-dd')
          const rest = (s.bodyweightLog ?? []).filter((e) => e.date !== today)
          const next = [...rest, { date: today, weightKg, updatedAt: Date.now() }]
          next.sort((a, b) => a.date.localeCompare(b.date))
          return { bodyweightLog: next }
        })
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().pushSync().catch(() => {})
        })
      },
    }),
    { name: 'lift-app-v1' }
  )
)
