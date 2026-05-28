import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomPlan, BuilderItem } from '../types'

function autoSync() {
  import('./useSyncStore').then(({ useSyncStore }) => {
    useSyncStore.getState().pushSync().catch(() => {})
  })
}

interface BuilderStore {
  plans: CustomPlan[]
  currentItems: BuilderItem[]
  addPlan: (plan: CustomPlan) => void
  deletePlan: (id: string) => void
  updatePlan: (id: string, items: BuilderItem[]) => void
  reorderPlans: (plans: CustomPlan[]) => void
  setCurrentItems: (items: BuilderItem[]) => void
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set) => ({
      plans: [],
      currentItems: [],

      addPlan: (plan) => {
        set((s) => ({ plans: [plan, ...s.plans] }))
        autoSync()
      },

      deletePlan: (id) => {
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) }))
        autoSync()
      },

      updatePlan: (id, items) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, items } : p)),
        })),

      reorderPlans: (plans) => {
        set({ plans })
        autoSync()
      },

      setCurrentItems: (items) => set({ currentItems: items }),
    }),
    { name: 'lift-builder-v1' }
  )
)
