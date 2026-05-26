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
        minWidth: 220,
        background: '#161616',
        borderRadius: 20,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Top accent strip — Elevate signature */}
      <div style={{ height: 4, background: program.tagColor, width: '100%', flexShrink: 0 }} />

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Category badge chip */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: 'inline-block',
            background: program.tagColor + '18',
            border: `1px solid ${program.tagColor}38`,
            borderRadius: 6,
            padding: '3px 9px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1.4px',
            color: program.tagColor,
            textTransform: 'uppercase',
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            {program.tag}
          </span>
        </div>

        {/* Program name — serif */}
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 26,
          color: '#F0EDE8',
          lineHeight: 1.1,
          marginBottom: 6,
        }}>
          {program.name}
        </p>

        {/* Italic subtitle — Elevate signature */}
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 13,
          fontStyle: 'italic',
          color: '#8A8680',
          marginBottom: 20,
        }}>
          {program.exercises.length} exercises · {program.estimatedMinutes}m
        </p>

        {/* Bottom row: last date + start CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <p style={{
            fontSize: 10,
            color: lastDate ? '#8A8680' : 'rgba(138,134,128,0.4)',
            fontFamily: '"Outfit", system-ui, sans-serif',
            letterSpacing: '0.3px',
          }}>
            {lastDate ? `Last ${format(parseISO(lastDate), 'MMM d')}` : 'Not started'}
          </p>
          <div style={{
            background: '#F0EDE8',
            borderRadius: 8,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 700,
            color: '#0C0C0C',
            fontFamily: '"Outfit", system-ui, sans-serif',
            letterSpacing: '0.2px',
          }}>
            Start
          </div>
        </div>
      </div>
    </motion.div>
  )
}
