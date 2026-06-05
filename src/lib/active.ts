import type { WorkoutLog, CustomPlan, ActivityLog } from '../types'

/**
 * Tombstoned records (deleted === true) are kept in local state and synced so
 * deletions propagate across devices, but they must never appear in the UI.
 * These helpers filter them out at read sites.
 */
export function activeLogs(logs: WorkoutLog[]): WorkoutLog[] {
  return logs.filter((l) => !l.deleted)
}

export function activePlans(plans: CustomPlan[]): CustomPlan[] {
  return plans.filter((p) => !p.deleted)
}

export function activeActivities(activities: ActivityLog[]): ActivityLog[] {
  return activities.filter((a) => !a.deleted)
}
