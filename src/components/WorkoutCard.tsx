import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWorkoutStore, buildSessionFromProgram } from '../store/useWorkoutStore'
import type { Program } from '../types'
import { format, parseISO } from 'date-fns'

interface Props {
  program: Program
  lastDate?: string
}

export default function WorkoutCard({ program, lastDate }: Props) {
  const navigate = useNavigate()
  const startSession = useWorkoutStore((s) => s.startSession)

  function handleStart() {
    const session = buildSessionFromProgram(program.id)
    if (!session) return
    startSession(program.id, session.planName, session.exercises)
    navigate('/active')
  }

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={handleStart}
      style={{
        minWidth: 210,
        height: 200,
        background: '#161616',
        borderRadius: 18,
        padding: '18px 18px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Left color accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 20, bottom: 20,
        width: 3,
        background: program.tagColor,
        borderRadius: '0 2px 2px 0',
        opacity: 0.8,
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '1.8px',
          color: program.tagColor,
          textTransform: 'uppercase',
          fontFamily: '"Outfit", system-ui, sans-serif',
        }}>
          {program.tag}
        </span>
        <span style={{
          fontSize: 11,
          color: '#8A8680',
          fontFamily: '"Outfit", system-ui, sans-serif',
        }}>
          {program.estimatedMinutes}m
        </span>
      </div>

      {/* Program name */}
      <div style={{ marginTop: 'auto' }}>
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 26,
          color: '#F0EDE8',
          lineHeight: 1.1,
          marginBottom: 6,
        }}>
          {program.name}
        </p>
        <p style={{
          fontSize: 12,
          color: '#8A8680',
          fontFamily: '"Outfit", system-ui, sans-serif',
          marginBottom: 14,
        }}>
          {program.exercises.length} exercises
        </p>
        <p style={{
          fontSize: 10,
          color: lastDate ? '#8A8680' : 'rgba(138,134,128,0.5)',
          fontFamily: '"Outfit", system-ui, sans-serif',
          letterSpacing: '0.3px',
        }}>
          {lastDate ? `Last ${format(parseISO(lastDate), 'MMM d')}` : 'Not started'}
        </p>
      </div>
    </motion.div>
  )
}
