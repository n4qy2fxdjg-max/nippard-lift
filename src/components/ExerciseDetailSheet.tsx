import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { Exercise } from '../types'
import { useLibraryStore } from '../store/useLibraryStore'
import { useBuilderStore } from '../store/useBuilderStore'
import OverloadChart from './OverloadChart'
import { nanoid } from 'nanoid'

const muscleLabels: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Upper Chest', lats: 'Lats',
  'mid-back': 'Mid Back', 'rear-delts': 'Rear Delts', 'side-delts': 'Side Delts',
  'front-delts': 'Front Delts', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abs: 'Abs',
  obliques: 'Obliques', 'lower-back': 'Lower Back', traps: 'Traps', neck: 'Neck',
}

interface Props {
  exercise: Exercise | null
  onClose: () => void
}

export default function ExerciseDetailSheet({ exercise, onClose }: Props) {
  const getHistory = useLibraryStore((s) => s.getHistory)
  const setCurrentItems = useBuilderStore((s) => s.setCurrentItems)
  const currentItems = useBuilderStore((s) => s.currentItems)

  function addToBuilder() {
    if (!exercise) return
    const alreadyIn = currentItems.some((i) => i.exerciseId === exercise.id)
    if (!alreadyIn) {
      setCurrentItems([...currentItems, {
        uid: nanoid(),
        exerciseId: exercise.id,
        sets: exercise.defaultSets,
        reps: parseInt(exercise.defaultReps.split('–')[0]),
        weightKg: 20,
      }])
    }
    onClose()
  }

  const content = (
    <AnimatePresence>
      {exercise && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              zIndex: 100,
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              background: '#161616',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              zIndex: 101,
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 24px 40px', flex: 1 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: '#F0EDE8', lineHeight: 1.15, flex: 1 }}>
                    {exercise.name}
                  </h2>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', fontSize: 20, paddingTop: 4, flexShrink: 0 }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(200,169,110,0.12)', color: '#C8A96E', border: '1px solid rgba(200,169,110,0.2)' }}>
                    {muscleLabels[exercise.primaryMuscle] ?? exercise.primaryMuscle}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#1E1E1E', color: '#8A8680', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {exercise.defaultSets} × {exercise.defaultReps}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#1E1E1E', color: '#8A8680', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {exercise.restLabel} rest
                  </span>
                </div>
              </div>

              {/* Form Cues */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 12 }}>Form Cues</p>
                {exercise.formCues.map((cue, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.2)', color: '#C8A96E', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </span>
                    <p style={{ fontSize: 14, color: '#F0EDE8', lineHeight: 1.5, flex: 1 }}>{cue}</p>
                  </div>
                ))}
              </div>

              {/* Progress Chart */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 12 }}>Progressive Overload</p>
                <OverloadChart history={getHistory(exercise.id)} />
              </div>

              {/* Add to Builder */}
              <button
                onClick={addToBuilder}
                style={{
                  width: '100%', height: 50, background: '#C8A96E', border: 'none', borderRadius: 14,
                  color: '#0C0C0C', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                Add to Builder
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
