import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { z } from '../lib/theme'

// How often to actively check the server for a newer build (in addition to the
// browser's own checks on load/navigation).
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

/**
 * In-app update banner. With registerType 'prompt', a freshly deployed version
 * installs but waits; this surfaces a "Refresh" button so the user applies it on
 * their terms. updateServiceWorker(true) activates the waiting worker and reloads.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => { registration.update().catch(() => {}) }
      setInterval(check, CHECK_INTERVAL_MS)
      // Also check whenever the app returns to the foreground — the most common
      // moment a returning user would benefit from a fresh version.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  return createPortal(
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          key="update-prompt"
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          style={{
            position: 'fixed',
            top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
            left: 16, right: 16, margin: '0 auto', maxWidth: 398,
            zIndex: z.dialog,
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(22,22,22,0.96)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(200,169,110,0.3)',
            borderRadius: 16, padding: '12px 12px 12px 16px',
            boxShadow: '0 14px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(200,169,110,0.14)', border: '1px solid rgba(200,169,110,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 2v6h-6" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12a9 9 0 0115-6.7L21 8" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 22v-6h6" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12a9 9 0 01-15 6.7L3 16" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#F0EDE8', lineHeight: 1.2, fontFamily: '"Outfit", system-ui, sans-serif' }}>
              Update available
            </p>
            <p style={{ fontSize: 11.5, color: '#A8A49E', marginTop: 1, fontFamily: '"Outfit", system-ui, sans-serif' }}>
              A new version of Lift is ready.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => updateServiceWorker(true)}
            style={{
              flexShrink: 0, background: '#C8A96E', border: 'none', borderRadius: 11,
              padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#0C0C0C',
              cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Refresh
          </motion.button>

          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss"
            style={{
              flexShrink: 0, width: 44, height: 44, margin: '-9px -9px -9px 0', borderRadius: '50%',
              background: 'none', border: 'none', color: '#A8A49E',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
