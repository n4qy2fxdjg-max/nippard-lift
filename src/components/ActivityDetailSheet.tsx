import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import Sheet from './Sheet'
import { useAppStore } from '../store/useAppStore'
import { useActivityStore } from '../store/useActivityStore'
import { useToastStore } from '../store/useToastStore'
import { activityEmoji } from '../data/activities'
import { fmtActivityDuration, fmtActivityDistance, fmtActivityPace } from '../lib/activityFormat'
import type { ActivityLog } from '../types'

interface Props {
  activity: ActivityLog | null
  onClose: () => void
}

export default function ActivityDetailSheet({ activity, onClose }: Props) {
  const unit = useAppStore((s) => s.unit)
  const deleteActivity = useActivityStore((s) => s.deleteActivity)
  const restoreActivity = useActivityStore((s) => s.restoreActivity)
  const showToast = useToastStore((s) => s.show)

  function handleDelete() {
    if (!activity) return
    const snapshot = activity
    deleteActivity(activity.id)
    onClose()
    showToast({
      message: `${snapshot.name} deleted`,
      actionLabel: 'Undo',
      onAction: () => restoreActivity(snapshot),
    })
  }

  const stats: { label: string; value: string }[] = []
  if (activity) {
    stats.push({ label: 'duration', value: fmtActivityDuration(activity.durationSec) })
    if (activity.distanceKm && activity.distanceKm > 0) {
      stats.push({ label: 'distance', value: fmtActivityDistance(activity.distanceKm, unit) })
      const pace = fmtActivityPace(activity.durationSec, activity.distanceKm, unit)
      if (pace) stats.push({ label: 'pace', value: pace })
    }
    if (activity.calories) stats.push({ label: 'calories', value: `${activity.calories}` })
    if (activity.intensity) stats.push({ label: 'intensity', value: activity.intensity })
  }

  return (
    <Sheet open={!!activity} onClose={onClose}>
      {activity && (
        <div style={{ overflowY: 'auto', padding: '4px 24px 20px', flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>{activityEmoji(activity.type)}</span>
              <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 26, color: '#F0EDE8', lineHeight: 1.1 }}>
                {activity.name}
              </h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              style={{
                width: 32, height: 32, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%',
                color: '#8A8680', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </motion.button>
          </div>
          <p style={{ fontSize: 13, color: '#8A8680', marginBottom: 20, fontFamily: '"Outfit", system-ui, sans-serif' }}>
            {format(parseISO(activity.date), 'EEEE, MMM d, yyyy')}
          </p>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: activity.note ? 20 : 24 }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                background: '#161616', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '14px 16px',
              }}>
                <div style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 22, color: '#F0EDE8', lineHeight: 1.1, textTransform: 'capitalize' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: '#8A8680', marginTop: 5, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {activity.note && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8A8680', marginBottom: 8, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Note
              </p>
              <p style={{ fontSize: 14, color: '#D4CFCA', lineHeight: 1.55, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                {activity.note}
              </p>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDelete}
            style={{
              width: '100%', height: 48, background: 'transparent',
              border: '1px solid rgba(255,69,58,0.25)', borderRadius: 16,
              color: '#FF453A', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: '"Outfit", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent',
            }}
          >
            Delete session
          </motion.button>
        </div>
      )}
    </Sheet>
  )
}
