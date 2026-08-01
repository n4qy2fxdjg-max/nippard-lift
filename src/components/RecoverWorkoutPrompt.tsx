import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import { useWorkoutStore, lastActivityAt, countCompletedSets } from '../store/useWorkoutStore'
import { useToastStore } from '../store/useToastStore'
import { z } from '../lib/theme'

function whenLabel(ts: number): string {
  const d = new Date(ts)
  const time = format(d, 'h:mm a')
  if (isToday(d)) return `today at ${time}`
  if (isYesterday(d)) return `yesterday at ${time}`
  return `${format(d, 'EEEE d MMM')} at ${time}`
}

/**
 * Offers back a workout that went stale before it was saved — the app used to
 * delete these on startup and only say so afterwards. Shown once per launch,
 * oldest first; "Not now" keeps the session parked rather than dropping it.
 */
export default function RecoverWorkoutPrompt() {
  const recoverable = useWorkoutStore((s) => s.recoverableSessions)
  const saveRecoverableSession = useWorkoutStore((s) => s.saveRecoverableSession)
  const discardRecoverableSession = useWorkoutStore((s) => s.discardRecoverableSession)
  const activeSession = useWorkoutStore((s) => s.activeSession)
  const showToast = useToastStore((s) => s.show)
  // "Not now" defers to the next launch — the session stays saved, this just
  // stops the dialog nagging for the rest of this one.
  const [deferred, setDeferred] = useState<string[]>([])

  const session = recoverable.find((s) => !deferred.includes(s.id)) ?? null

  // Never interrupt a workout in progress — the prompt waits for the next launch.
  const open = session !== null && activeSession === null

  const setCount = session ? countCompletedSets(session) : 0
  const exerciseCount = session
    ? session.exercises.filter((e) => e.sets.some((s) => s.completed)).length
    : 0

  const handleSave = () => {
    if (!session) return
    saveRecoverableSession(session.id)
    showToast({ message: 'Workout saved to your history' })
  }

  const handleDiscard = () => {
    if (!session) return
    const discarded = session
    discardRecoverableSession(discarded.id)
    showToast({
      message: 'Workout discarded',
      actionLabel: 'Undo',
      onAction: () => useWorkoutStore.setState((s) => ({
        recoverableSessions: [discarded, ...s.recoverableSessions],
      })),
    })
  }

  return createPortal(
    <AnimatePresence>
      {open && session && (
        <motion.div
          key="recover-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: z.dialog, padding: 24,
          }}
        >
          <motion.div
            key="recover"
            initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: 'rgba(22,22,22,0.98)', backdropFilter: 'blur(40px)',
              borderRadius: 24, padding: 28, width: '100%', maxWidth: 320,
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 24, color: '#F0EDE8', marginBottom: 8 }}>
              Unfinished workout
            </h3>
            <p style={{ fontSize: 14, color: '#A8A49E', marginBottom: 24, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.5 }}>
              {session.planName} — {whenLabel(lastActivityAt(session))}. You logged{' '}
              {setCount} set{setCount !== 1 ? 's' : ''} across {exerciseCount}{' '}
              exercise{exerciseCount !== 1 ? 's' : ''} but never saved the session.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                style={{ height: 48, background: '#C8A96E', border: 'none', borderRadius: 16, color: '#0C0C0C', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Save to History
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleDiscard}
                style={{ height: 48, background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 16, color: '#FF453A', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Discard
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDeferred((d) => [...d, session.id])}
                style={{ height: 48, background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, color: '#F0EDE8', fontSize: 14, cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Not now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
