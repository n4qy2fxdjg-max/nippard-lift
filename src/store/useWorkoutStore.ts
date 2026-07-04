import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import type { ActiveSession, WorkoutLog, SessionExercise, SetResult, WarmupSet } from '../types'
import { exercises as exerciseData } from '../data/exercises'
import { featuredPrograms } from '../data/programs'
import { useLibraryStore } from './useLibraryStore'

// Compound lifts that get automatic warm-up sets
const WARMUP_EXERCISE_IDS = new Set([
  'barbell-squat', 'bench-press', 'overhead-press', 'barbell-row',
  'romanian-deadlift', 'close-grip-bench', 'leg-press', 'incline-bench-press',
])

export function buildWarmupSets(workingWeightKg: number, exerciseId: string): WarmupSet[] {
  if (!WARMUP_EXERCISE_IDS.has(exerciseId)) return []
  // Round to nearest 2.5 kg plate
  const round = (w: number) => Math.max(20, Math.round(w / 2.5) * 2.5)
  return [
    { weightKg: round(workingWeightKg * 0.45), targetReps: 8, completed: false },
    { weightKg: round(workingWeightKg * 0.65), targetReps: 5, completed: false },
    { weightKg: round(workingWeightKg * 0.80), targetReps: 3, completed: false },
  ]
}

interface WorkoutStore {
  activeSession: ActiveSession | null
  logs: WorkoutLog[]
  startSession: (planId: string, planName: string, sessionExercises: SessionExercise[]) => void
  markSetComplete: (reps: number, rpe?: number) => void
  completeWarmupSet: () => void
  undoWarmupSet: () => void
  undoLastSet: () => void
  addTargetSet: () => void
  removeTargetSet: () => void
  addWarmupSet: () => void
  removeWarmupSet: () => void
  adjustWeight: (exerciseId: string, delta: number) => void
  adjustWarmupWeight: (delta: number) => void
  skipRest: () => void
  jumpToExercise: (idx: number) => void
  tickRest: () => void
  completeSession: () => void
  abandonSession: () => void
  deleteLog: (id: string) => void
  restoreLog: (log: WorkoutLog) => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      logs: [],

      startSession: (planId, planName, sessionExercises) => {
        // Pre-fill each exercise with the weight used last time (most recent
        // logged session for that exercise), falling back to the plan weight.
        // Warm-up ramps are recomputed from the resolved working weight.
        const history = useLibraryStore.getState().weightHistory
        const exercises = sessionExercises.map((ex) => {
          const entries = history[ex.exerciseId]
          const last = entries && entries.length > 0 ? entries[entries.length - 1].weight : undefined
          if (last == null || last === ex.currentWeight) return ex
          const warm = buildWarmupSets(last, ex.exerciseId)
          return {
            ...ex,
            currentWeight: last,
            warmupSets: warm.length > 0 ? warm : ex.warmupSets,
          }
        })

        const firstEx = exercises[0]
        const hasWarmup = firstEx && (firstEx.warmupSets?.length ?? 0) > 0
        set({
          activeSession: {
            id: nanoid(),
            planId,
            planName,
            startedAt: Date.now(),
            exercises,
            currentExIdx: 0,
            currentSetIdx: 0,
            phase: hasWarmup ? 'warmup' : 'exercise',
            warmupSetIdx: 0,
            restRemaining: 0,
            restTotal: 0,
            timerStartAt: 0,
          },
        })
      },

      completeWarmupSet: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'warmup') return
        const ex = session.exercises[session.currentExIdx]
        const warmupSets = ex.warmupSets ?? []
        const nextIdx = session.warmupSetIdx + 1

        if (nextIdx >= warmupSets.length) {
          // All warmup sets done → transition to working sets
          const updatedWarmup = warmupSets.map((w, i) =>
            i === session.warmupSetIdx ? { ...w, completed: true } : w
          )
          const updatedExercises = session.exercises.map((e, i) =>
            i === session.currentExIdx ? { ...e, warmupSets: updatedWarmup } : e
          )
          set({ activeSession: { ...session, exercises: updatedExercises, phase: 'exercise', warmupSetIdx: 0 } })
        } else {
          // Mark current warmup done, advance
          const updatedWarmup = warmupSets.map((w, i) =>
            i === session.warmupSetIdx ? { ...w, completed: true } : w
          )
          const updatedExercises = session.exercises.map((e, i) =>
            i === session.currentExIdx ? { ...e, warmupSets: updatedWarmup } : e
          )
          set({ activeSession: { ...session, exercises: updatedExercises, warmupSetIdx: nextIdx } })
        }
      },

      // Step back one warm-up set (re-marks it incomplete). No-op on the first set.
      undoWarmupSet: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'warmup' || session.warmupSetIdx === 0) return
        const prevIdx = session.warmupSetIdx - 1
        const ex = session.exercises[session.currentExIdx]
        const warmupSets = (ex.warmupSets ?? []).map((w, i) =>
          i === prevIdx ? { ...w, completed: false } : w
        )
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, warmupSets } : e
        )
        set({ activeSession: { ...session, exercises: updatedExercises, warmupSetIdx: prevIdx } })
      },

      markSetComplete: (reps, rpe) => {
        const session = get().activeSession
        if (!session || session.phase !== 'exercise') return

        const ex = session.exercises[session.currentExIdx]
        const exercise = exerciseData.find((e) => e.id === ex.exerciseId)
        const result: SetResult = {
          completed: true,
          weight: ex.currentWeight,
          reps,
          rpe,
          timestamp: Date.now(),
        }

        const updatedSets = [...ex.sets, result]
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, sets: updatedSets } : e
        )

        const allSetsForEx = updatedSets.length >= ex.targetSets
        const restSecs = exercise?.restSeconds ?? 90

        // Exercises can be trained in any order (pill navigation), so "done"
        // means every exercise is complete — not "the last one by index".
        const isIncomplete = (e: SessionExercise) =>
          e.sets.filter((s) => s.completed).length < e.targetSets

        if (allSetsForEx && !updatedExercises.some(isIncomplete)) {
          set({ activeSession: { ...session, exercises: updatedExercises, phase: 'done' } })
          return
        }

        if (allSetsForEx) {
          // Advance to the next incomplete exercise, wrapping past the end —
          // an earlier exercise may have been left unfinished via the pills.
          const n = updatedExercises.length
          let nextExIdx = session.currentExIdx
          for (let step = 1; step <= n; step++) {
            const cand = (session.currentExIdx + step) % n
            if (isIncomplete(updatedExercises[cand])) { nextExIdx = cand; break }
          }
          // Whether the next exercise needs a warm-up is re-derived in
          // skipRest/tickRest when the rest period ends — no need to flag it here.
          set({
            activeSession: {
              ...session,
              exercises: updatedExercises,
              currentExIdx: nextExIdx,
              currentSetIdx: 0,
              phase: 'rest',
              restTotal: restSecs,
              restRemaining: restSecs,
              timerStartAt: Date.now(),
              warmupSetIdx: 0,
            },
          })
        } else {
          set({
            activeSession: {
              ...session,
              exercises: updatedExercises,
              currentSetIdx: session.currentSetIdx + 1,
              phase: 'rest',
              restTotal: restSecs,
              restRemaining: restSecs,
              timerStartAt: Date.now(),
            },
          })
        }
      },

      undoLastSet: () => {
        const session = get().activeSession
        if (!session) return
        const ex = session.exercises[session.currentExIdx]
        if (!ex || ex.sets.length === 0) return
        const updatedSets = ex.sets.slice(0, -1)
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, sets: updatedSets } : e
        )
        set({ activeSession: { ...session, exercises: updatedExercises, phase: 'exercise' } })
      },

      addTargetSet: () => {
        const session = get().activeSession
        if (!session) return
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, targetSets: e.targetSets + 1 } : e
        )
        set({ activeSession: { ...session, exercises: updatedExercises } })
      },

      removeTargetSet: () => {
        const session = get().activeSession
        if (!session) return
        const ex = session.exercises[session.currentExIdx]
        const completed = ex.sets.filter((s) => s.completed).length
        if (ex.targetSets <= 1 || ex.targetSets <= completed) return
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, targetSets: e.targetSets - 1 } : e
        )
        set({ activeSession: { ...session, exercises: updatedExercises } })
      },

      // Drop the last (not-yet-completed) warm-up set — already feeling warm.
      // Removing the one currently in front of you moves straight to working sets.
      removeWarmupSet: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'warmup') return
        const ex = session.exercises[session.currentExIdx]
        const warmups = ex.warmupSets ?? []
        if (warmups.length === 0 || warmups[warmups.length - 1].completed) return
        const trimmed = warmups.slice(0, -1)
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, warmupSets: trimmed } : e
        )
        const stillInWarmup = session.warmupSetIdx < trimmed.length
        set({
          activeSession: {
            ...session,
            exercises: updatedExercises,
            phase: stillInWarmup ? 'warmup' : 'exercise',
            warmupSetIdx: stillInWarmup ? session.warmupSetIdx : 0,
          },
        })
      },

      // Restore a removed warm-up set, refilled from the standard ramp for the
      // current working weight. Capped at the ramp length (3), so this only
      // undoes removals — it can't grow the warm-up beyond the default.
      addWarmupSet: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'warmup') return
        const ex = session.exercises[session.currentExIdx]
        const warmups = ex.warmupSets ?? []
        const ramp = buildWarmupSets(ex.currentWeight, ex.exerciseId)
        if (warmups.length >= ramp.length) return
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx
            ? { ...e, warmupSets: [...warmups, { ...ramp[warmups.length], completed: false }] }
            : e
        )
        set({ activeSession: { ...session, exercises: updatedExercises } })
      },

      adjustWarmupWeight: (delta) => {
        const session = get().activeSession
        if (!session || session.phase !== 'warmup') return
        const exIdx = session.currentExIdx
        const wIdx = session.warmupSetIdx
        const updatedExercises = session.exercises.map((e, i) => {
          if (i !== exIdx) return e
          const warmupSets = (e.warmupSets ?? []).map((w, j) =>
            j === wIdx ? { ...w, weightKg: Math.max(0, parseFloat((w.weightKg + delta).toFixed(2))) } : w
          )
          return { ...e, warmupSets }
        })
        set({ activeSession: { ...session, exercises: updatedExercises } })
      },

      adjustWeight: (exerciseId, delta) => {
        const session = get().activeSession
        if (!session) return
        set({
          activeSession: {
            ...session,
            exercises: session.exercises.map((e) =>
              e.exerciseId === exerciseId
                ? { ...e, currentWeight: Math.max(0, parseFloat((e.currentWeight + delta).toFixed(2))) }
                : e
            ),
          },
        })
      },

      skipRest: () => {
        const session = get().activeSession
        if (!session) return
        const nextEx = session.exercises[session.currentExIdx]
        const nextHasWarmup = session.phase === 'rest' &&
          session.currentSetIdx === 0 &&
          nextEx?.sets.length === 0 && // no warm-up restart on a partially-trained exercise
          (nextEx?.warmupSets?.length ?? 0) > 0 &&
          !(nextEx.warmupSets?.every((w) => w.completed))
        set({
          activeSession: {
            ...session,
            phase: nextHasWarmup ? 'warmup' : 'exercise',
            restRemaining: 0,
            warmupSetIdx: 0,
          },
        })
      },

      // Jump to any exercise (tapping its pill) — train in whatever order the
      // gym allows. Resumes at its first incomplete warm-up if none of its
      // working sets are logged yet; otherwise goes straight to working sets.
      jumpToExercise: (idx) => {
        const session = get().activeSession
        if (!session || session.phase === 'done') return
        if (idx < 0 || idx >= session.exercises.length || idx === session.currentExIdx) return
        const ex = session.exercises[idx]
        const warmups = ex.warmupSets ?? []
        const needsWarmup =
          warmups.length > 0 && !warmups.every((w) => w.completed) && ex.sets.length === 0
        set({
          activeSession: {
            ...session,
            currentExIdx: idx,
            currentSetIdx: ex.sets.length,
            phase: needsWarmup ? 'warmup' : 'exercise',
            warmupSetIdx: warmups.filter((w) => w.completed).length,
            restRemaining: 0,
          },
        })
      },

      tickRest: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'rest') return
        const elapsed = Math.floor((Date.now() - session.timerStartAt) / 1000)
        const remaining = Math.max(0, session.restTotal - elapsed)
        if (remaining === 0) {
          const nextEx = session.exercises[session.currentExIdx]
          const goWarmup = session.currentSetIdx === 0 &&
            nextEx?.sets.length === 0 && // no warm-up restart on a partially-trained exercise
            (nextEx?.warmupSets?.length ?? 0) > 0 &&
            !(nextEx.warmupSets?.every((w) => w.completed))
          set({
            activeSession: {
              ...session,
              phase: goWarmup ? 'warmup' : 'exercise',
              restRemaining: 0,
              warmupSetIdx: 0,
            },
          })
        } else {
          set({ activeSession: { ...session, restRemaining: remaining } })
        }
      },

      completeSession: () => {
        const session = get().activeSession
        if (!session) return

        // End the clock at the last logged set (+ a short cooldown) rather than
        // "now" — the session persists across backgrounding, so a workout left
        // open for hours would otherwise record a multi-hour duration and skew
        // the avg-session stat.
        const lastSetTs = session.exercises.reduce(
          (max, e) => e.sets.reduce((m, s) => Math.max(m, s.timestamp ?? 0), max),
          0
        )
        const endTs = lastSetTs > 0 ? Math.min(Date.now(), lastSetTs + 3 * 60 * 1000) : Date.now()
        const durationSec = Math.max(0, Math.floor((endTs - session.startedAt) / 1000))
        const today = format(new Date(), 'yyyy-MM-dd')
        const recordSession = useLibraryStore.getState().recordSession
        const prevHistory = useLibraryStore.getState().weightHistory
        const personalRecords: string[] = []

        let totalVolume = 0
        const exerciseResults = session.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed)
          completedSets.forEach((s) => { totalVolume += s.weight * s.reps })

          if (completedSets.length > 0) {
            const bestSet = completedSets.reduce((best, s) => {
              const e1rm = s.weight * (1 + s.reps / 30)
              const bestE1rm = best.weight * (1 + best.reps / 30)
              return e1rm > bestE1rm ? s : best
            })

            const newE1rm = bestSet.weight * (1 + bestSet.reps / 30)
            const prior = prevHistory[ex.exerciseId] ?? []
            const prevBest = prior.reduce((max, h) => (h.e1rm > max ? h.e1rm : max), 0)

            // Only a PR if there's prior history to beat — otherwise the first
            // set on any exercise would always "PR" against a baseline of 0.
            if (prior.length > 0 && newE1rm > prevBest) personalRecords.push(ex.exerciseId)

            recordSession(
              ex.exerciseId,
              today,
              bestSet.weight,
              bestSet.reps,
              completedSets.length
            )
          }

          return { exerciseId: ex.exerciseId, sets: completedSets }
        })

        const log: WorkoutLog = {
          id: nanoid(),
          planId: session.planId,
          planName: session.planName,
          date: today,
          durationSec,
          totalVolume: Math.round(totalVolume),
          exerciseResults,
          personalRecords,
          updatedAt: Date.now(),
        }

        set((s) => ({ logs: [log, ...s.logs], activeSession: null }))

        // Auto-push sync if configured (dynamic import to avoid circular dep)
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().pushSync().catch(() => {})
        })
      },

      abandonSession: () => set({ activeSession: null }),

      // Soft-delete: tombstone the record (kept + synced) instead of removing it,
      // so the deletion propagates to other devices instead of being resurrected.
      deleteLog: (id) => {
        set((s) => ({
          logs: s.logs.map((l) =>
            l.id === id ? { ...l, deleted: true, updatedAt: Date.now() } : l
          ),
        }))
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().pushSync().catch(() => {})
        })
      },

      restoreLog: (log) => {
        set((s) => {
          const exists = s.logs.some((l) => l.id === log.id)
          const logs = exists
            ? s.logs.map((l) =>
                l.id === log.id ? { ...l, deleted: false, updatedAt: Date.now() } : l
              )
            : [{ ...log, deleted: false, updatedAt: Date.now() }, ...s.logs]
          logs.sort((a, b) => b.date.localeCompare(a.date))
          return { logs }
        })
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().pushSync().catch(() => {})
        })
      },
    }),
    {
      name: 'lift-workout-v1',
      partialize: (state) => ({
        logs: state.logs,
        // Persist the active session so iOS background kills don't lose the workout.
        // We discard sessions older than 6 hours on rehydrate.
        activeSession: state.activeSession,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Discard stale sessions (older than 6 h) — and say so, instead of the
        // user's logged sets silently vanishing. Delayed so the Toaster is
        // mounted by the time it fires.
        if (state.activeSession && Date.now() - state.activeSession.startedAt > 6 * 60 * 60 * 1000) {
          state.activeSession = null
          setTimeout(() => {
            import('./useToastStore').then(({ useToastStore }) => {
              useToastStore.getState().show({ message: 'Previous workout expired and was discarded' })
            })
          }, 800)
        }
        // Prune tombstones older than 90 days to bound storage growth
        const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000
        if (state.logs?.length) {
          state.logs = state.logs.filter(
            (l) => !(l.deleted && l.updatedAt && Date.now() - l.updatedAt > NINETY_DAYS)
          )
        }
      },
    }
  )
)

// Helper to build a session from a featured program
export function buildSessionFromProgram(programId: string): { planName: string; exercises: SessionExercise[] } | null {
  const program = featuredPrograms.find((p) => p.id === programId)
  if (!program) return null
  return {
    planName: program.name,
    exercises: program.exercises.map((pe) => {
      const warmupSets = buildWarmupSets(pe.weightKg, pe.exerciseId)
      return {
        exerciseId: pe.exerciseId,
        targetSets: pe.sets,
        targetReps: pe.reps,
        currentWeight: pe.weightKg,
        sets: [],
        warmupSets: warmupSets.length > 0 ? warmupSets : undefined,
      }
    }),
  }
}
