import { Reorder, useDragControls, motion } from 'framer-motion'
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
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '14px 14px 14px 16px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
        touchAction: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {/* Drag handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{ cursor: 'grab', color: '#A8A49E', flexShrink: 0, padding: '14px 6px', margin: '-14px -6px -14px -6px', touchAction: 'none' }}
        >
          <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor">
            <circle cx="4" cy="3.5" r="1.5" opacity="0.6" />
            <circle cx="10" cy="3.5" r="1.5" opacity="0.6" />
            <circle cx="4" cy="9" r="1.5" opacity="0.6" />
            <circle cx="10" cy="9" r="1.5" opacity="0.6" />
            <circle cx="4" cy="14.5" r="1.5" opacity="0.6" />
            <circle cx="10" cy="14.5" r="1.5" opacity="0.6" />
          </svg>
        </div>

        {/* Exercise info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#F0EDE8',
            lineHeight: 1.2,
            fontFamily: '"Outfit", system-ui, sans-serif',
            marginBottom: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {exercise?.name ?? item.exerciseId}
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Sets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MicroBtn label="Decrease sets" onClick={() => onUpdate(item.uid, { sets: Math.max(1, item.sets - 1) })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5h6" stroke="#F0EDE8" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
              <span style={{ fontSize: 12, color: '#F0EDE8', minWidth: 26, textAlign: 'center', fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600 }}>
                {item.sets}s
              </span>
              <MicroBtn label="Increase sets" onClick={() => onUpdate(item.uid, { sets: item.sets + 1 })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" stroke="#F0EDE8" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
            </div>
            <span style={{ color: 'rgba(168,164,158,0.6)', fontSize: 12 }}>×</span>
            {/* Reps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MicroBtn label="Decrease reps" onClick={() => onUpdate(item.uid, { reps: Math.max(1, item.reps - 1) })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5h6" stroke="#F0EDE8" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
              <span style={{ fontSize: 12, color: '#F0EDE8', minWidth: 26, textAlign: 'center', fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600 }}>
                {item.reps}r
              </span>
              <MicroBtn label="Increase reps" onClick={() => onUpdate(item.uid, { reps: item.reps + 1 })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" stroke="#F0EDE8" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
            </div>
            {/* Weight */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MicroBtn label="Decrease weight" onClick={() => onUpdate(item.uid, { weightKg: Math.max(0, parseFloat((item.weightKg - 0.25).toFixed(2))) })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5h6" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
              <span style={{ fontSize: 12, color: '#C8A96E', minWidth: 44, fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600 }}>
                {item.weightKg % 1 === 0 ? item.weightKg.toFixed(0) : item.weightKg.toFixed(2)}kg
              </span>
              <MicroBtn label="Increase weight" onClick={() => onUpdate(item.uid, { weightKg: parseFloat((item.weightKg + 0.25).toFixed(2)) })}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </MicroBtn>
            </div>
          </div>
        </div>

        {/* Remove */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onRemove(item.uid)}
          aria-label="Remove exercise"
          style={{
            background: 'none', border: 'none',
            color: '#A8A49E', cursor: 'pointer',
            width: 44, height: 44, flexShrink: 0, padding: 0,
            margin: '-8px -10px -8px -8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>
    </Reorder.Item>
  )
}

/**
 * Compact stepper: 28px visual square inside a 44pt hit area (negative margins
 * keep the layout footprint at 28px so the three stepper groups still fit on
 * one row).
 */
function MicroBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 44, height: 44,
        margin: '-8px',
        padding: 0,
        background: 'none', border: 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        width: 28, height: 28,
        background: '#1E1E1E',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </span>
    </button>
  )
}
