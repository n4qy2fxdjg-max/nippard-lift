import type { Program } from '../types'

export const featuredPrograms: Program[] = [
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
