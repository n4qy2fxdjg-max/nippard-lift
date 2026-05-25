import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useWorkoutStore } from '../store/useWorkoutStore'
import HeatmapGrid from '../components/HeatmapGrid'
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function Progress() {
  const logs = useWorkoutStore((s) => s.logs)
  const deleteLog = useWorkoutStore((s) => s.deleteLog)
  const [params] = useSearchParams()
  const isNew = params.get('new') === '1'

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      <div className="scroll-y" style={{ flex: 1, paddingBottom: 90 }}>
        {/* Header */}
        <div style={{ padding: 'max(54px, env(safe-area-inset-top)) 24px 20px' }}>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#F0EDE8' }}>Progress</h1>
        </div>

        {/* New workout banner */}
        <AnimatePresence>
          {isNew && logs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ margin: '0 24px 16px', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: 12, padding: '12px 16px' }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>
                ✓ Workout saved — great session!
              </p>
              {logs[0].personalRecords.length > 0 && (
                <p style={{ fontSize: 12, color: '#8A8680', marginTop: 4 }}>
                  {logs[0].personalRecords.length} personal record{logs[0].personalRecords.length > 1 ? 's' : ''} 🏆
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekly stats */}
        <div style={{ padding: '0 24px 24px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 12 }}>This Week</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Sessions', value: weeklyStats.sessions, unit: '' },
              { label: 'Volume', value: `${(weeklyStats.volume / 1000).toFixed(1)}`, unit: 't' },
              { label: 'Avg Time', value: weeklyStats.avgDuration > 0 ? formatDuration(weeklyStats.avgDuration) : '—', unit: '' },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 12px' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#F0EDE8' }}>
                  {value}<span style={{ fontSize: 12, color: '#8A8680' }}>{unit}</span>
                </p>
                <p style={{ fontSize: 11, color: '#8A8680', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ padding: '0 24px 28px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 12 }}>Activity</p>
          <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 12px' }}>
            <HeatmapGrid logDates={logDates} />
          </div>
        </div>

        {/* History */}
        <div style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 12 }}>
            History — {logs.length} workout{logs.length !== 1 ? 's' : ''}
          </p>

          {logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#8A8680' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
              <p style={{ fontSize: 14, color: '#F0EDE8', marginBottom: 6 }}>No workouts yet</p>
              <p style={{ fontSize: 13 }}>Complete a workout to see your history</p>
            </div>
          )}

          <AnimatePresence>
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={i === 0 && isNew ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                style={{ marginBottom: 10 }}
              >
                <div style={{
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>{log.planName}</p>
                    <p style={{ fontSize: 12, color: '#8A8680', marginTop: 4 }}>
                      {format(parseISO(log.date), 'EEE, MMM d')}
                      {' · '}{formatDuration(log.durationSec)}
                      {' · '}{log.totalVolume.toLocaleString()} kg
                    </p>
                    {log.personalRecords.length > 0 && (
                      <p style={{ fontSize: 11, color: '#C8A96E', marginTop: 6 }}>
                        🏆 {log.personalRecords.length} PR{log.personalRecords.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', padding: 4, fontSize: 16, flexShrink: 0 }}
                  >🗑</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
