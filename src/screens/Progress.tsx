import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { useAppStore } from '../store/useAppStore'
import { exercises as exerciseList } from '../data/exercises'
import HeatmapGrid from '../components/HeatmapGrid'
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function exerciseName(id: string): string {
  return exerciseList.find((e) => e.id === id)?.name ?? id
}

const listVariants = {
  visible: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

export default function Progress() {
  const logs = useWorkoutStore((s) => s.logs)
  const deleteLog = useWorkoutStore((s) => s.deleteLog)
  const unit = useAppStore((s) => s.unit)
  const [params] = useSearchParams()
  const isNew = params.get('new') === '1'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const logDates = useMemo(() => logs.map((l) => l.date), [logs])

  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const thisWeekLogs = logs.filter((l) =>
      isWithinInterval(parseISO(l.date), { start: weekStart, end: now })
    )
    const sessions = thisWeekLogs.length
    const volume = thisWeekLogs.reduce((sum, l) => sum + l.totalVolume, 0)
    const avgDuration = sessions > 0
      ? Math.round(thisWeekLogs.reduce((sum, l) => sum + l.durationSec, 0) / sessions)
      : 0
    return { sessions, volume, avgDuration }
  }, [logs])

  function formatVolume(kg: number): string {
    if (unit === 'lb') {
      const lb = kg * 2.20462
      return lb >= 1000
        ? `${(lb / 1000).toFixed(1)}k lb`
        : `${Math.round(lb).toLocaleString()} lb`
    }
    return kg >= 1000
      ? `${(kg / 1000).toFixed(1)}t`
      : `${Math.round(kg).toLocaleString()} kg`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      <div className="scroll-y" style={{ flex: 1, paddingBottom: 90 }}>

        {/* Header */}
        <div style={{ padding: 'max(44px, env(safe-area-inset-top)) 24px 20px' }}>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 30, color: '#F0EDE8', lineHeight: 1.1,
          }}>
            Your<br />
            <em style={{ fontStyle: 'italic', color: '#C8A96E' }}>progress</em>
          </h1>
        </div>

        {/* New workout banner */}
        <AnimatePresence>
          {isNew && logs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                margin: '0 24px 20px',
                background: 'rgba(52,199,89,0.07)',
                border: '1px solid rgba(52,199,89,0.2)',
                borderRadius: 14, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: '#34C759',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                }}>
                  Workout saved
                </p>
                {logs[0].personalRecords.length > 0 && (
                  <p style={{
                    fontSize: 12, color: '#8A8680', marginTop: 2,
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}>
                    {logs[0].personalRecords.length} personal record{logs[0].personalRecords.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekly stats */}
        <div style={{ padding: '0 24px 32px' }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.5px', color: '#8A8680', marginBottom: 14,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            This Week
          </p>
          <div style={{
            background: '#161616',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div style={{ height: 4, background: '#C8A96E', width: '100%' }} />
            <div style={{ padding: '20px 20px 20px', display: 'flex', alignItems: 'stretch' }}>
              {/* Sessions */}
              <div style={{ flex: 2, paddingRight: 20 }}>
                <p style={{
                  fontSize: 60, color: '#F0EDE8', lineHeight: 1,
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  letterSpacing: '-2px',
                }}>
                  {weeklyStats.sessions}
                </p>
                <em style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 13, color: '#8A8680', marginTop: 6, display: 'block',
                }}>
                  sessions
                </em>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
              {/* Volume + Avg */}
              <div style={{ flex: 2, paddingLeft: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                <div>
                  <p style={{
                    fontSize: 26, color: '#F0EDE8', lineHeight: 1,
                    fontFamily: '"DM Serif Display", Georgia, serif',
                  }}>
                    {weeklyStats.volume > 0 ? formatVolume(weeklyStats.volume) : '—'}
                  </p>
                  <em style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 12, color: '#8A8680', marginTop: 4, display: 'block',
                  }}>
                    volume
                  </em>
                </div>
                <div>
                  <p style={{
                    fontSize: 26, color: '#F0EDE8', lineHeight: 1,
                    fontFamily: '"DM Serif Display", Georgia, serif',
                  }}>
                    {weeklyStats.avgDuration > 0 ? formatDuration(weeklyStats.avgDuration) : '—'}
                  </p>
                  <em style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 12, color: '#8A8680', marginTop: 4, display: 'block',
                  }}>
                    avg session
                  </em>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ padding: '0 24px 32px' }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.5px', color: '#8A8680', marginBottom: 14,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Activity
          </p>
          <div style={{
            background: '#161616',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '16px 14px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <HeatmapGrid logDates={logDates} />
          </div>
        </div>

        {/* History */}
        <div style={{ padding: '0 24px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 14,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1.5px', color: '#8A8680',
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              History
            </p>
            <p style={{
              fontSize: 11, color: 'rgba(138,134,128,0.6)',
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              {logs.length} workout{logs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {logs.length === 0 && (
            <div style={{ padding: '40px 0 32px', textAlign: 'center' }}>
              <svg width="40" height="32" viewBox="0 0 40 32" fill="none" style={{ marginBottom: 16, opacity: 0.2 }}>
                <rect x="0" y="20" width="6" height="12" rx="2" fill="#8A8680" />
                <rect x="9" y="12" width="6" height="20" rx="2" fill="#8A8680" />
                <rect x="18" y="6" width="6" height="26" rx="2" fill="#8A8680" />
                <rect x="27" y="14" width="6" height="18" rx="2" fill="#8A8680" />
                <rect x="34" y="2" width="6" height="30" rx="2" fill="#8A8680" />
              </svg>
              <p style={{
                fontSize: 15, fontWeight: 600, color: '#F0EDE8', marginBottom: 6,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                No workouts yet
              </p>
              <p style={{
                fontSize: 13, color: '#8A8680',
                fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6,
              }}>
                Complete a workout to see your history here
              </p>
            </div>
          )}

          <AnimatePresence>
            <motion.div initial="hidden" animate="visible" variants={listVariants}>
              {logs.map((log, i) => {
                const isExpanded = expandedId === log.id
                return (
                  <motion.div
                    key={log.id}
                    variants={i === 0 && isNew ? itemVariants : undefined}
                    exit={{ opacity: 0, x: -48, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ marginBottom: 10 }}
                  >
                    <motion.div
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      style={{
                        background: '#161616',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        position: 'relative', overflow: 'hidden',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Gold accent bar */}
                      <div style={{
                        position: 'absolute', left: 0, top: 14, bottom: isExpanded ? undefined : 14,
                        height: isExpanded ? 44 : undefined,
                        width: 3, background: '#C8A96E',
                        borderRadius: '0 2px 2px 0', opacity: 0.5,
                      }} />

                      {/* Header row */}
                      <div style={{
                        padding: '16px 16px',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                          <p style={{
                            fontSize: 15, fontWeight: 600, color: '#F0EDE8',
                            fontFamily: '"Outfit", system-ui, sans-serif',
                          }}>
                            {log.planName}
                          </p>
                          <p style={{
                            fontSize: 12, color: '#8A8680', marginTop: 4,
                            fontFamily: '"Outfit", system-ui, sans-serif',
                          }}>
                            {format(parseISO(log.date), 'EEE, MMM d')}
                            <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                            {formatDuration(log.durationSec)}
                            <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                            {formatVolume(log.totalVolume)}
                          </p>
                          {log.personalRecords.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"
                                  fill="#C8A96E"
                                />
                              </svg>
                              <p style={{
                                fontSize: 11, color: '#C8A96E', fontWeight: 600,
                                fontFamily: '"Outfit", system-ui, sans-serif',
                              }}>
                                {log.personalRecords.length} PR{log.personalRecords.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {/* Chevron */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M6 9l6 6 6-6" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </motion.div>

                          {/* Delete */}
                          <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={(e) => { e.stopPropagation(); deleteLog(log.id) }}
                            style={{
                              background: 'none', border: 'none',
                              color: 'rgba(138,134,128,0.6)', cursor: 'pointer',
                              padding: 4,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                stroke="currentColor" strokeWidth="1.75"
                                strokeLinecap="round" strokeLinejoin="round"
                              />
                            </svg>
                          </motion.button>
                        </div>
                      </div>

                      {/* Expanded exercises list */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="exercises"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                              padding: '12px 16px 14px 20px',
                            }}>
                              {log.exerciseResults.map((ex, ei) => {
                                const completedSets = ex.sets.filter((s) => s.completed)
                                if (completedSets.length === 0) return null
                                return (
                                  <div
                                    key={ei}
                                    style={{ marginBottom: ei < log.exerciseResults.length - 1 ? 10 : 0 }}
                                  >
                                    <p style={{
                                      fontSize: 12, fontWeight: 600, color: '#F0EDE8',
                                      fontFamily: '"Outfit", system-ui, sans-serif',
                                      marginBottom: 4,
                                    }}>
                                      {exerciseName(ex.exerciseId)}
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                                      {completedSets.map((set, si) => {
                                        const w = unit === 'lb'
                                          ? `${Math.round(set.weight * 2.20462)} lb`
                                          : `${set.weight} kg`
                                        return (
                                          <span
                                            key={si}
                                            style={{
                                              fontSize: 11, color: '#8A8680',
                                              fontFamily: '"Outfit", system-ui, sans-serif',
                                              background: 'rgba(255,255,255,0.04)',
                                              borderRadius: 6, padding: '2px 7px',
                                            }}
                                          >
                                            {w} × {set.reps}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
