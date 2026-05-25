import { useState } from 'react'
import { Reorder } from 'framer-motion'
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
        background: '#0C0C0C',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#F0EDE8' }}>Builder</h1>
            <p style={{ fontSize: 12, color: '#8A8680', marginTop: 2 }}>{items.length} exercise{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              background: '#C8A96E',
              border: 'none',
              borderRadius: 12,
              color: '#0C0C0C',
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 16px',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >+ Add</button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="scroll-y" style={{ flex: 1, padding: '16px 16px 0' }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px', color: '#8A8680',
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🏗️</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8', marginBottom: 8 }}>Start building</p>
            <p style={{ fontSize: 13 }}>Tap "+ Add" to add exercises. Drag to reorder.</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={items} onReorder={setItems} style={{ listStyle: 'none', padding: 0 }}>
            {items.map((item) => (
              <BuilderItem key={item.uid} item={item} onUpdate={updateItem} onRemove={removeItem} />
            ))}
          </Reorder.Group>
        )}
        <div style={{ height: 160 }} />
      </div>

      {/* Bottom actions */}
      {items.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 'max(80px, calc(env(safe-area-inset-bottom) + 60px))',
          left: 16, right: 16,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
              flex: 1, height: 50, background: '#161616',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, color: '#F0EDE8',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >Save Plan</button>
          <button
            onClick={startWorkout}
            style={{
              flex: 2, height: 50, background: '#C8A96E',
              border: 'none', borderRadius: 14,
              color: '#0C0C0C', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >Start Workout →</button>
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 24,
        }}>
          <div style={{
            background: '#161616', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: '#F0EDE8', marginBottom: 16 }}>
              Save Plan
            </h3>
            <input
              autoFocus
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Push A"
              style={{
                width: '100%', height: 48, background: '#1E1E1E',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                color: '#F0EDE8', fontSize: 15, padding: '0 16px', outline: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, height: 46, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#8A8680', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={savePlan} style={{ flex: 2, height: 46, background: '#C8A96E', border: 'none', borderRadius: 12, color: '#0C0C0C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise picker */}
      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, background: '#0C0C0C', zIndex: 150, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'max(54px, env(safe-area-inset-top)) 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                style={{
                  flex: 1, height: 40, background: '#161616',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  color: '#F0EDE8', fontSize: 14, padding: '0 14px', outline: 'none',
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
                    setItems([...items, { uid: nanoid(), exerciseId: ex.id, sets: ex.defaultSets, reps: parseInt(ex.defaultReps.split('–')[0]), weightKg: 20 }])
                    setShowPicker(false)
                    setSearch('')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: alreadyIn ? 'default' : 'pointer',
                    opacity: alreadyIn ? 0.4 : 1,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8' }}>{ex.name}</p>
                    <p style={{ fontSize: 12, color: '#8A8680' }}>{ex.defaultSets}×{ex.defaultReps}</p>
                  </div>
                  {alreadyIn && <span style={{ fontSize: 11, color: '#8A8680' }}>Added</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ExerciseDetailSheet exercise={pickerSelected} onClose={() => setPickerSelected(null)} />
    </div>
  )
}
