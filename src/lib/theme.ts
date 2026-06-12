// Design tokens — single source of truth for the visual scale.
// Prefer these over hardcoded literals in new/edited components.

export const radius = {
  sm: 12,      // chips, badges, small buttons, steppers
  md: 16,      // cards, inputs, primary buttons
  lg: 24,      // hero cards, bottom sheets
  pill: 999,   // fully-rounded chips / tabs
  circle: '50%',
} as const

export const colors = {
  bg: '#0C0C0C',
  surface: '#161616',
  elevated: '#1E1E1E',
  sheet: 'rgba(18,18,18,0.98)', // single bottom-sheet surface (frosted)
  text: '#F0EDE8',
  muted: '#A8A49E',
  gold: '#C8A96E',
  green: '#34C759',
  red: '#FF453A', // iOS dark-mode systemRed — single source (was split #FF3B30/#FF453A)
} as const

// z-index scale — one formal stacking order. Replaces the ad-hoc per-component
// values (which had overlapping 200/200 and 300/300 bands).
export const z = {
  nav: 50,
  sheetBackdrop: 100,
  sheet: 101,
  toast: 150,
  fullscreen: 200, // ActiveWorkout, Onboarding
  dialog: 300,     // confirm dialogs layered above everything
} as const

// Width cap for the app column and every fixed-position element (nav, sheets).
// Must comfortably exceed the widest iPhone viewport (iPhone 17 Pro Max: 440pt)
// so the app fills the screen edge-to-edge on device, while still framing the
// layout on desktop. Keep in sync with #root max-width in index.css.
export const maxAppWidth = 520

// Motion presets — one source for the app's animation feel.
export const anim = {
  tap: { type: 'spring' as const, stiffness: 400, damping: 28 },
  sheet: { type: 'spring' as const, stiffness: 300, damping: 32 },
  enter: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
}

export const font = {
  display: '"DM Serif Display", Georgia, serif',
  body: '"Outfit", system-ui, sans-serif',
} as const

// kg <-> lb conversion (weights stored in kg internally)
export const KG_TO_LB = 2.20462
export const LB_TO_KG = 1 / KG_TO_LB
