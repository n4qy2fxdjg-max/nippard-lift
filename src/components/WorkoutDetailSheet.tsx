import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import type { WorkoutLog } from '../types'
import { getExerciseById } from '../data/exercises'
import { useAppStore } from '../store/useAppStore'
import Sheet from './Sheet'

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

  return (
    <Sheet open={!!log} onClose={onClose}>
      {log && (
        <div style={{ overflowY: 'auto', padding: '4px 24px 20px', flex: 1 }}>
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
              aria-label="Close"
              style={{
                width: 44, height: 44,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50%', color: '#A8A49E', cursor: 'pointer',
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
            fontSize: 13, color: '#A8A49E', marginBottom: 18,
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
                borderRadius: 16, padding: '12px 8px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 18, color: '#F0EDE8', lineHeight: 1.1,
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 11, color: '#A8A49E', marginTop: 4,
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
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.5px', color: '#A8A49E', marginBottom: 14,
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
                          fontSize: 11, color: '#C8A96E', fontWeight: 700,
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
                        borderRadius: 12, padding: '5px 9px',
                      }}>
                        {fmtWeight(set.weight)} × {set.reps}
                        {set.rpe != null && (
                          <span style={{ color: '#A8A49E', marginLeft: 5 }}>
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
      )}
    </Sheet>
  )
}
