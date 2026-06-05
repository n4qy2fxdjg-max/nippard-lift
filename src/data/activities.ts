export interface ActivityType {
  id: string
  name: string
  emoji: string
  /** whether distance + pace apply (hidden for machine/sport activities) */
  distance: boolean
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: 'running',      name: 'Running',      emoji: '🏃', distance: true },
  { id: 'walking',      name: 'Walking',      emoji: '🚶', distance: true },
  { id: 'incline-walk', name: 'Incline Walk', emoji: '⛰️', distance: true },
  { id: 'stair-master', name: 'Stair Master', emoji: '🪜', distance: false },
  { id: 'cycling',      name: 'Cycling',      emoji: '🚴', distance: true },
  { id: 'swimming',     name: 'Swimming',     emoji: '🏊', distance: true },
  { id: 'rowing',       name: 'Rowing',       emoji: '🚣', distance: true },
  { id: 'elliptical',   name: 'Elliptical',   emoji: '🌀', distance: false },
  { id: 'tennis',       name: 'Tennis',       emoji: '🎾', distance: false },
  { id: 'squash',       name: 'Squash',       emoji: '🥎', distance: false },
  { id: 'hiking',       name: 'Hiking',       emoji: '🥾', distance: true },
  { id: 'other',        name: 'Other',        emoji: '🏅', distance: true },
]

export function getActivityType(id: string): ActivityType | undefined {
  return ACTIVITY_TYPES.find((a) => a.id === id)
}

export function activityEmoji(id: string): string {
  return getActivityType(id)?.emoji ?? '🏅'
}
