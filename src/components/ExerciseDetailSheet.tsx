import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { Exercise } from '../types'
import { useLibraryStore } from '../store/useLibraryStore'
import { useBuilderStore } from '../store/useBuilderStore'
import { useToastStore } from '../store/useToastStore'
import OverloadChart from './OverloadChart'
import Sheet from './Sheet'
import { nanoid } from 'nanoid'

import { muscleLabel } from '../lib/muscleLabels'

interface Props {
  exercise: Exercise | null
  onClose: () => void
}

export default function ExerciseDetailSheet({ exercise, onClose }: Props) {
  const getHistory = useLibraryStore((s) => s.getHistory)
  const setCurrentItems = useBuilderStore((s) => s.setCurrentItems)
  const currentItems = useBuilderStore((s) => s.currentItems)
  const showToast = useToastStore((s) => s.show)
  const navigate = useNavigate()

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
    // Close the loop: confirm the add and offer a jump to the Builder, instead
    // of silently closing the sheet and leaving the user on Library.
    showToast({
      message: alreadyIn ? `${exercise.name} is already in your routine` : `${exercise.name} added`,
      actionLabel: 'Open Builder',
      onAction: () => navigate('/builder'),
    })
    onClose()
  }

  return (
    <Sheet open={!!exercise} onClose={onClose}>
      {exercise && (
        <div style={{ overflowY: 'auto', padding: '4px 24px 16px', flex: 1 }}>
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
                borderRadius: 999, background: 'rgba(200,169,110,0.12)',
                color: '#C8A96E', border: '1px solid rgba(200,169,110,0.2)',
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {muscleLabel[exercise.primaryMuscle] ?? exercise.primaryMuscle}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 999, background: '#1E1E1E',
                color: '#8A8680', border: '1px solid rgba(255,255,255,0.07)',
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {exercise.defaultSets} × {exercise.defaultReps}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 999, background: '#1E1E1E',
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
      )}
    </Sheet>
  )
}
