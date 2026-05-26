import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkoutStore } from './useWorkoutStore'
import { useBuilderStore } from './useBuilderStore'
import { useLibraryStore } from './useLibraryStore'
import type { WorkoutLog, CustomPlan } from '../types'

// API base — always /api (Vite proxies to :8787 in dev, Worker serves it in prod)
const API = '/api'

// ── Merge helpers ────────────────────────────────────────────────────
function mergeLogs(a: WorkoutLog[], b: WorkoutLog[]): WorkoutLog[] {
  const map = new Map(a.map((l) => [l.id, l]))
  b.forEach((l) => { if (!map.has(l.id)) map.set(l.id, l) })
  return Array.from(map.values()).sort((x, y) => y.date.localeCompare(x.date))
}

function mergePlans(a: CustomPlan[], b: CustomPlan[]): CustomPlan[] {
  const map = new Map(a.map((p) => [p.id, p]))
  b.forEach((p) => { if (!map.has(p.id)) map.set(p.id, p) })
  return Array.from(map.values()).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
}

function mergeHistory(
  a: Record<string, any[]>,
  b: Record<string, any[]>
): Record<string, any[]> {
  const result = { ...a }
  for (const [key, entries] of Object.entries(b)) {
    const combined = [...(result[key] ?? []), ...entries]
    const byDate = new Map(combined.map((e) => [e.date, e]))
    result[key] = Array.from(byDate.values()).sort((x, y) => x.date.localeCompare(y.date))
  }
  return result
}

// ── Store interface ──────────────────────────────────────────────────
interface SyncStore {
  syncCode: string | null
  lastSyncAt: number | null
  isSyncing: boolean
  syncError: string | null

  createSync: () => Promise<string>
  verifyAndJoin: (code: string) => Promise<void>
  pushSync: () => Promise<void>
  pullSync: () => Promise<void>
  clearSync: () => void
  clearError: () => void
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      syncCode: null,
      lastSyncAt: null,
      isSyncing: false,
      syncError: null,

      // ── Create a new sync code and upload current data ─────────────
      createSync: async () => {
        set({ isSyncing: true, syncError: null })
        try {
          const res = await fetch(`${API}/sync/create`, { method: 'POST' })
          if (!res.ok) throw new Error('Server error — try again')
          const { code } = await res.json() as { code: string }
          set({ syncCode: code, isSyncing: false })
          // Upload current data immediately
          await get().pushSync()
          return code
        } catch (e: any) {
          set({ isSyncing: false, syncError: e.message })
          throw e
        }
      },

      // ── Verify a code then join (pull + merge) ─────────────────────
      verifyAndJoin: async (code: string) => {
        const normalised = code.trim().toUpperCase()
        set({ isSyncing: true, syncError: null })
        try {
          // 1. Verify code exists
          const verifyRes = await fetch(`${API}/sync/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: normalised }),
          })
          if (!verifyRes.ok) throw new Error('Server error — try again')
          const { exists } = await verifyRes.json() as { exists: boolean }
          if (!exists) {
            set({ isSyncing: false, syncError: 'Code not found — check and try again' })
            return
          }

          // 2. Store code first so pullSync can use it
          set({ syncCode: normalised })

          // 3. Pull and merge
          await get().pullSync()
        } catch (e: any) {
          set({ isSyncing: false, syncError: e.message })
          throw e
        }
      },

      // ── Push all local data to the cloud ──────────────────────────
      pushSync: async () => {
        const { syncCode } = get()
        if (!syncCode) return
        set({ isSyncing: true })
        try {
          const logs = useWorkoutStore.getState().logs
          const plans = useBuilderStore.getState().plans
          const weightHistory = useLibraryStore.getState().weightHistory

          const res = await fetch(`${API}/sync/${syncCode}/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs, plans, weightHistory }),
          })
          if (!res.ok) throw new Error('Push failed')
          set({ lastSyncAt: Date.now(), isSyncing: false })
        } catch {
          set({ isSyncing: false })
        }
      },

      // ── Pull and merge remote data into local stores ───────────────
      pullSync: async () => {
        const { syncCode } = get()
        if (!syncCode) return
        set({ isSyncing: true })
        try {
          const res = await fetch(`${API}/sync/${syncCode}/pull`)
          if (!res.ok) { set({ isSyncing: false }); return }

          const remote = await res.json() as {
            logs: WorkoutLog[]
            plans: CustomPlan[]
            weightHistory: Record<string, any[]>
          }

          const mergedLogs = mergeLogs(useWorkoutStore.getState().logs, remote.logs ?? [])
          useWorkoutStore.setState({ logs: mergedLogs })

          const mergedPlans = mergePlans(useBuilderStore.getState().plans, remote.plans ?? [])
          useBuilderStore.setState({ plans: mergedPlans })

          const mergedHistory = mergeHistory(
            useLibraryStore.getState().weightHistory,
            remote.weightHistory ?? {}
          )
          useLibraryStore.setState({ weightHistory: mergedHistory })

          set({ lastSyncAt: Date.now(), isSyncing: false })
        } catch {
          set({ isSyncing: false })
        }
      },

      clearSync: () => set({ syncCode: null, lastSyncAt: null, syncError: null }),
      clearError: () => set({ syncError: null }),
    }),
    {
      name: 'lift-sync-v2',
      partialize: (s) => ({ syncCode: s.syncCode, lastSyncAt: s.lastSyncAt }),
    }
  )
)
