import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useToastStore } from '../store/useToastStore'
import { z } from '../lib/theme'

export default function Toaster() {
  const { message, actionLabel, visible, runAction } = useToastStore()

  return createPortal(
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 78px)',
            left: 16, right: 16,
            margin: '0 auto', maxWidth: 398,
            zIndex: z.toast,
            background: 'rgba(30,30,30,0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            padding: '14px 12px 14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <span style={{
            fontSize: 14, color: '#F0EDE8',
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            {message}
          </span>
          {actionLabel && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={runAction}
              style={{
                background: 'rgba(200,169,110,0.12)',
                border: '1px solid rgba(200,169,110,0.25)',
                borderRadius: 12,
                cursor: 'pointer',
                color: '#C8A96E', fontSize: 14, fontWeight: 700,
                fontFamily: '"Outfit", system-ui, sans-serif',
                padding: '7px 14px', flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {actionLabel}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
