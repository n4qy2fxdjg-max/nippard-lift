import { useMemo } from 'react'
import { useWorkoutStore } from '../store/useWorkoutStore'
import {
  MUSCLE_TARGETS,
  trailingWeekSets,
  volumeStatus,
  STATUS_COLOR,
} from '../lib/muscleVolume'

export default function MuscleVolumeTracker() {
  const logs = useWorkoutStore((s) => s.logs)
  const counts = useMemo(() => trailingWeekSets(logs), [logs])
  const totalSets = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts]
  )

  // Nothing trained in the trailing week → an all-zero chart is just noise
  // (and on a tall screen it buries the actionable content). Hide it until
  // there's something to show.
  if (totalSets === 0) return null

  const onTrack = MUSCLE_TARGETS.filter((t) => {
    const s = counts[t.key] ?? 0
    return s >= t.min
  }).length

  return (
    <div style={{ padding: '0 24px', marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.5px', color: '#8A8680',
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Weekly Volume
          </p>
          <em style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(138,134,128,0.5)' }}>
            last 7 days
          </em>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(138,134,128,0.6)', fontFamily: '"Outfit", system-ui, sans-serif' }}>
          {onTrack}/{MUSCLE_TARGETS.length} at target
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#161616',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{ height: 4, background: '#C8A96E', width: '100%' }} />
        <div style={{ padding: '6px 18px 10px' }}>
          {MUSCLE_TARGETS.map((t, i) => {
            const sets = counts[t.key] ?? 0
            const status = volumeStatus(sets, t)
            const color = STATUS_COLOR[status]
            const pct = Math.min(100, (sets / t.max) * 100)
            const minPct = Math.min(100, (t.min / t.max) * 100)
            return (
              <div
                key={t.key}
                style={{
                  padding: '10px 0',
                  borderBottom: i < MUSCLE_TARGETS.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none',
                }}
              >
                {/* Label + count */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: '#F0EDE8',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}>
                    {t.label}
                  </span>
                  <span style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: '-0.3px' }}>
                      {sets}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8680' }}>
                      {' '}/ {t.min}–{t.max}
                    </span>
                  </span>
                </div>

                {/* Track */}
                <div style={{
                  position: 'relative',
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  {/* Fill */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }} />
                  {/* MEV (minimum) threshold tick */}
                  <div style={{
                    position: 'absolute',
                    left: `${minPct}%`,
                    top: -1, bottom: -1,
                    width: 2,
                    background: 'rgba(12,12,12,0.55)',
                    transform: 'translateX(-1px)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center',
          padding: '10px 18px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {([
            ['under', 'Under'],
            ['on', 'On target'],
            ['over', 'Over'],
          ] as const).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[key] }} />
              <span style={{ fontSize: 10, color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif', letterSpacing: '0.2px' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
