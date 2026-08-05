import type { Program } from '../types'

// Classic splits — listed after the lettered days on the home page.
const classicSplits: Program[] = [
  {
    id: 'push',
    name: 'Push Day',
    tag: 'push',
    tagColor: '#4DABF7',
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'bench-press', sets: 4, reps: '6–8', weightKg: 80 },
      { exerciseId: 'incline-db-press', sets: 3, reps: '10–12', weightKg: 28 },
      { exerciseId: 'cable-fly', sets: 3, reps: '12–15', weightKg: 15 },
      { exerciseId: 'cable-lateral-raise', sets: 4, reps: '12–15', weightKg: 10 },
      { exerciseId: 'overhead-tricep-ext', sets: 3, reps: '10–12', weightKg: 20 },
      { exerciseId: 'tricep-pushdown', sets: 3, reps: '12–15', weightKg: 25 },
    ],
  },
  {
    id: 'pull',
    name: 'Pull Day',
    tag: 'pull',
    tagColor: '#C084FC',
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'weighted-pullup', sets: 4, reps: '6–8', weightKg: 10 },
      { exerciseId: 'barbell-row', sets: 4, reps: '6–8', weightKg: 70 },
      { exerciseId: 'seated-cable-row', sets: 3, reps: '10–12', weightKg: 55 },
      { exerciseId: 'face-pull', sets: 3, reps: '15–20', weightKg: 15 },
      { exerciseId: 'incline-db-curl', sets: 3, reps: '10–12', weightKg: 14 },
      { exerciseId: 'cable-curl', sets: 3, reps: '12–15', weightKg: 20 },
    ],
  },
  {
    id: 'legs',
    name: 'Leg Day',
    tag: 'legs',
    tagColor: '#4ADE80',
    estimatedMinutes: 75,
    exercises: [
      { exerciseId: 'barbell-squat', sets: 4, reps: '6–8', weightKg: 100 },
      { exerciseId: 'romanian-deadlift', sets: 4, reps: '8–10', weightKg: 80 },
      { exerciseId: 'leg-press', sets: 4, reps: '10–12', weightKg: 140 },
      { exerciseId: 'leg-extension', sets: 3, reps: '12–15', weightKg: 50 },
      { exerciseId: 'lying-leg-curl', sets: 3, reps: '10–12', weightKg: 40 },
      { exerciseId: 'standing-calf-raise', sets: 4, reps: '15–20', weightKg: 60 },
    ],
  },
  {
    id: 'upper',
    name: 'Upper Day',
    tag: 'upper',
    tagColor: '#FBBF24',
    estimatedMinutes: 70,
    exercises: [
      { exerciseId: 'overhead-press', sets: 4, reps: '6–8', weightKg: 55 },
      { exerciseId: 'close-grip-bench', sets: 3, reps: '8–10', weightKg: 70 },
      { exerciseId: 'chest-supported-row', sets: 3, reps: '12–15', weightKg: 24 },
      { exerciseId: 'lat-pulldown', sets: 3, reps: '10–12', weightKg: 60 },
      { exerciseId: 'db-lateral-raise', sets: 3, reps: '15–20', weightKg: 10 },
      { exerciseId: 'hammer-curl', sets: 3, reps: '10–12', weightKg: 18 },
    ],
  },
  // ── Muscle Ladder programmes (Nippard) ──────────────────────────
  {
    id: 'lower-ml',
    name: 'Lower Day',
    tag: 'lower',
    tagColor: '#FB923C',
    estimatedMinutes: 85,
    exercises: [
      // Rung 1 — Quads: primary compound, lengthened overload
      { exerciseId: 'barbell-squat', sets: 4, reps: '6–8', weightKg: 100 },
      // Rung 2 — Hamstrings: hip hinge for full stretch
      { exerciseId: 'romanian-deadlift', sets: 3, reps: '8–10', weightKg: 80 },
      // Rung 1b — Quads: second compound for volume
      { exerciseId: 'leg-press', sets: 3, reps: '10–12', weightKg: 140 },
      // Rung 3 — Glutes: shortened-position isolation
      { exerciseId: 'hip-thrust', sets: 3, reps: '10–12', weightKg: 80 },
      // Rung 2b — Hamstrings: knee flexion angle
      { exerciseId: 'lying-leg-curl', sets: 3, reps: '10–12', weightKg: 40 },
      // Rung 1c — Quads: isolation, stretch overload
      { exerciseId: 'leg-extension', sets: 3, reps: '12–15', weightKg: 50 },
      // Calves
      { exerciseId: 'standing-calf-raise', sets: 4, reps: '15–20', weightKg: 60 },
    ],
  },
  {
    id: 'full-ml',
    name: 'Full Body',
    tag: 'full',
    tagColor: '#2DD4BF',
    estimatedMinutes: 75,
    exercises: [
      // Rung 1 — Quads (highest ladder priority)
      { exerciseId: 'barbell-squat', sets: 3, reps: '6–8', weightKg: 90 },
      // Rung 2 — Hamstrings/Glutes: hip hinge
      { exerciseId: 'romanian-deadlift', sets: 3, reps: '8–10', weightKg: 70 },
      // Rung 3 — Lats: vertical pull
      { exerciseId: 'weighted-pullup', sets: 3, reps: '6–8', weightKg: 10 },
      // Rung 4 — Chest: horizontal push
      { exerciseId: 'bench-press', sets: 3, reps: '8–10', weightKg: 75 },
      // Rung 5 — Side delts (needs most isolation volume per ladder)
      { exerciseId: 'cable-lateral-raise', sets: 3, reps: '15–20', weightKg: 10 },
      // Rung 6 — Biceps: stretch position priority
      { exerciseId: 'incline-db-curl', sets: 3, reps: '10–12', weightKg: 14 },
      // Rung 7 — Triceps: long head/stretch priority
      { exerciseId: 'overhead-tricep-ext', sets: 3, reps: '10–12', weightKg: 20 },
    ],
  },
]

// ── Lettered split days — the main rotation, shown first ────────────
// Starting weights below are placeholders: once an exercise has history,
// startSession pre-fills the weight you last used for it.
const splitDays: Program[] = [
  {
    id: 'day-a',
    name: 'Day A',
    subtitle: 'Quads · horizontal push & pull',
    tag: 'a',
    tagColor: '#F87171',
    estimatedMinutes: 60,
    exercises: [
      { exerciseId: 'barbell-squat', sets: 3, reps: '5–8', weightKg: 100 },
      { exerciseId: 'bench-press', sets: 3, reps: '6–8', weightKg: 80 },
      { exerciseId: 'chest-supported-row', sets: 3, reps: '8–12', weightKg: 24 },
      { exerciseId: 'seated-db-press', sets: 3, reps: '8–12', weightKg: 20 },
      // "Bulgarian Split Squat or Leg Press" — swap for leg press if preferred
      { exerciseId: 'bulgarian-split-squat', sets: 2, reps: '10–12', weightKg: 20 },
      { exerciseId: 'overhead-tricep-ext', sets: 2, reps: '12–15', weightKg: 20 },
    ],
  },
  {
    id: 'day-b',
    name: 'Day B',
    subtitle: 'Hams & calves · incline push · vertical pull',
    tag: 'b',
    tagColor: '#F472B6',
    estimatedMinutes: 65,
    exercises: [
      { exerciseId: 'romanian-deadlift', sets: 3, reps: '6–10', weightKg: 80 },
      { exerciseId: 'incline-db-press', sets: 3, reps: '8–12', weightKg: 28 },
      // "Pull-up or Lat Pulldown" — swap in the detail sheet for weighted pull-ups
      { exerciseId: 'lat-pulldown', sets: 3, reps: '8–12', weightKg: 60 },
      { exerciseId: 'seated-leg-curl', sets: 2, reps: '10–15', weightKg: 40 },
      { exerciseId: 'standing-calf-raise', sets: 3, reps: '10–15', weightKg: 60 },
      { exerciseId: 'ez-bar-curl', sets: 3, reps: '8–12', weightKg: 25 },
      // "Close-Grip Bench or Dips" — swap for dips if preferred
      { exerciseId: 'close-grip-bench', sets: 2, reps: '8–12', weightKg: 70 },
    ],
  },
  {
    id: 'day-c',
    name: 'Day C',
    subtitle: 'Quads, calves & abs · shoulder-lead',
    tag: 'c',
    tagColor: '#818CF8',
    estimatedMinutes: 70,
    exercises: [
      // "Hack Squat or Leg Press"
      { exerciseId: 'hack-squat', sets: 3, reps: '8–12', weightKg: 100 },
      { exerciseId: 'overhead-press', sets: 3, reps: '5–8', weightKg: 55 },
      // "Machine Chest Press or Cable Fly"
      { exerciseId: 'cable-chest-press', sets: 3, reps: '10–15', weightKg: 40 },
      { exerciseId: 'db-lateral-raise', sets: 3, reps: '12–20', weightKg: 10 },
      { exerciseId: 'seated-calf-raise', sets: 3, reps: '12–20', weightKg: 40 },
      { exerciseId: 'incline-db-curl', sets: 3, reps: '10–12', weightKg: 14 },
      { exerciseId: 'cable-crunch', sets: 3, reps: '10–15', weightKg: 30 },
    ],
  },
  {
    id: 'day-d',
    name: 'Day D',
    subtitle: 'Glutes, hams & abs · back-lead',
    tag: 'd',
    tagColor: '#A3E635',
    estimatedMinutes: 75,
    exercises: [
      { exerciseId: 'hip-thrust', sets: 3, reps: '8–12', weightKg: 80 },
      // "Weighted Pull-up or Neutral-Grip Pulldown"
      { exerciseId: 'weighted-pullup', sets: 3, reps: '6–10', weightKg: 10 },
      { exerciseId: 'seated-cable-row', sets: 3, reps: '8–12', weightKg: 55 },
      { exerciseId: 'lying-leg-curl', sets: 3, reps: '8–12', weightKg: 40 },
      { exerciseId: 'rear-delt-fly', sets: 3, reps: '12–20', weightKg: 15 },
      { exerciseId: 'rope-pushdown', sets: 3, reps: '10–15', weightKg: 25 },
      { exerciseId: 'hammer-curl', sets: 2, reps: '10–12', weightKg: 18 },
      // Bodyweight — add load with the weight stepper if you use a belt
      { exerciseId: 'hanging-leg-raise', sets: 3, reps: '10–15', weightKg: 0 },
    ],
  },
]

// Home-page order: Days A–D first, then the classic Push/Pull/Legs splits.
export const featuredPrograms: Program[] = [...splitDays, ...classicSplits]
