import { motion } from 'framer-motion'
import type { Program } from '../types'
import { format, parseISO } from 'date-fns'
import { getExerciseById } from '../data/exercises'

interface Props {
  program: Program
  lastDate?: string
  onOpen: () => void      // tap card → detail sheet
}

const muscleLabels: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Upper Chest', lats: 'Lats',
  'mid-back': 'Mid Back', 'rear-delts': 'Rear Delts', 'side-delts': 'Side Delts',
  'front-delts': 'Front Delts', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abs: 'Abs',
  obliques: 'Obliques', 'lower-back': 'Lower Back', traps: 'Traps', neck: 'Neck',
}

const muscleChipColors: Record<string, { bg: string; text: string }> = {
  chest: { bg: 'rgba(232,123,106,0.14)', text: '#E87B6A' },
  'upper-chest': { bg: 'rgba(232,123,106,0.14)', text: '#E87B6A' },
  lats: { bg: 'rgba(106,156,232,0.14)', text: '#6A9CE8' },
  'mid-back': { bg: 'rgba(106,156,232,0.14)', text: '#6A9CE8' },
  'rear-delts': { bg: 'rgba(122,188,232,0.14)', text: '#7ABCE8' },
  'side-delts': { bg: 'rgba(200,169,110,0.14)', text: '#C8A96E' },
  'front-delts': { bg: 'rgba(200,169,110,0.14)', text: '#C8A96E' },
  shoulders: { bg: 'rgba(200,169,110,0.14)', text: '#C8A96E' },
  triceps: { bg: 'rgba(176,106,232,0.14)', text: '#B06AE8' },
  biceps: { bg: 'rgba(125,216,125,0.14)', text: '#7DD87D' },
  forearms: { bg: 'rgba(125,216,125,0.14)', text: '#7DD87D' },
  quads: { bg: 'rgba(232,197,106,0.14)', text: '#E8C56A' },
  hamstrings: { bg: 'rgba(232,154,106,0.14)', text: '#E89A6A' },
  glutes: { bg: 'rgba(232,136,106,0.14)', text: '#E8886A' },
  calves: { bg: 'rgba(106,232,200,0.14)', text: '#6AE8C8' },
  abs: { bg: 'rgba(168,232,106,0.14)', text: '#A8E86A' },
  traps: { bg: 'rgba(200,169,110,0.14)', text: '#C8A96E' },
}

export default function WorkoutCard({ program, lastDate, onOpen }: Props) {
  // Derive unique primary muscles from exercises
  const muscles = Array.from(
    new Set(
      program.exercises
        .map((e) => getExerciseById(e.exerciseId)?.primaryMuscle)
        .filter(Boolean) as string[]
    )
  )

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onOpen}
      style={{
        width: '100%',
        background: '#161616',
        borderRadius: 22,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: 4, background: program.tagColor, width: '100%', flexShrink: 0 }} />

      {/* Card body */}
      <div style={{ padding: '18px 20px 18px' }}>
        {/* Category badge */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            display: 'inline-block',
            background: program.tagColor + '1A',
            border: `1px solid ${program.tagColor}40`,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1.2px',
            color: program.tagColor,
            textTransform: 'uppercase',
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            {program.tag}
          </span>
        </div>

        {/* Program name */}
        <h3 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 28,
          color: '#F0EDE8',
          lineHeight: 1.1,
          marginBottom: 8,
          letterSpacing: '-0.3px',
        }}>
          {program.name}
        </h3>

        {/* Subtitle */}
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 14,
          fontStyle: 'italic',
          color: '#8A8680',
          marginBottom: 14,
          lineHeight: 1.4,
        }}>
          {program.exercises.length} exercises · ~{program.estimatedMinutes} min
        </p>

        {/* Muscle chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {muscles.slice(0, 4).map((m) => {
            const c = muscleChipColors[m] ?? { bg: 'rgba(200,169,110,0.14)', text: '#C8A96E' }
            return (
              <span
                key={m}
                style={{
                  background: c.bg,
                  color: c.text,
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  letterSpacing: '0.2px',
                }}
              >
                {muscleLabels[m] ?? m}
              </span>
            )
          })}
          {muscles.length > 4 && (
            <span style={{
              background: 'rgba(138,134,128,0.14)',
              color: '#8A8680',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              +{muscles.length - 4}
            </span>
          )}
        </div>

        {/* CTA button */}
        <button style={{
          width: '100%',
          background: '#F0EDE8',
          border: 'none',
          borderRadius: 14,
          padding: '13px',
          fontSize: 15,
          fontWeight: 600,
          color: '#0C0C0C',
          cursor: 'pointer',
          fontFamily: '"Outfit", system-ui, sans-serif',
          letterSpacing: '0.2px',
        }}>
          {lastDate ? `Last ${format(parseISO(lastDate), 'MMM d')} · View` : 'View Routine'}
        </button>
      </div>
    </motion.div>
  )
}
