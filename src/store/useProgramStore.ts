import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Program, ProgramExercise } from '../types'

interface ProgramStore {
  /** Per-programme exercise lists that replace the built-in ones — written
      whenever a featured programme is customised (swap or reorder) in its
      detail sheet, so the change is still there next session.
      Device-local, like warm-up preferences. */
  overrides: Record<string, ProgramExercise[]>
  setOverride: (programId: string, exercises: ProgramExercise[]) => void
  clearOverride: (programId: string) => void
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set) => ({
      overrides: {},
      setOverride: (programId, exercises) =>
        set((s) => ({ overrides: { ...s.overrides, [programId]: exercises } })),
      clearOverride: (programId) =>
        set((s) => {
          if (!(programId in s.overrides)) return s
          const next = { ...s.overrides }
          delete next[programId]
          return { overrides: next }
        }),
    }),
    { name: 'lift-programs-v1' }
  )
)

/** A programme with the user's saved customisation applied, if any. */
export function withOverride(program: Program, overrides: Record<string, ProgramExercise[]>): Program {
  const custom = overrides[program.id]
  if (!custom || custom.length === 0) return program
  return { ...program, exercises: custom }
}
