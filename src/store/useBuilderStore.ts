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
  restorePlan: (plan: CustomPlan) => void
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
        set((s) => ({ plans: [{ ...plan, updatedAt: Date.now(), deleted: false }, ...s.plans] }))
        autoSync()
      },

      // Soft-delete so the deletion propagates instead of being resurrected on the next pull.
      deletePlan: (id) => {
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p
          ),
        }))
        autoSync()
      },

      restorePlan: (plan) => {
        set((s) => {
          const exists = s.plans.some((p) => p.id === plan.id)
          const plans = exists
            ? s.plans.map((p) =>
                p.id === plan.id ? { ...p, deleted: false, updatedAt: Date.now() } : p
              )
            : [{ ...plan, deleted: false, updatedAt: Date.now() }, ...s.plans]
          return { plans }
        })
        autoSync()
      },

      updatePlan: (id, items) => {
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, items, updatedAt: Date.now() } : p
          ),
        }))
        autoSync()
      },

      reorderPlans: (plans) => {
        set({ plans })
        autoSync()
      },

      setCurrentItems: (items) => set({ currentItems: items }),
    }),
    { name: 'lift-builder-v1' }
  )
)
