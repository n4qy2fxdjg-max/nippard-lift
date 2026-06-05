import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkoutStore } from './useWorkoutStore'
import { useBuilderStore } from './useBuilderStore'
import { useLibraryStore } from './useLibraryStore'
import { useAppStore } from './useAppStore'
import { useActivityStore } from './useActivityStore'
import type { WorkoutLog, CustomPlan, BodyweightEntry, ActivityLog } from '../types'

// API base — always /api (Vite proxies to :8787 in dev, Worker serves it in prod)
const API = '/api'

// ── Merge helpers — record-level last-write-wins by updatedAt ─────────
// Tombstones (deleted) are carried through so a delete on one device wins
// over a stale copy on another, instead of being resurrected on the next pull.
function mergeLogs(a: WorkoutLog[], b: WorkoutLog[]): WorkoutLog[] {
  const map = new Map(a.map((l) => [l.id, l]))
  for (const l of b) {
    const cur = map.get(l.id)
    if (!cur || (l.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(l.id, l)
  }
  return Array.from(map.values()).sort((x, y) => y.date.localeCompare(x.date))
}

function mergePlans(a: CustomPlan[], b: CustomPlan[]): CustomPlan[] {
  const map = new Map(a.map((p) => [p.id, p]))
  for (const p of b) {
    const cur = map.get(p.id)
    if (!cur || (p.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(p.id, p)
  }
  return Array.from(map.values()).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
}

function mergeActivities(a: ActivityLog[], b: ActivityLog[]): ActivityLog[] {
  const map = new Map(a.map((x) => [x.id, x]))
  for (const x of b) {
    const cur = map.get(x.id)
    if (!cur || (x.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(x.id, x)
  }
  return Array.from(map.values()).sort((x, y) => y.date.localeCompare(x.date))
}

function mergeBodyweight(a: BodyweightEntry[], b: BodyweightEntry[]): BodyweightEntry[] {
  const map = new Map(a.map((e) => [e.date, e]))
  for (const e of b) {
    const cur = map.get(e.date)
    if (!cur || (e.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(e.date, e)
  }
  return Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date))
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

const AUTO_SYNC_COOLDOWN_MS = 60_000 // don't re-sync if last sync was < 60s ago

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
  /** Pull then push — safe to call on app focus; skips if no code or synced < 60s ago */
  autoSync: () => Promise<void>
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
          const bodyweight = useAppStore.getState().bodyweightLog
          const activities = useActivityStore.getState().activities

          const res = await fetch(`${API}/sync/${syncCode}/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs, plans, weightHistory, bodyweight, activities }),
          })
          if (!res.ok) throw new Error(`Sync upload failed (${res.status})`)
          set({ lastSyncAt: Date.now(), isSyncing: false, syncError: null })
        } catch (e: any) {
          set({ isSyncing: false, syncError: e?.message ?? 'Sync upload failed' })
        }
      },

      // ── Pull and merge remote data into local stores ───────────────
      pullSync: async () => {
        const { syncCode } = get()
        if (!syncCode) return
        set({ isSyncing: true })
        try {
          const res = await fetch(`${API}/sync/${syncCode}/pull`)
          if (!res.ok) throw new Error(`Sync download failed (${res.status})`)

          const remote = await res.json() as {
            logs: WorkoutLog[]
            plans: CustomPlan[]
            weightHistory: Record<string, any[]>
            bodyweight?: BodyweightEntry[]
            activities?: ActivityLog[]
          }

          const mergedLogs = mergeLogs(useWorkoutStore.getState().logs, remote.logs ?? [])
          useWorkoutStore.setState({ logs: mergedLogs })

          const mergedActivities = mergeActivities(
            useActivityStore.getState().activities,
            remote.activities ?? []
          )
          useActivityStore.setState({ activities: mergedActivities })

          const mergedPlans = mergePlans(useBuilderStore.getState().plans, remote.plans ?? [])
          useBuilderStore.setState({ plans: mergedPlans })

          const mergedHistory = mergeHistory(
            useLibraryStore.getState().weightHistory,
            remote.weightHistory ?? {}
          )
          useLibraryStore.setState({ weightHistory: mergedHistory })

          const mergedBw = mergeBodyweight(
            useAppStore.getState().bodyweightLog ?? [],
            remote.bodyweight ?? []
          )
          useAppStore.setState({ bodyweightLog: mergedBw })

          set({ lastSyncAt: Date.now(), isSyncing: false, syncError: null })
        } catch (e: any) {
          set({ isSyncing: false, syncError: e?.message ?? 'Sync download failed' })
        }
      },

      autoSync: async () => {
        const { syncCode, lastSyncAt, isSyncing } = get()
        if (!syncCode || isSyncing) return
        if (lastSyncAt && Date.now() - lastSyncAt < AUTO_SYNC_COOLDOWN_MS) return
        await get().pullSync()
        await get().pushSync()
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
