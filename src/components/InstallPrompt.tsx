import { useState } from 'react'

const DISMISS_KEY = 'lift-install-dismissed'

/** iOS Safari, not yet installed to the home screen, not previously dismissed. */
function shouldShow(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  if (!isIOS) return false
  const standalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  if (standalone) return false
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return false
  } catch { /* ignore */ }
  return true
}

/**
 * One-time, dismissible nudge for iOS Safari users to install the PWA — the gate
 * to standalone chrome, rest-end push notifications, and the wake lock. iOS gives
 * no beforeinstallprompt, so this is the only way to surface it.
 */
export default function InstallPrompt() {
  const [show, setShow] = useState(shouldShow)
  if (!show) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  return (
    <div style={{ padding: '0 24px', marginBottom: 24 }}>
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(200,169,110,0.18) 0%, rgba(200,169,110,0.07) 100%)',
        border: '1px solid rgba(200,169,110,0.25)',
        borderRadius: 20,
        padding: '16px 16px 16px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* iOS share glyph */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: '#C8A96E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M12 3l-4 4M12 3l4 4" stroke="#0C0C0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" stroke="#0C0C0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>
          <p style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 17, color: '#F0EDE8', lineHeight: 1.2, marginBottom: 4,
          }}>
            Add Lift to your Home Screen
          </p>
          <p style={{
            fontSize: 12.5, color: '#8A8680', lineHeight: 1.5,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Tap <span style={{ color: '#C8A96E', fontWeight: 600 }}>Share</span>, then
            {' '}<span style={{ color: '#C8A96E', fontWeight: 600 }}>Add to Home Screen</span> — for rest
            reminders and a full-screen, app-like experience.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: 'none',
            color: '#8A8680', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
