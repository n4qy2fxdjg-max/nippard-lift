import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import type { WorkoutLog } from '../types'
import { getExerciseById } from '../data/exercises'
import { useAppStore } from '../store/useAppStore'

const KG_TO_LB = 2.20462

interface Props {
  log: WorkoutLog | null
  onClose: () => void
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function WorkoutDetailSheet({ log, onClose }: Props) {
  const unit = useAppStore((s) => s.unit)

  const fmtWeight = (kg: number) =>
    unit === 'lb' ? `${Math.round(kg * KG_TO_LB)} lb` : `${kg} kg`

  const fmtVolume = (kg: number) => {
    const v = unit === 'lb' ? kg * KG_TO_LB : kg
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k ${unit}` : `${Math.round(v)} ${unit}`
  }

  const totalSets = log
    ? log.exerciseResults.reduce((sum, e) => sum + e.sets.filter((s) => s.completed).length, 0)
    : 0

  const content = (
    <AnimatePresence>
      {log && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)',
              left: 0, right: 0,
              margin: '0 auto', maxWidth: 430,
              background: 'rgba(18,18,18,0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '22px 22px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -20px 60px rgba(0,0,0,0.4)',
              zIndex: 101,
              maxHeight: 'calc(100svh - env(safe-area-inset-bottom, 0px) - 50px - 60px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2 }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 24px', paddingBottom: '20px', flex: 1 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <h2 style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 26, color: '#F0EDE8', lineHeight: 1.15, flex: 1,
                }}>
                  {log.planName}
                </h2>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onClose}
                  style={{
                    width: 32, height: 32,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%', color: '#8A8680', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>
              <p style={{
                fontSize: 13, color: '#8A8680', marginBottom: 18,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {format(parseISO(log.date), 'EEEE, MMM d, yyyy')}
              </p>

              {/* Stat row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'duration', value: formatDuration(log.durationSec) },
                  { label: 'volume', value: fmtVolume(log.totalVolume) },
                  { label: 'sets', value: String(totalSets) },
                ].map((s) => (
                  <div key={s.label} style={{
                    flex: 1, background: '#161616',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '12px 8px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      fontSize: 18, color: '#F0EDE8', lineHeight: 1.1,
                    }}>
                      {s.value}
                    </div>
                    <div style={{
                      fontSize: 10, color: '#8A8680', marginTop: 4,
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '1px',
                    }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Exercises */}
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.5px', color: '#8A8680', marginBottom: 14,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                Exercises
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {log.exerciseResults.map((ex, ei) => {
                  const sets = ex.sets.filter((s) => s.completed)
                  if (sets.length === 0) return null
                  const isPR = log.personalRecords.includes(ex.exerciseId)
                  const exercise = getExerciseById(ex.exerciseId)
                  return (
                    <div key={ei}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: '#F0EDE8',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                        }}>
                          {exercise?.name ?? ex.exerciseId}
                        </p>
                        {isPR && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" fill="#C8A96E" />
                            </svg>
                            <span style={{
                              fontSize: 10, color: '#C8A96E', fontWeight: 700,
                              fontFamily: '"Outfit", system-ui, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              PR
                            </span>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {sets.map((set, si) => (
                          <span key={si} style={{
                            fontSize: 12, color: '#F0EDE8',
                            fontFamily: '"Outfit", system-ui, sans-serif',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8, padding: '5px 9px',
                          }}>
                            {fmtWeight(set.weight)} × {set.reps}
                            {set.rpe != null && (
                              <span style={{ color: '#8A8680', marginLeft: 5 }}>
                                @{set.rpe}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
