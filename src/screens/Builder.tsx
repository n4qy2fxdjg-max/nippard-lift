import { useState } from 'react'
import { Reorder, motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useBuilderStore } from '../store/useBuilderStore'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { exercises } from '../data/exercises'
import BuilderItem from '../components/BuilderItem'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import type { BuilderItem as BuilderItemType, Exercise } from '../types'

export default function Builder() {
  const items = useBuilderStore((s) => s.currentItems)
  const setItems = useBuilderStore((s) => s.setCurrentItems)
  const addPlan = useBuilderStore((s) => s.addPlan)
  const startSession = useWorkoutStore((s) => s.startSession)
  const navigate = useNavigate()

  const [showPicker, setShowPicker] = useState(false)
  const [pickerSelected, setPickerSelected] = useState<Exercise | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [planName, setPlanName] = useState('')
  const [search, setSearch] = useState('')

  function updateItem(uid: string, changes: Partial<BuilderItemType>) {
    setItems(items.map((i) => (i.uid === uid ? { ...i, ...changes } : i)))
  }

  function removeItem(uid: string) {
    setItems(items.filter((i) => i.uid !== uid))
  }

  function savePlan() {
    if (!planName.trim() || items.length === 0) return
    addPlan({ id: nanoid(), name: planName.trim(), createdAt: new Date().toISOString(), items })
    setPlanName('')
    setShowSaveModal(false)
    setItems([])
  }

  function startWorkout() {
    if (items.length === 0) return
    startSession('custom', 'Custom Workout', items.map((item) => ({
      exerciseId: item.exerciseId,
      targetSets: item.sets,
      targetReps: String(item.reps),
      currentWeight: item.weightKg,
      sets: [],
    })))
    navigate('/active')
  }

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      {/* Header */}
      <div style={{
        paddingTop: 'max(54px, env(safe-area-inset-top))',
        padding: 'max(54px, env(safe-area-inset-top)) 24px 16px',
        background: 'rgba(12,12,12,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: 30, color: '#F0EDE8',
            }}>
              Builder
            </h1>
            <p style={{
              fontSize: 12, color: '#8A8680', marginTop: 2,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              {items.length} exercise{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowPicker(true)}
            style={{
              background: '#C8A96E',
              border: 'none', borderRadius: 12,
              color: '#0C0C0C', fontSize: 13, fontWeight: 700,
              padding: '10px 16px', cursor: 'pointer', marginTop: 4,
              fontFamily: '"Outfit", system-ui, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="#0C0C0C" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add
          </motion.button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="scroll-y" style={{ flex: 1, padding: '16px 16px 0' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px', color: '#8A8680' }}>
            {/* Barbell SVG */}
            <svg width="52" height="20" viewBox="0 0 52 20" fill="none" style={{ marginBottom: 20, opacity: 0.3 }}>
              <rect x="16" y="7" width="20" height="6" rx="2" fill="#8A8680" />
              <rect x="10" y="4" width="6" height="12" rx="2" fill="#8A8680" />
              <rect x="36" y="4" width="6" height="12" rx="2" fill="#8A8680" />
              <rect x="4" y="2" width="6" height="16" rx="2" fill="#8A8680" />
              <rect x="42" y="2" width="6" height="16" rx="2" fill="#8A8680" />
            </svg>
            <p style={{
              fontSize: 16, fontWeight: 600, color: '#F0EDE8',
              marginBottom: 8, fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              Start building
            </p>
            <p style={{ fontSize: 13, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
              Tap Add to include exercises. Drag handles to reorder.
            </p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={items} onReorder={setItems} style={{ listStyle: 'none', padding: 0 }}>
            {items.map((item) => (
              <BuilderItem key={item.uid} item={item} onUpdate={updateItem} onRemove={removeItem} />
            ))}
          </Reorder.Group>
        )}
        <div style={{ height: 180 }} />
      </div>

      {/* Bottom actions */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 'max(84px, calc(env(safe-area-inset-bottom) + 64px))',
              left: 16, right: 16,
              display: 'flex', gap: 10,
            }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSaveModal(true)}
              style={{
                flex: 1, height: 52,
                background: 'rgba(30,30,30,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, color: '#F0EDE8',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}
            >
              Save Plan
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startWorkout}
              style={{
                flex: 2, height: 52, background: '#C8A96E',
                border: 'none', borderRadius: 16,
                color: '#0C0C0C', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
              }}
            >
              Start Workout
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            key="modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 200, padding: 24,
            }}
          >
            <motion.div
              key="modal"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background: 'rgba(22,22,22,0.98)',
                backdropFilter: 'blur(40px)',
                borderRadius: 22, padding: 28, width: '100%', maxWidth: 360,
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <h3 style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 24, color: '#F0EDE8', marginBottom: 6,
              }}>
                Name your plan
              </h3>
              <p style={{
                fontSize: 13, color: '#8A8680', marginBottom: 20,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {items.length} exercise{items.length !== 1 ? 's' : ''}
              </p>
              <input
                autoFocus
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePlan()}
                placeholder="e.g. Push A"
                style={{
                  width: '100%', height: 50,
                  background: '#1E1E1E',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14, color: '#F0EDE8',
                  fontSize: 16, padding: '0 16px', outline: 'none',
                  marginBottom: 16,
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    flex: 1, height: 48,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 14, color: '#8A8680',
                    fontSize: 14, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={savePlan}
                  style={{
                    flex: 2, height: 48,
                    background: '#C8A96E', border: 'none',
                    borderRadius: 14, color: '#0C0C0C',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                >
                  Save Plan
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            key="picker"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            style={{
              position: 'fixed', inset: 0, background: '#0C0C0C',
              zIndex: 150, display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: 'max(54px, env(safe-area-inset-top)) 20px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#0C0C0C',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { setShowPicker(false); setSearch('') }}
                  style={{
                    background: 'none', border: 'none',
                    color: '#C8A96E', fontSize: 14, cursor: 'pointer',
                    fontWeight: 600, fontFamily: '"Outfit", system-ui, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </motion.button>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises…"
                  style={{
                    flex: 1, height: 42,
                    background: '#161616',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, color: '#F0EDE8',
                    fontSize: 14, padding: '0 14px', outline: 'none',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                />
              </div>
            </div>
            <div className="scroll-y" style={{ flex: 1 }}>
              {filteredExercises.map((ex) => {
                const alreadyIn = items.some((i) => i.exerciseId === ex.id)
                return (
                  <div
                    key={ex.id}
                    onClick={() => {
                      if (alreadyIn) return
                      setItems([...items, {
                        uid: nanoid(),
                        exerciseId: ex.id,
                        sets: ex.defaultSets,
                        reps: parseInt(ex.defaultReps.split('–')[0]),
                        weightKg: 20,
                      }])
                      setShowPicker(false)
                      setSearch('')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '15px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.045)',
                      cursor: alreadyIn ? 'default' : 'pointer',
                      opacity: alreadyIn ? 0.35 : 1,
                    }}
                    onPointerDown={(e) => {
                      if (!alreadyIn) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
                    }}
                    onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div>
                      <p style={{
                        fontSize: 15, fontWeight: 500, color: '#F0EDE8',
                        fontFamily: '"Outfit", system-ui, sans-serif',
                      }}>
                        {ex.name}
                      </p>
                      <p style={{
                        fontSize: 12, color: '#8A8680',
                        fontFamily: '"Outfit", system-ui, sans-serif', marginTop: 2,
                      }}>
                        {ex.defaultSets}×{ex.defaultReps}
                      </p>
                    </div>
                    {alreadyIn && (
                      <span style={{
                        fontSize: 11, color: '#8A8680',
                        fontFamily: '"Outfit", system-ui, sans-serif',
                      }}>
                        Added
                      </span>
                    )}
                  </div>
                )
              })}
              <div style={{ height: 60 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExerciseDetailSheet exercise={pickerSelected} onClose={() => setPickerSelected(null)} />
    </div>
  )
}
