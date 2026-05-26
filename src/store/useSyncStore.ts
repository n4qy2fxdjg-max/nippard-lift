import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkoutStore } from './useWorkoutStore'
import { useLibraryStore } from './useLibraryStore'
import type { WorkoutLog } from '../types'

// Set VITE_SYNC_URL in .env to your deployed worker URL
const SYNC_URL = (import.meta.env.VITE_SYNC_URL as string | undefined) ?? ''

function mergeLogs(a: WorkoutLog[], b: WorkoutLog[]): WorkoutLog[] {
  const map = new Map(a.map((l) => [l.id, l]))
  b.forEach((l) => { if (!map.has(l.id)) map.set(l.id, l) })
  return Array.from(map.values()).sort((x, y) => y.date.localeCompare(x.date))
}

function mergeHistory(
  a: Record<string, any[]>,
  b: Record<string, any[]>
): Record<string, any[]> {
  const result = { ...a }
  for (const [key, entries] of Object.entries(b)) {
    const existing = result[key] ?? []
    const combined = [...existing, ...entries]
    const byDate = new Map(combined.map((e) => [e.date, e]))
    result[key] = Array.from(byDate.values()).sort((x, y) => x.date.localeCompare(y.date))
  }
  return result
}

interface SyncStore {
  syncCode: string | null
  lastSyncAt: number | null
  isSyncing: boolean
  syncError: string | null
  createSync: () => Promise<string>
  joinSync: (code: string) => Promise<void>
  pushSync: () => Promise<void>
  pullSync: () => Promise<void>
  clearSync: () => void
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      syncCode: null,
      lastSyncAt: null,
      isSyncing: false,
      syncError: null,

      createSync: async () => {
        if (!SYNC_URL) throw new Error('Sync URL not configured')
        set({ isSyncing: true, syncError: null })
        try {
          const logs = useWorkoutStore.getState().logs
          const weightHistory = useLibraryStore.getState().weightHistory
          const res = await fetch(`${SYNC_URL}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs, weightHistory }),
          })
          if (!res.ok) throw new Error('Server error')
          const data = await res.json() as { code: string }
          set({ syncCode: data.code, lastSyncAt: Date.now(), isSyncing: false })
          return data.code
        } catch (e: any) {
          set({ isSyncing: false, syncError: e.message })
          throw e
        }
      },

      joinSync: async (code: string) => {
        if (!SYNC_URL) throw new Error('Sync URL not configured')
        const normalised = code.trim().toUpperCase()
        set({ isSyncing: true, syncError: null })
        try {
          const res = await fetch(`${SYNC_URL}/pull?code=${normalised}`)
          if (res.status === 404) {
            set({ isSyncing: false, syncError: 'Code not found — check and try again' })
            throw new Error('Code not found')
          }
          if (!res.ok) throw new Error('Server error')
          const data = await res.json() as { logs: WorkoutLog[]; weightHistory: Record<string, any[]> }

          // Merge remote into local
          const localLogs = useWorkoutStore.getState().logs
          const mergedLogs = mergeLogs(localLogs, data.logs ?? [])
          useWorkoutStore.setState({ logs: mergedLogs })

          const localHistory = useLibraryStore.getState().weightHistory
          const mergedHistory = mergeHistory(localHistory, data.weightHistory ?? {})
          useLibraryStore.setState({ weightHistory: mergedHistory })

          set({ syncCode: normalised, lastSyncAt: Date.now(), isSyncing: false })
        } catch (e: any) {
          set({ isSyncing: false, syncError: e.message })
          throw e
        }
      },

      pushSync: async () => {
        const { syncCode } = get()
        if (!syncCode || !SYNC_URL) return
        set({ isSyncing: true })
        try {
          const logs = useWorkoutStore.getState().logs
          const weightHistory = useLibraryStore.getState().weightHistory
          await fetch(`${SYNC_URL}/push?code=${syncCode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs, weightHistory }),
          })
          set({ lastSyncAt: Date.now(), isSyncing: false })
        } catch {
          set({ isSyncing: false })
        }
      },

      pullSync: async () => {
        const { syncCode } = get()
        if (!syncCode || !SYNC_URL) return
        set({ isSyncing: true })
        try {
          const res = await fetch(`${SYNC_URL}/pull?code=${syncCode}`)
          if (!res.ok) { set({ isSyncing: false }); return }
          const data = await res.json() as { logs: WorkoutLog[]; weightHistory: Record<string, any[]> }

          const localLogs = useWorkoutStore.getState().logs
          const mergedLogs = mergeLogs(localLogs, data.logs ?? [])
          useWorkoutStore.setState({ logs: mergedLogs })

          const localHistory = useLibraryStore.getState().weightHistory
          const mergedHistory = mergeHistory(localHistory, data.weightHistory ?? {})
          useLibraryStore.setState({ weightHistory: mergedHistory })

          set({ lastSyncAt: Date.now(), isSyncing: false })
        } catch {
          set({ isSyncing: false })
        }
      },

      clearSync: () => set({ syncCode: null, lastSyncAt: null, syncError: null }),
    }),
    { name: 'lift-sync-v1', partialize: (s) => ({ syncCode: s.syncCode, lastSyncAt: s.lastSyncAt }) }
  )
)
