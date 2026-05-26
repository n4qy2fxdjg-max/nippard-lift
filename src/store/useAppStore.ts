import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  userName: string
  unit: 'kg' | 'lb'
  onboarded: boolean
  setUserName: (name: string) => void
  setUnit: (unit: 'kg' | 'lb') => void
  completeOnboarding: (name: string, unit: 'kg' | 'lb') => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userName: '',
      unit: 'kg',
      onboarded: false,
      setUserName: (name) => set({ userName: name }),
      setUnit: (unit) => set({ unit }),
      completeOnboarding: (name, unit) =>
        set({ userName: name.trim() || 'You', unit, onboarded: true }),
    }),
    { name: 'lift-app-v1' }
  )
)
