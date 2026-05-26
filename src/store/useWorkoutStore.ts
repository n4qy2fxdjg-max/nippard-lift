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

function haptic(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch (_) { /* ignore on unsupported */ }
  }
}

interface WorkoutStore {
  activeSession: ActiveSession | null
  logs: WorkoutLog[]
  startSession: (planId: string, planName: string, sessionExercises: SessionExercise[]) => void
  markSetComplete: (reps: number) => void
  completeWarmupSet: () => void
  undoLastSet: () => void
  addTargetSet: () => void
  removeTargetSet: () => void
  adjustWeight: (exerciseId: string, delta: number) => void
  skipRest: () => void
  tickRest: () => void
  completeSession: () => void
  abandonSession: () => void
  deleteLog: (id: string) => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      logs: [],

      startSession: (planId, planName, sessionExercises) => {
        const firstEx = sessionExercises[0]
        const hasWarmup = firstEx && (firstEx.warmupSets?.length ?? 0) > 0
        set({
          activeSession: {
            id: nanoid(),
            planId,
            planName,
            startedAt: Date.now(),
            exercises: sessionExercises,
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

      markSetComplete: (reps) => {
        const session = get().activeSession
        if (!session || session.phase !== 'exercise') return

        const ex = session.exercises[session.currentExIdx]
        const exercise = exerciseData.find((e) => e.id === ex.exerciseId)
        const result: SetResult = {
          completed: true,
          weight: ex.currentWeight,
          reps,
          timestamp: Date.now(),
        }

        const updatedSets = [...ex.sets, result]
        const updatedExercises = session.exercises.map((e, i) =>
          i === session.currentExIdx ? { ...e, sets: updatedSets } : e
        )

        const allSetsForEx = updatedSets.length >= ex.targetSets
        const isLastExercise = session.currentExIdx >= session.exercises.length - 1
        const restSecs = exercise?.restSeconds ?? 90

        haptic(60)

        if (allSetsForEx && isLastExercise) {
          set({ activeSession: { ...session, exercises: updatedExercises, phase: 'done' } })
          return
        }

        if (allSetsForEx) {
          const nextExIdx = session.currentExIdx + 1
          const nextEx = session.exercises[nextExIdx]
          const nextHasWarmup = (nextEx?.warmupSets?.length ?? 0) > 0
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
              // we'll switch to warmup after rest ends if next ex has warmup sets
              // store a flag in a temp field — actually we handle it in skipRest/tickRest
            },
          })
          // Store whether next exercise needs warmup — we check after rest
          if (nextHasWarmup) {
            // tag the session so we know to go to warmup after rest
            get() // side effect: will be read in skipRest/tickRest
          }
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

      tickRest: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'rest') return
        const elapsed = Math.floor((Date.now() - session.timerStartAt) / 1000)
        const remaining = Math.max(0, session.restTotal - elapsed)
        if (remaining === 0) {
          haptic([200, 80, 200, 80, 400])  // distinctive pattern when rest ends
          const nextEx = session.exercises[session.currentExIdx]
          const goWarmup = session.currentSetIdx === 0 &&
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

        const durationSec = Math.floor((Date.now() - session.startedAt) / 1000)
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
            const prevBest = (prevHistory[ex.exerciseId] ?? []).reduce(
              (max, h) => (h.e1rm > max ? h.e1rm : max),
              0
            )

            if (newE1rm > prevBest) personalRecords.push(ex.exerciseId)

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
        }

        set((s) => ({ logs: [log, ...s.logs], activeSession: null }))

        // Auto-push sync if configured (dynamic import to avoid circular dep)
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().pushSync().catch(() => {})
        })
      },

      abandonSession: () => set({ activeSession: null }),

      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
    }),
    {
      name: 'lift-workout-v1',
      partialize: (state) => ({ logs: state.logs }),
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
