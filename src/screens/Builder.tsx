import { useState, useMemo, useRef } from 'react'
import { Reorder, motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useBuilderStore } from '../store/useBuilderStore'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { useAppStore } from '../store/useAppStore'
import { getExercisesByGroup, getExerciseById } from '../data/exercises'
import type { BuilderItem as BuilderItemType, MuscleGroup, BodyGroup } from '../types'

const KG_TO_LB = 2.20462
const LB_TO_KG = 1 / KG_TO_LB

/* ── Muscle colour + label map (shared with ExerciseRow) ── */
const muscleColors: Record<string, string> = {
  chest: '#E87B6A', 'upper-chest': '#E87B6A',
  lats: '#6A9CE8', 'mid-back': '#6A9CE8',
  'rear-delts': '#7ABCE8', 'side-delts': '#C8A96E', 'front-delts': '#C8A96E',
  shoulders: '#C8A96E', triceps: '#B06AE8',
  biceps: '#7DD87D', forearms: '#7DD87D',
  quads: '#E8C56A', hamstrings: '#E89A6A', glutes: '#E8886A', calves: '#6AE8C8',
  adductors: '#E8886A', abs: '#A8E86A', obliques: '#A8E86A', 'lower-back': '#E8A06A',
  traps: '#C8A96E', neck: '#A0A09E',
}
const muscleLabels: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Upper Chest', lats: 'Lats',
  'mid-back': 'Mid Back', 'rear-delts': 'Rear Delts', 'side-delts': 'Side Delts',
  'front-delts': 'Front Delts', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abs: 'Abs',
  obliques: 'Obliques', 'lower-back': 'Lower Back', traps: 'Traps', neck: 'Neck',
}

const groupTabs: { key: 'all' | BodyGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'core', label: 'Core' },
]

function fmtWeight(kg: number, unit: 'kg' | 'lb'): string {
  if (unit === 'lb') return Math.round(kg * KG_TO_LB).toString()
  return kg % 1 === 0 ? kg.toFixed(0) : parseFloat(kg.toFixed(2)).toString()
}

export default function Builder() {
  const items = useBuilderStore((s) => s.currentItems)
  const setItems = useBuilderStore((s) => s.setCurrentItems)
  const addPlan = useBuilderStore((s) => s.addPlan)
  const plans = useBuilderStore((s) => s.plans)
  const startSession = useWorkoutStore((s) => s.startSession)
  const unit = useAppStore((s) => s.unit)
  const navigate = useNavigate()

  const [planName, setPlanName] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerGroup, setPickerGroup] = useState<'all' | BodyGroup>('all')
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup | null>(null)
  const [saved, setSaved] = useState(false)
  const [editingWeight, setEditingWeight] = useState<{ uid: string; val: string } | null>(null)
  const weightInputRef = useRef<HTMLInputElement>(null)

  const weightStep = unit === 'lb' ? LB_TO_KG : 1.0

  function commitWeightEdit() {
    if (!editingWeight) return
    const num = parseFloat(editingWeight.val)
    if (!isNaN(num) && num >= 0) {
      const kg = unit === 'lb' ? num * LB_TO_KG : num
      updateItem(editingWeight.uid, { weightKg: Math.max(0, parseFloat(kg.toFixed(4))) })
    }
    setEditingWeight(null)
  }

  const canSave = planName.trim().length > 0 && items.length > 0

  function updateItem(uid: string, changes: Partial<BuilderItemType>) {
    setItems(items.map((i) => (i.uid === uid ? { ...i, ...changes } : i)))
  }

  function removeItem(uid: string) {
    setItems(items.filter((i) => i.uid !== uid))
  }

  function addExercise(exId: string) {
    const ex = getExerciseById(exId)
    if (!ex) return
    setItems([...items, {
      uid: nanoid(),
      exerciseId: exId,
      sets: ex.defaultSets,
      reps: parseInt(ex.defaultReps.split('–')[0]),
      weightKg: 20,
    }])
    setShowPicker(false)
  }

  function selectGroup(g: 'all' | BodyGroup) {
    setPickerGroup(g)
    setPickerMuscle(null)
  }

  function savePlan() {
    if (!canSave) return
    addPlan({ id: nanoid(), name: planName.trim(), createdAt: new Date().toISOString(), items })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setPlanName('')
      setItems([])
      navigate('/')
    }, 800)
  }

  function startWorkout() {
    if (items.length === 0) return
    startSession('custom', planName.trim() || 'Custom Workout', items.map((item) => ({
      exerciseId: item.exerciseId,
      targetSets: item.sets,
      targetReps: String(item.reps),
      currentWeight: item.weightKg,
      sets: [],
    })))
    navigate('/active')
  }

  /* Picker filtering */
  const pickerMuscles = useMemo<MuscleGroup[]>(() => {
    const base = getExercisesByGroup(pickerGroup)
    return [...new Set(base.map((e) => e.primaryMuscle))] as MuscleGroup[]
  }, [pickerGroup])

  const filteredExercises = useMemo(() => {
    let list = getExercisesByGroup(pickerGroup)
    if (pickerMuscle) list = list.filter((e) => e.primaryMuscle === pickerMuscle)
    return list
  }, [pickerGroup, pickerMuscle])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>

      {/* Sticky header */}
      <div style={{
        padding: 'max(54px, env(safe-area-inset-top)) 24px 16px',
        background: 'rgba(12,12,12,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 30, color: '#F0EDE8', lineHeight: 1.1,
          }}>
            Build your<br />
            <em style={{ fontStyle: 'italic', color: '#C8A96E' }}>routine</em>
          </h1>
          <p style={{
            fontSize: 12, color: '#8A8680', marginTop: 6,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            {plans.length} saved
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scroll-y" style={{ flex: 1, padding: '20px 16px 0' }}>

        {/* Routine name input — Elevate pattern: always visible, not in modal */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 11, color: '#C8A96E', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.8px',
            display: 'block', marginBottom: 8,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Routine Name
          </label>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="e.g. Push A"
            style={{
              width: '100%',
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: 16,
              color: '#F0EDE8',
              fontFamily: '"Outfit", system-ui, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>

        {/* Exercise list label */}
        {items.length > 0 && (
          <label style={{
            fontSize: 11, color: '#8A8680', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.8px',
            display: 'block', marginBottom: 10,
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Exercises · drag to reorder
          </label>
        )}

        {/* Reorderable exercise cards */}
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={setItems}
          style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {items.map((item) => {
            const ex = getExerciseById(item.exerciseId)
            if (!ex) return null
            const mColor = muscleColors[ex.primaryMuscle] ?? '#8A8680'
            const mLabel = muscleLabels[ex.primaryMuscle] ?? ex.primaryMuscle

            return (
              <Reorder.Item
                key={item.uid}
                value={item}
                style={{
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '14px',
                  listStyle: 'none',
                  cursor: 'grab',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                  touchAction: 'none',
                }}
              >
                {/* Top row: name + muscle chip + remove */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 15, fontWeight: 600, color: '#F0EDE8',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      lineHeight: 1.2, marginBottom: 5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ex.name}
                    </p>
                    {/* Muscle category chip — Elevate signature */}
                    <span style={{
                      display: 'inline-block',
                      background: mColor + '18',
                      border: `1px solid ${mColor}35`,
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontSize: 11, fontWeight: 500,
                      color: mColor,
                      fontFamily: '"Outfit", system-ui, sans-serif',
                    }}>
                      {mLabel}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={() => removeItem(item.uid)}
                    style={{
                      background: '#1E1E1E',
                      border: 'none',
                      borderRadius: 8,
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#8A8680" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </motion.button>
                </div>

                {/* Sets + Reps pill steppers — Elevate signature */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {(['sets', 'reps'] as const).map((field) => (
                    <div key={field} style={{
                      flex: 1, display: 'flex', alignItems: 'center',
                      background: '#1A1A1A', borderRadius: 10, overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => updateItem(item.uid, { [field]: Math.max(1, item[field] - 1) })}
                        style={pillBtnStyle}
                      >
                        −
                      </button>
                      <div style={{
                        flex: 1, textAlign: 'center',
                        fontSize: 14, fontWeight: 600, color: '#F0EDE8',
                        fontFamily: '"Outfit", system-ui, sans-serif',
                      }}>
                        {item[field]}
                        <span style={{ fontSize: 10, fontWeight: 400, color: '#8A8680', marginLeft: 3 }}>
                          {field}
                        </span>
                      </div>
                      <button
                        onClick={() => updateItem(item.uid, { [field]: item[field] + 1 })}
                        style={pillBtnStyle}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>

                {/* Weight pill stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: '#1A1A1A', borderRadius: 10, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => updateItem(item.uid, { weightKg: Math.max(0, parseFloat((item.weightKg - weightStep).toFixed(4))) })}
                    style={pillBtnStyle}
                  >
                    −
                  </button>
                  <div
                    onClick={() => {
                      if (editingWeight?.uid !== item.uid) {
                        setEditingWeight({ uid: item.uid, val: fmtWeight(item.weightKg, unit) })
                        setTimeout(() => weightInputRef.current?.focus(), 30)
                      }
                    }}
                    style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 14, fontWeight: 600, color: '#C8A96E',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      cursor: 'text',
                    }}
                  >
                    {editingWeight?.uid === item.uid ? (
                      <input
                        ref={weightInputRef}
                        value={editingWeight.val}
                        onChange={(e) => setEditingWeight({ uid: item.uid, val: e.target.value })}
                        onBlur={commitWeightEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitWeightEdit() }}
                        inputMode="decimal"
                        style={{
                          width: 56, textAlign: 'center',
                          background: 'transparent', border: 'none',
                          borderBottom: '2px solid #C8A96E',
                          color: '#C8A96E', fontSize: 14, fontWeight: 600,
                          outline: 'none',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                        }}
                      />
                    ) : (
                      <>
                        {fmtWeight(item.weightKg, unit)}
                        <span style={{ fontSize: 10, fontWeight: 400, color: '#8A8680', marginLeft: 3 }}>{unit}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => updateItem(item.uid, { weightKg: parseFloat((item.weightKg + weightStep).toFixed(4)) })}
                    style={pillBtnStyle}
                  >
                    +
                  </button>
                </div>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>

        {/* Dashed "Add Exercise" — always visible (Elevate signature) */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1.5px dashed rgba(200,169,110,0.35)',
            borderRadius: 16,
            padding: items.length === 0 ? '32px 20px' : '14px 20px',
            fontSize: 14,
            color: '#8A8680',
            fontFamily: '"Outfit", system-ui, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: items.length === 0 ? 0 : 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 20, color: '#F0EDE8', marginBottom: 6, lineHeight: 1,
              }}>
                Add your first exercise
              </p>
              <p style={{ fontSize: 13, color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Tap to browse the exercise library
              </p>
            </div>
          ) : (
            <span>Add exercise</span>
          )}
        </motion.button>

        {/* Save / Start buttons — Elevate pattern: disabled Save state */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom) + 80px))' }}>
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  flex: 1, height: 52,
                  background: 'rgba(52,199,89,0.1)',
                  border: '1px solid rgba(52,199,89,0.25)',
                  borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#34C759',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                }}
              >
                Saved
              </motion.div>
            ) : (
              <motion.button
                key="save"
                whileTap={canSave ? { scale: 0.97 } : undefined}
                onClick={savePlan}
                disabled={!canSave}
                style={{
                  flex: 1, height: 52,
                  background: canSave ? '#F0EDE8' : '#1A1A1A',
                  color: canSave ? '#0C0C0C' : '#8A8680',
                  border: canSave ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  fontSize: 14, fontWeight: 700,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  transition: 'background 0.2s, color 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Save Routine
              </motion.button>
            )}
          </AnimatePresence>
          {items.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startWorkout}
              style={{
                flex: 2, height: 52, background: '#C8A96E',
                border: 'none', borderRadius: 16,
                color: '#0C0C0C', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Start Workout
            </motion.button>
          )}
        </div>
      </div>

      {/* Exercise picker — bottom sheet (Elevate signature) */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              key="picker-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 200,
              }}
            />
            {/* Sheet */}
            <motion.div
              key="picker-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                background: '#111111',
                borderRadius: '28px 28px 0 0',
                padding: '16px 20px 0',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                maxHeight: '82svh',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 201,
              }}
            >
              {/* Drag handle */}
              <div style={{
                width: 36, height: 4,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 2, margin: '0 auto 18px',
              }} />

              {/* Sheet heading */}
              <h3 style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 26, color: '#F0EDE8',
                marginBottom: 16, lineHeight: 1,
              }}>
                Add Exercise
              </h3>

              {/* Body group tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
                {groupTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => selectGroup(key)}
                    style={{
                      flex: 1,
                      background: pickerGroup === key ? '#F0EDE8' : '#1E1E1E',
                      color: pickerGroup === key ? '#0C0C0C' : '#8A8680',
                      border: pickerGroup === key ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10,
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: pickerGroup === key ? 700 : 400,
                      cursor: 'pointer',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Muscle chips — horizontal scroll */}
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0,
                paddingBottom: 12, marginBottom: 4,
                scrollbarWidth: 'none',
              }}>
                <button
                  onClick={() => setPickerMuscle(null)}
                  style={chipStyle(pickerMuscle === null)}
                >
                  All
                </button>
                {pickerMuscles.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPickerMuscle(pickerMuscle === m ? null : m)}
                    style={chipStyle(pickerMuscle === m)}
                  >
                    {muscleLabels[m] ?? m}
                  </button>
                ))}
              </div>

              {/* Exercise list */}
              <div style={{
                overflowY: 'auto', flex: 1, minHeight: 0,
                display: 'flex', flexDirection: 'column', gap: 8,
                paddingBottom: 16,
                WebkitOverflowScrolling: 'touch',
              }}>
                {filteredExercises.map((ex) => {
                  const already = items.some((i) => i.exerciseId === ex.id)
                  const mColor = muscleColors[ex.primaryMuscle] ?? '#8A8680'
                  return (
                    <motion.div
                      key={ex.id}
                      whileTap={already ? undefined : { scale: 0.97 }}
                      onClick={() => !already && addExercise(ex.id)}
                      style={{
                        background: already ? '#181818' : '#1E1E1E',
                        borderRadius: 14,
                        padding: '12px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        cursor: already ? 'default' : 'pointer',
                        opacity: already ? 0.5 : 1,
                        border: '1px solid rgba(255,255,255,0.06)',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 15, fontWeight: 500, color: '#F0EDE8',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {ex.name}
                        </p>
                        <p style={{
                          fontSize: 12, color: '#8A8680', marginTop: 2,
                          fontFamily: '"Outfit", system-ui, sans-serif',
                        }}>
                          {ex.defaultSets} sets · {ex.defaultReps} reps
                        </p>
                      </div>
                      <span style={{
                        background: already ? 'rgba(138,134,128,0.12)' : mColor + '18',
                        color: already ? '#8A8680' : mColor,
                        border: already
                          ? '1px solid rgba(138,134,128,0.2)'
                          : `1px solid ${mColor}35`,
                        borderRadius: 8,
                        padding: '3px 9px',
                        fontSize: 11, fontWeight: 500,
                        fontFamily: '"Outfit", system-ui, sans-serif',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}>
                        {already ? 'Added' : (muscleLabels[ex.primaryMuscle] ?? ex.primaryMuscle)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Shared styles ── */
const pillBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'none',
  border: 'none',
  fontSize: 18,
  color: '#8A8680',
  cursor: 'pointer',
  lineHeight: 1,
  WebkitTapHighlightColor: 'transparent',
  flexShrink: 0,
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    background: active ? '#F0EDE8' : '#1E1E1E',
    color: active ? '#0C0C0C' : '#8A8680',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontFamily: '"Outfit", system-ui, sans-serif',
    WebkitTapHighlightColor: 'transparent',
  }
}
