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
  text: '#F0EDE8',
  muted: '#8A8680',
  gold: '#C8A96E',
  green: '#34C759',
  red: '#FF3B30',
} as const

export const font = {
  display: '"DM Serif Display", Georgia, serif',
  body: '"Outfit", system-ui, sans-serif',
} as const

// kg <-> lb conversion (weights stored in kg internally)
export const KG_TO_LB = 2.20462
export const LB_TO_KG = 1 / KG_TO_LB
