import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  userName: string
  unit: 'kg' | 'lb'
  setUserName: (name: string) => void
  setUnit: (unit: 'kg' | 'lb') => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userName: 'Wahab',
      unit: 'kg',
      setUserName: (name) => set({ userName: name }),
      setUnit: (unit) => set({ unit }),
    }),
    { name: 'nippard-app-v1' }
  )
)
