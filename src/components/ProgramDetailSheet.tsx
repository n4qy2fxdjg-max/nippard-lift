import { useState, useMemo } from 'react'
import { motion, Reorder } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWorkoutStore, buildWarmupSets } from '../store/useWorkoutStore'
import { getExercisesByGroup, getExerciseById } from '../data/exercises'
import type { Program, ProgramExercise, BodyGroup, SessionExercise } from '../types'
import Sheet from './Sheet'

import { muscleLabel, muscleColor as muscleColors } from '../lib/muscleLabels'
const muscleLabels = muscleLabel
const groupTabs: { key: 'all' | BodyGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'core', label: 'Core' },
]

interface Props {
  program: Program | null
  onClose: () => void
}

type EditableItem = ProgramExercise & { uid: string }

export default function ProgramDetailSheet({ program, onClose }: Props) {
  const navigate = useNavigate()
  const startSession = useWorkoutStore((s) => s.startSession)

  const initialItems = useMemo<EditableItem[]>(() => {
    if (!program) return []
    return program.exercises.map((ex, i) => ({ ...ex, uid: `${ex.exerciseId}-${i}` }))
  }, [program?.id])

  const [items, setItems] = useState<EditableItem[]>(initialItems)
  const [substituteFor, setSubstituteFor] = useState<EditableItem | null>(null)
  const [pickerGroup, setPickerGroup] = useState<'all' | BodyGroup>('all')
  const [pickerMuscle, setPickerMuscle] = useState<string | null>(null)

  // Reset when program changes
  const [lastProgramId, setLastProgramId] = useState<string | undefined>(undefined)
  if (program?.id !== lastProgramId) {
    setLastProgramId(program?.id)
    if (program) {
      const fresh = program.exercises.map((ex, i) => ({ ...ex, uid: `${ex.exerciseId}-${i}` }))
      setItems(fresh)
      setSubstituteFor(null)
    }
  }

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

  const presentMuscles = useMemo(() =>
    new Set<string>(getExercisesByGroup(pickerGroup).map((e) => e.primaryMuscle)),
  [pickerGroup])

  const visibleCategories = useMemo(() =>
    MUSCLE_CATEGORIES.filter((c) => c.muscles.some((m) => presentMuscles.has(m))),
  [presentMuscles])

  const filteredExercises = useMemo(() => {
    let list = getExercisesByGroup(pickerGroup)
    if (pickerMuscle) {
      const cat = MUSCLE_CATEGORIES.find((c) => c.label === pickerMuscle)
      if (cat) list = list.filter((e) => cat.muscles.includes(e.primaryMuscle))
    }
    return list
  }, [pickerGroup, pickerMuscle])

  function handleSubstitute(item: EditableItem) {
    setSubstituteFor(item)
    // Default to same body group
    const ex = getExerciseById(item.exerciseId)
    if (ex) setPickerGroup(ex.bodyGroup)
    else setPickerGroup('all')
    setPickerMuscle(null)
  }

  function applySubstitute(newExId: string) {
    if (!substituteFor) return
    const ex = getExerciseById(newExId)
    if (!ex) return
    setItems((prev) => prev.map((i) =>
      i.uid === substituteFor.uid
        ? { ...i, exerciseId: newExId, reps: ex.defaultReps, sets: ex.defaultSets }
        : i
    ))
    setSubstituteFor(null)
  }

  function handleStart() {
    if (!program) return
    const sessionExercises: SessionExercise[] = items.map((item) => {
      const warmupSets = buildWarmupSets(item.weightKg, item.exerciseId)
      return {
        exerciseId: item.exerciseId,
        targetSets: item.sets,
        targetReps: item.reps,
        currentWeight: item.weightKg,
        sets: [],
        warmupSets: warmupSets.length > 0 ? warmupSets : undefined,
      }
    })
    startSession(program.id, program.name, sessionExercises)
    onClose()
    navigate('/active')
  }

  return (
    <>
      {/* Base sheet — programme detail */}
      <Sheet open={!!program} onClose={onClose} accent={program?.tagColor}>
        {program && (
          <>
            {/* Header */}
            <div style={{ padding: '0 24px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{
                    display: 'inline-block',
                    background: program.tagColor + '18',
                    border: `1px solid ${program.tagColor}38`,
                    borderRadius: 12, padding: '2px 8px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '1.2px',
                    color: program.tagColor, textTransform: 'uppercase',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    marginBottom: 8,
                  }}>
                    {program.tag}
                  </span>
                  <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 28, color: '#F0EDE8', lineHeight: 1.1 }}>
                    {program.name}
                  </h3>
                  <p style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 13, fontStyle: 'italic', color: '#A8A49E', marginTop: 4 }}>
                    {items.length} exercises · {program.estimatedMinutes}m · drag to reorder
                  </p>
                </div>
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
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </motion.button>
              </div>
            </div>

            {/* Scrollable exercise list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}>
              <Reorder.Group
                axis="y"
                values={items}
                onReorder={setItems}
                style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {items.map((item) => {
                  const ex = getExerciseById(item.exerciseId)
                  if (!ex) return null
                  const mColor = muscleColors[ex.primaryMuscle] ?? '#A8A49E'
                  const mLabel = muscleLabels[ex.primaryMuscle] ?? ex.primaryMuscle

                  return (
                    <Reorder.Item
                      key={item.uid}
                      value={item}
                      style={{
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 16,
                        padding: '12px 14px',
                        listStyle: 'none',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        touchAction: 'none',
                      }}
                    >
                      {/* Drag grip */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                        <circle cx="9" cy="7" r="1.5" fill="#F0EDE8" />
                        <circle cx="15" cy="7" r="1.5" fill="#F0EDE8" />
                        <circle cx="9" cy="12" r="1.5" fill="#F0EDE8" />
                        <circle cx="15" cy="12" r="1.5" fill="#F0EDE8" />
                        <circle cx="9" cy="17" r="1.5" fill="#F0EDE8" />
                        <circle cx="15" cy="17" r="1.5" fill="#F0EDE8" />
                      </svg>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', fontFamily: '"Outfit", system-ui, sans-serif', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: mColor + '18', border: `1px solid ${mColor}35`, borderRadius: 12, padding: '1px 6px', fontSize: 11, fontWeight: 500, color: mColor, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                            {mLabel}
                          </span>
                          <span style={{ fontSize: 11, color: '#A8A49E', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                            {item.sets} × {item.reps}
                          </span>
                        </div>
                      </div>

                      {/* Substitute button */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => { e.stopPropagation(); handleSubstitute(item) }}
                        aria-label="Swap exercise"
                        style={{
                          background: '#1E1E1E',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12, padding: '0 12px', minHeight: 44,
                          fontSize: 12, color: '#A8A49E',
                          cursor: 'pointer', flexShrink: 0,
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          display: 'flex', alignItems: 'center', gap: 4,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Swap
                      </motion.button>
                    </Reorder.Item>
                  )
                })}
              </Reorder.Group>
            </div>

            {/* Start button */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                style={{
                  width: '100%', height: 54,
                  background: '#C8A96E', border: 'none',
                  borderRadius: 16, color: '#0C0C0C',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Start Workout
              </motion.button>
            </div>
          </>
        )}
      </Sheet>

      {/* Substitute picker — stacked sheet */}
      <Sheet open={!!substituteFor} onClose={() => setSubstituteFor(null)} level={1}>
        {substituteFor && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, padding: '0 20px 16px' }}>
            <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 22, color: '#F0EDE8', lineHeight: 1, marginBottom: 14, flexShrink: 0 }}>
              Swap exercise
            </h3>

            {/* Body group tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
              {groupTabs.map(({ key, label }) => (
                <button key={key} onClick={() => { setPickerGroup(key); setPickerMuscle(null) }}
                  style={{
                    flex: 1,
                    background: pickerGroup === key ? '#F0EDE8' : '#1E1E1E',
                    color: pickerGroup === key ? '#0C0C0C' : '#A8A49E',
                    border: pickerGroup === key ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '12px 0',
                    fontSize: 12, fontWeight: pickerGroup === key ? 700 : 400,
                    cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Muscle chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, paddingBottom: 10, marginBottom: 4, scrollbarWidth: 'none' }}>
              <button onClick={() => setPickerMuscle(null)} style={chipStyle(pickerMuscle === null)}>All</button>
              {visibleCategories.map(({ label }) => (
                <button key={label} onClick={() => setPickerMuscle(pickerMuscle === label ? null : label)} style={chipStyle(pickerMuscle === label)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Exercise list */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
              {filteredExercises.map((ex) => {
                const isCurrent = ex.id === substituteFor.exerciseId
                const mColor = muscleColors[ex.primaryMuscle] ?? '#A8A49E'
                return (
                  <motion.div
                    key={ex.id}
                    whileTap={isCurrent ? undefined : { scale: 0.97 }}
                    onClick={() => !isCurrent && applySubstitute(ex.id)}
                    style={{
                      background: isCurrent ? '#181818' : '#1E1E1E',
                      borderRadius: 16, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: isCurrent ? 'default' : 'pointer',
                      opacity: isCurrent ? 0.4 : 1,
                      border: '1px solid rgba(255,255,255,0.06)',
                      flexShrink: 0,
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
                      background: isCurrent ? 'rgba(168,164,158,0.12)' : mColor + '18',
                      color: isCurrent ? '#A8A49E' : mColor,
                      border: isCurrent ? '1px solid rgba(168,164,158,0.2)' : `1px solid ${mColor}35`,
                      borderRadius: 12, padding: '3px 9px',
                      fontSize: 11, fontWeight: 500,
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {isCurrent ? 'Current' : (muscleLabels[ex.primaryMuscle] ?? ex.primaryMuscle)}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </Sheet>
    </>
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
