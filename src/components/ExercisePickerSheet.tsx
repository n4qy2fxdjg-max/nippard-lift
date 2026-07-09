import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Sheet from './Sheet'
import { getExercisesByGroup } from '../data/exercises'
import { muscleLabel, muscleColor } from '../lib/muscleLabels'
import type { BodyGroup } from '../types'

const groupTabs: { key: 'all' | BodyGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'core', label: 'Core' },
]

const MUSCLE_CATEGORIES: { label: string; muscles: string[] }[] = [
  { label: 'Chest',      muscles: ['chest', 'upper-chest'] },
  { label: 'Back',       muscles: ['lats', 'mid-back', 'rear-delts', 'traps', 'lower-back'] },
  { label: 'Shoulders',  muscles: ['shoulders', 'side-delts', 'front-delts'] },
  { label: 'Biceps',     muscles: ['biceps'] },
  { label: 'Triceps',    muscles: ['triceps'] },
  { label: 'Forearms',   muscles: ['forearms'] },
  { label: 'Glutes',     muscles: ['glutes'] },
  { label: 'Hamstrings', muscles: ['hamstrings'] },
  { label: 'Quads',      muscles: ['quads'] },
  { label: 'Calves',     muscles: ['calves'] },
  { label: 'Abs',        muscles: ['abs'] },
  { label: 'Obliques',   muscles: ['obliques'] },
  { label: 'Adductors',  muscles: ['adductors'] },
]

interface Props {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  title?: string
  /** Grey out (but still list) these exercise ids, e.g. ones already in the session. */
  disabledIds?: Set<string>
  /** Stacking override — pass when opening above a full-screen route. */
  zIndex?: number
}

/**
 * Generic exercise picker bottom sheet: body-group tabs → muscle chips →
 * exercise list. Same browsing structure as the ProgramDetailSheet swap
 * picker, reusable anywhere an exercise needs choosing.
 */
export default function ExercisePickerSheet({ open, onClose, onPick, title = 'Add exercise', disabledIds, zIndex }: Props) {
  const [group, setGroup] = useState<'all' | BodyGroup>('all')
  const [muscle, setMuscle] = useState<string | null>(null)

  const presentMuscles = useMemo(
    () => new Set<string>(getExercisesByGroup(group).map((e) => e.primaryMuscle)),
    [group]
  )
  const visibleCategories = useMemo(
    () => MUSCLE_CATEGORIES.filter((c) => c.muscles.some((m) => presentMuscles.has(m))),
    [presentMuscles]
  )
  const filtered = useMemo(() => {
    let list = getExercisesByGroup(group)
    if (muscle) {
      const cat = MUSCLE_CATEGORIES.find((c) => c.label === muscle)
      if (cat) list = list.filter((e) => cat.muscles.includes(e.primaryMuscle))
    }
    return list
  }, [group, muscle])

  return (
    <Sheet open={open} onClose={onClose} zIndex={zIndex}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, padding: '0 20px 16px' }}>
        <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 22, color: '#F0EDE8', lineHeight: 1, marginBottom: 14, flexShrink: 0 }}>
          {title}
        </h3>

        {/* Body group tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
          {groupTabs.map(({ key, label }) => (
            <button key={key} onClick={() => { setGroup(key); setMuscle(null) }}
              style={{
                flex: 1,
                background: group === key ? '#F0EDE8' : '#1E1E1E',
                color: group === key ? '#0C0C0C' : '#A8A49E',
                border: group === key ? 'none' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '12px 0',
                fontSize: 12, fontWeight: group === key ? 700 : 400,
                cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Muscle chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: 6, flexShrink: 0, paddingBottom: 10, marginBottom: 4 }}>
          <button onClick={() => setMuscle(null)} style={chipStyle(muscle === null)}>All</button>
          {visibleCategories.map(({ label }) => (
            <button key={label} onClick={() => setMuscle(muscle === label ? null : label)} style={chipStyle(muscle === label)}>
              {label}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
          {filtered.map((ex) => {
            const disabled = disabledIds?.has(ex.id) ?? false
            const mColor = muscleColor[ex.primaryMuscle] ?? '#A8A49E'
            return (
              <motion.button
                key={ex.id}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                onClick={() => !disabled && onPick(ex.id)}
                style={{
                  background: disabled ? '#181818' : '#1E1E1E',
                  borderRadius: 16, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  border: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0, textAlign: 'left', width: '100%',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#F0EDE8', fontFamily: '"Outfit", system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#A8A49E', marginTop: 2, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                    {ex.defaultSets} sets · {ex.defaultReps} reps
                  </p>
                </div>
                <span style={{
                  background: disabled ? 'rgba(168,164,158,0.12)' : mColor + '18',
                  color: disabled ? '#A8A49E' : mColor,
                  border: disabled ? '1px solid rgba(168,164,158,0.2)' : `1px solid ${mColor}35`,
                  borderRadius: 12, padding: '3px 9px',
                  fontSize: 11, fontWeight: 500,
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {disabled ? 'In workout' : (muscleLabel[ex.primaryMuscle] ?? ex.primaryMuscle)}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    background: active ? '#F0EDE8' : '#1E1E1E',
    color: active ? '#0C0C0C' : '#A8A49E',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '11px 14px',
    fontSize: 12, fontWeight: active ? 700 : 400,
    cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
    WebkitTapHighlightColor: 'transparent',
  }
}
