import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import type { ActiveSession, WorkoutLog, SessionExercise, SetResult } from '../types'
import { exercises as exerciseData } from '../data/exercises'
import { featuredPrograms } from '../data/programs'
import { useLibraryStore } from './useLibraryStore'

interface WorkoutStore {
  activeSession: ActiveSession | null
  logs: WorkoutLog[]
  startSession: (planId: string, planName: string, sessionExercises: SessionExercise[]) => void
  markSetComplete: (reps: number) => void
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
        set({
          activeSession: {
            id: nanoid(),
            planId,
            planName,
            startedAt: Date.now(),
            exercises: sessionExercises,
            currentExIdx: 0,
            currentSetIdx: 0,
            phase: 'exercise',
            restRemaining: 0,
            restTotal: 0,
            timerStartAt: 0,
          },
        })
      },

      markSetComplete: (reps) => {
        const session = get().activeSession
        if (!session) return

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

        if (allSetsForEx && isLastExercise) {
          set({
            activeSession: {
              ...session,
              exercises: updatedExercises,
              phase: 'done',
            },
          })
          return
        }

        if (allSetsForEx) {
          set({
            activeSession: {
              ...session,
              exercises: updatedExercises,
              currentExIdx: session.currentExIdx + 1,
              currentSetIdx: 0,
              phase: 'rest',
              restTotal: restSecs,
              restRemaining: restSecs,
              timerStartAt: Date.now(),
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
        set({ activeSession: { ...session, phase: 'exercise', restRemaining: 0 } })
      },

      tickRest: () => {
        const session = get().activeSession
        if (!session || session.phase !== 'rest') return
        const elapsed = Math.floor((Date.now() - session.timerStartAt) / 1000)
        const remaining = Math.max(0, session.restTotal - elapsed)
        if (remaining === 0) {
          set({ activeSession: { ...session, phase: 'exercise', restRemaining: 0 } })
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
      },

      abandonSession: () => set({ activeSession: null }),

      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
    }),
    {
      name: 'nippard-workout-v1',
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
    exercises: program.exercises.map((pe) => ({
      exerciseId: pe.exerciseId,
      targetSets: pe.sets,
      targetReps: pe.reps,
      currentWeight: pe.weightKg,
      sets: [],
    })),
  }
}
