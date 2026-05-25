import { Reorder, useDragControls } from 'framer-motion'
import type { BuilderItem as BuilderItemType } from '../types'
import { getExerciseById } from '../data/exercises'

interface Props {
  item: BuilderItemType
  onUpdate: (uid: string, changes: Partial<BuilderItemType>) => void
  onRemove: (uid: string) => void
}

export default function BuilderItem({ item, onUpdate, onRemove }: Props) {
  const exercise = getExerciseById(item.exerciseId)
  const dragControls = useDragControls()

  return (
    <Reorder.Item value={item} dragListener={false} dragControls={dragControls}>
      <div style={{
        background: '#161616',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
        touchAction: 'none',
      }}>
        {/* Drag handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{ cursor: 'grab', color: '#8A8680', flexShrink: 0, padding: '4px 2px' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
          </svg>
        </div>

        {/* Exercise info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', lineHeight: 1.2 }}>
            {exercise?.name ?? item.exerciseId}
          </p>
          {/* Sets × Reps */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => onUpdate(item.uid, { sets: Math.max(1, item.sets - 1) })} style={microBtnStyle}>−</button>
              <span style={{ fontSize: 13, color: '#F0EDE8', minWidth: 28, textAlign: 'center' }}>{item.sets}s</span>
              <button onClick={() => onUpdate(item.uid, { sets: item.sets + 1 })} style={microBtnStyle}>+</button>
            </div>
            <span style={{ color: '#8A8680', fontSize: 13 }}>×</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => onUpdate(item.uid, { reps: Math.max(1, item.reps - 1) })} style={microBtnStyle}>−</button>
              <span style={{ fontSize: 13, color: '#F0EDE8', minWidth: 28, textAlign: 'center' }}>{item.reps}r</span>
              <button onClick={() => onUpdate(item.uid, { reps: item.reps + 1 })} style={microBtnStyle}>+</button>
            </div>
          </div>
          {/* Weight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button onClick={() => onUpdate(item.uid, { weightKg: Math.max(0, parseFloat((item.weightKg - 0.25).toFixed(2))) })} style={microBtnStyle}>−</button>
            <span style={{ fontSize: 13, color: '#C8A96E', minWidth: 60 }}>
              {item.weightKg % 1 === 0 ? item.weightKg.toFixed(0) : item.weightKg.toFixed(2)} kg
            </span>
            <button onClick={() => onUpdate(item.uid, { weightKg: parseFloat((item.weightKg + 0.25).toFixed(2)) })} style={microBtnStyle}>+</button>
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={() => onRemove(item.uid)}
          style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', padding: 4, flexShrink: 0, fontSize: 18 }}
        >✕</button>
      </div>
    </Reorder.Item>
  )
}

const microBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  background: '#1E1E1E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 7,
  color: '#F0EDE8',
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
