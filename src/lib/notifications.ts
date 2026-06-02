/**
 * Workout reminders, delivered via background web push so they fire even when
 * the app is closed or the screen is locked (see ./push.ts for why setTimeout
 * can't do this on iOS). These wrappers keep the call sites in ActiveWorkout
 * unchanged.
 */
import { requestNotificationPermission as requestPerm, scheduleReminder, cancelReminder } from './push'

export const requestNotificationPermission = requestPerm

/** Notify when the rest period ends. */
export function scheduleRestDoneNotification(seconds: number) {
  void scheduleReminder('rest', seconds, '⏱ Rest complete', 'Time for your next set')
}

export function clearRestTimer() {
  void cancelReminder('rest')
}

/** Nudge after 2 minutes in the working-set screen without logging anything. */
export function scheduleSetReminder() {
  void scheduleReminder('set', 2 * 60, '🏋️ Still going?', "Don't forget to log your set")
}

export function clearSetReminder() {
  void cancelReminder('set')
}

export function clearAllNotificationTimers() {
  void cancelReminder('rest')
  void cancelReminder('set')
}
