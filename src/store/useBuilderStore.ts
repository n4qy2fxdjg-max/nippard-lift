import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomPlan, BuilderItem } from '../types'

interface BuilderStore {
  plans: CustomPlan[]
  currentItems: BuilderItem[]
  addPlan: (plan: CustomPlan) => void
  deletePlan: (id: string) => void
  updatePlan: (id: string, items: BuilderItem[]) => void
  setCurrentItems: (items: BuilderItem[]) => void
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set) => ({
      plans: [],
      currentItems: [],
      addPlan: (plan) => set((s) => ({ plans: [plan, ...s.plans] })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      updatePlan: (id, items) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, items } : p)),
        })),
      setCurrentItems: (items) => set({ currentItems: items }),
    }),
    { name: 'nippard-builder-v1' }
  )
)
