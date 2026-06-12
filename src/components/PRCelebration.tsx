import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface Props {
  show: boolean
  /** The record-breaking set, e.g. "112 lb × 6". */
  headline: string
  onDone: () => void
}

const COLORS = ['#C8A96E', '#F0EDE8', '#34C759', '#E8C987']

/**
 * Full-screen celebration that fires the moment a set beats the prior best for
 * the current exercise. Gold particle burst + a medal + the record set. Taps to
 * dismiss, auto-dismisses, and collapses to a quiet fade under reduced motion.
 */
export default function PRCelebration({ show, headline, onDone }: Props) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!show) return
    const t = setTimeout(onDone, reduce ? 1500 : 2400)
    return () => clearTimeout(t)
  }, [show, onDone, reduce])

  const particles = useMemo(
    () => Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2 + (i % 2 ? 0.25 : 0)
      const dist = 80 + (i % 4) * 32
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        color: COLORS[i % COLORS.length],
        size: 6 + (i % 3) * 3,
        square: i % 3 === 0,
        delay: (i % 5) * 0.03,
      }
    }),
    []
  )

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pr-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDone}
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 44%, rgba(58,46,20,0.92) 0%, rgba(8,8,8,0.97) 56%)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer',
          }}
        >
          {/* Particle burst */}
          {!reduce && particles.map((p, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 44], opacity: [0, 1, 0], scale: [0, 1, 0.55] }}
              transition={{ duration: 1.5, delay: 0.12 + p.delay, ease: [0.2, 0.6, 0.3, 1] }}
              style={{
                position: 'absolute', top: '42%', left: '50%',
                width: p.size, height: p.size,
                borderRadius: p.square ? 2 : '50%',
                background: p.color,
              }}
            />
          ))}

          {/* Center content */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', padding: '0 32px',
            }}
          >
            {/* Glowing medal */}
            <motion.div
              initial={reduce ? false : { rotate: -12 }}
              animate={reduce ? {} : { rotate: [-12, 8, 0] }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{
                width: 74, height: 74, borderRadius: '50%', marginBottom: 18,
                background: 'radial-gradient(circle at 50% 32%, #EBCF95, #C8A96E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 44px rgba(200,169,110,0.6), inset 0 2px 5px rgba(255,255,255,0.45)',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#0C0C0C" />
              </svg>
            </motion.div>

            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
              color: '#C8A96E', marginBottom: 8, fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              New PR
            </p>
            <h2 style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: 42, color: '#F0EDE8', lineHeight: 1.05, marginBottom: 8,
              letterSpacing: '-0.5px',
            }}>
              {headline}
            </h2>
            <p style={{
              fontSize: 13, color: '#A8A49E', fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              A new personal best — keep it up.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
