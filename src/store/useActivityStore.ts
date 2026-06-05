import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActivityLog } from '../types'

interface ActivityStore {
  activities: ActivityLog[]
  addActivity: (a: ActivityLog) => void
  /** tombstone delete so it propagates across devices, like workouts */
  deleteActivity: (id: string) => void
  restoreActivity: (a: ActivityLog) => void
}

function pushSync() {
  import('./useSyncStore').then(({ useSyncStore }) => {
    useSyncStore.getState().pushSync().catch(() => {})
  })
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      activities: [],

      addActivity: (a) => {
        set((s) => ({ activities: [{ ...a, updatedAt: Date.now() }, ...s.activities] }))
        pushSync()
      },

      deleteActivity: (id) => {
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, deleted: true, updatedAt: Date.now() } : a
          ),
        }))
        pushSync()
      },

      restoreActivity: (a) => {
        set((s) => {
          const exists = s.activities.some((x) => x.id === a.id)
          const activities = exists
            ? s.activities.map((x) => (x.id === a.id ? { ...x, deleted: false, updatedAt: Date.now() } : x))
            : [{ ...a, deleted: false, updatedAt: Date.now() }, ...s.activities]
          return { activities }
        })
        pushSync()
      },
    }),
    { name: 'lift-activity-v1' }
  )
)
