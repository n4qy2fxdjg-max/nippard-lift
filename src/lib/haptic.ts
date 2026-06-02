/**
 * Haptic feedback utility.
 * - Android / Chrome: navigator.vibrate() (Web Vibration API) — works.
 * - iOS: there is NO reliable web haptics path. Safari ignores navigator.vibrate
 *   entirely, and the Web Audio "low-frequency tone nudges the Taptic Engine"
 *   trick below does NOT reliably fire it (at best a faint sound, usually
 *   nothing). It's kept as harmless best-effort; do not rely on tactile
 *   feedback on iOS. Must be called from a user gesture or iOS blocks the
 *   AudioContext anyway.
 */

let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return _ctx
  } catch {
    return null
  }
}

function iosHaptic(freq: number, duration: number, gain = 1) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch { /* ignore */ }
}

/** Light tap — button presses, selections */
export function hapticLight() {
  if ('vibrate' in navigator) { try { navigator.vibrate(8) } catch { /* */ } }
  iosHaptic(50, 0.04, 0.6)
}

/** Medium tap — set completion, confirmations */
export function hapticMedium() {
  if ('vibrate' in navigator) { try { navigator.vibrate(15) } catch { /* */ } }
  iosHaptic(60, 0.06, 0.9)
}

/** Heavy tap — PR, workout complete */
export function hapticHeavy() {
  if ('vibrate' in navigator) { try { navigator.vibrate([20, 60, 20]) } catch { /* */ } }
  iosHaptic(60, 0.12, 1)
  setTimeout(() => iosHaptic(55, 0.1, 0.8), 80)
}

/** Double pulse — rest timer done */
export function hapticRestDone() {
  if ('vibrate' in navigator) { try { navigator.vibrate([30, 80, 30]) } catch { /* */ } }
  iosHaptic(60, 0.08, 1)
  setTimeout(() => iosHaptic(60, 0.08, 1), 120)
}
