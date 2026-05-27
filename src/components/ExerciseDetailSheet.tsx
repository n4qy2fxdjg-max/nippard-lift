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
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 15px)',
              left: 0, right: 0,
              background: 'rgba(18,18,18,0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '22px 22px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -20px 60px rgba(0,0,0,0.4)',
              zIndex: 101,
              maxHeight: 'calc(100svh - env(safe-area-inset-bottom, 0px) - 15px - 60px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2 }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 24px', paddingBottom: '16px', flex: 1 }}>
              {/* Header */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <h2 style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontSize: 28, color: '#F0EDE8',
                    lineHeight: 1.15, flex: 1,
                  }}>
                    {exercise.name}
                  </h2>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={onClose}
                    style={{
                      width: 32, height: 32,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '50%',
                      color: '#8A8680',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </motion.button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 20, background: 'rgba(200,169,110,0.12)',
                    color: '#C8A96E', border: '1px solid rgba(200,169,110,0.2)',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}>
                    {muscleLabels[exercise.primaryMuscle] ?? exercise.primaryMuscle}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 20, background: '#1E1E1E',
                    color: '#8A8680', border: '1px solid rgba(255,255,255,0.07)',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}>
                    {exercise.defaultSets} × {exercise.defaultReps}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 20, background: '#1E1E1E',
                    color: '#8A8680', border: '1px solid rgba(255,255,255,0.07)',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}>
                    {exercise.restLabel} rest
                  </span>
                </div>
              </div>

              {/* Form Cues */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px',
                  color: '#8A8680', marginBottom: 14,
                  fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600,
                }}>
                  Form Cues
                </p>
                {exercise.formCues.map((cue, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                    <span style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(200,169,110,0.1)',
                      border: '1px solid rgba(200,169,110,0.2)',
                      color: '#C8A96E', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                    }}>
                      {i + 1}
                    </span>
                    <p style={{
                      fontSize: 14, color: '#F0EDE8', lineHeight: 1.55,
                      flex: 1, fontFamily: '"Outfit", system-ui, sans-serif',
                    }}>
                      {cue}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress Chart */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px',
                  color: '#8A8680', marginBottom: 14,
                  fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600,
                }}>
                  Progressive Overload
                </p>
                <OverloadChart history={getHistory(exercise.id)} />
              </div>

              {/* Add to Builder */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addToBuilder}
                style={{
                  width: '100%', height: 52,
                  background: '#C8A96E',
                  border: 'none', borderRadius: 16,
                  color: '#0C0C0C', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.2px',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                }}
              >
                Add to Builder
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
