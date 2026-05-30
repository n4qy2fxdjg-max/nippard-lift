/**
 * Local notification helpers for workout events.
 * Uses the browser Notification API — no server or push subscription needed.
 * Notifications only show when the app is backgrounded (iOS hides them in foreground).
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

let restDoneTimer: ReturnType<typeof setTimeout> | null = null
let setReminderTimer: ReturnType<typeof setTimeout> | null = null

/** Schedule a "rest done" notification after `seconds`. Call clearRestTimer() if user skips. */
export function scheduleRestDoneNotification(seconds: number) {
  clearRestTimer()
  if (!canNotify()) return
  restDoneTimer = setTimeout(() => {
    // Only show if page is hidden (in-app timer handles foreground)
    if (document.visibilityState === 'hidden') {
      new Notification('⏱ Rest Complete', {
        body: 'Time to hit your next set!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        silent: false,
      })
    }
  }, seconds * 1000)
}

export function clearRestTimer() {
  if (restDoneTimer !== null) { clearTimeout(restDoneTimer); restDoneTimer = null }
}

/** Schedule a "don't forget to log" reminder after 2 minutes of no set logged. */
export function scheduleSetReminder() {
  clearSetReminder()
  if (!canNotify()) return
  setReminderTimer = setTimeout(() => {
    if (document.visibilityState === 'hidden') {
      new Notification('🏋️ Still going?', {
        body: "Don't forget to log your set!",
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        silent: true,
      })
    }
  }, 2 * 60 * 1000)
}

export function clearSetReminder() {
  if (setReminderTimer !== null) { clearTimeout(setReminderTimer); setReminderTimer = null }
}

export function clearAllNotificationTimers() {
  clearRestTimer()
  clearSetReminder()
}
