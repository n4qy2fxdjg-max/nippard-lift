export type BodyGroup = 'upper' | 'lower' | 'core'

export type MuscleGroup =
  | 'chest' | 'upper-chest'
  | 'lats' | 'mid-back' | 'rear-delts'
  | 'side-delts' | 'front-delts' | 'shoulders'
  | 'triceps' | 'biceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'adductors'
  | 'abs' | 'obliques' | 'lower-back'
  | 'traps' | 'neck'

export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'smith'

export type ProgramTag = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'

export interface Exercise {
  id: string
  name: string
  bodyGroup: BodyGroup
  primaryMuscle: MuscleGroup
  secondaryMuscles?: MuscleGroup[]
  defaultSets: number
  defaultReps: string
  restSeconds: number
  restLabel: string
  formCues: string[]
  equipment: Equipment
  programTag?: ProgramTag
}

export interface ProgramExercise {
  exerciseId: string
  sets: number
  reps: string
  weightKg: number
}

export interface Program {
  id: string
  name: string
  tag: ProgramTag
  tagColor: string
  estimatedMinutes: number
  exercises: ProgramExercise[]
}

// Builder store types
export interface BuilderItem {
  uid: string
  exerciseId: string
  sets: number
  reps: number
  weightKg: number
}

export interface CustomPlan {
  id: string
  name: string
  createdAt: string
  items: BuilderItem[]
  /** ms epoch of last mutation — used for last-write-wins sync */
  updatedAt: number
  /** tombstone: kept locally + synced so deletions propagate across devices */
  deleted?: boolean
}

// Workout session types
export interface SetResult {
  completed: boolean
  weight: number
  reps: number
  rpe?: number
  timestamp?: number
}

export interface WarmupSet {
  weightKg: number
  targetReps: number
  completed: boolean
}

export interface SessionExercise {
  exerciseId: string
  targetSets: number
  targetReps: string
  currentWeight: number
  sets: SetResult[]
  warmupSets?: WarmupSet[]
}

export interface ActiveSession {
  id: string
  planId: string
  planName: string
  startedAt: number
  exercises: SessionExercise[]
  currentExIdx: number
  currentSetIdx: number
  phase: 'warmup' | 'exercise' | 'rest' | 'done'
  warmupSetIdx: number
  restRemaining: number
  restTotal: number
  timerStartAt: number
}

export interface WorkoutLog {
  id: string
  planId: string
  planName: string
  date: string
  durationSec: number
  totalVolume: number
  exerciseResults: Array<{
    exerciseId: string
    sets: SetResult[]
  }>
  personalRecords: string[]
  /** ms epoch of last mutation — used for last-write-wins sync */
  updatedAt: number
  /** tombstone: kept locally + synced so deletions propagate across devices */
  deleted?: boolean
}

// Library store types
export interface WeightHistoryEntry {
  date: string
  weight: number
  reps: number
  sets: number
  e1rm: number
}

// Bodyweight tracking (stored in kg internally)
export interface BodyweightEntry {
  date: string // yyyy-MM-dd
  weightKg: number
  /** ms epoch of last edit — used for last-write-wins sync (optional for legacy entries) */
  updatedAt?: number
  /** tombstone, so a removed weigh-in propagates instead of being restored on pull */
  deleted?: boolean
}
