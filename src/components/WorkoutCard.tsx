import { motion } from 'framer-motion'
import type { Program } from '../types'
import { format, parseISO } from 'date-fns'
import { getExerciseById } from '../data/exercises'

interface Props {
  program: Program
  lastDate?: string
  onOpen: () => void      // tap card → detail sheet
}

import { muscleLabel } from '../lib/muscleLabels'

export default function WorkoutCard({ program, lastDate, onOpen }: Props) {
  // Derive unique consolidated muscle labels from exercises
  const muscles = Array.from(
    new Set(
      program.exercises
        .map((e) => {
          const m = getExerciseById(e.exerciseId)?.primaryMuscle
          return m ? muscleLabel[m] ?? m : null
        })
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
        borderRadius: 24,
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
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 11,
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
          color: '#A8A49E',
          marginBottom: 14,
          lineHeight: 1.4,
        }}>
          {program.exercises.length} exercises · ~{program.estimatedMinutes} min
        </p>

        {/* Muscle chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {muscles.slice(0, 4).map((m) => {
            const color = '#C8A96E'
            return (
              <span
                key={m}
                style={{
                  background: 'rgba(200,169,110,0.12)',
                  color,
                  borderRadius: 12,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  letterSpacing: '0.2px',
                }}
              >
                {m}
              </span>
            )
          })}
          {muscles.length > 4 && (
            <span style={{
              background: 'rgba(168,164,158,0.14)',
              color: '#A8A49E',
              borderRadius: 12,
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
          borderRadius: 16,
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
