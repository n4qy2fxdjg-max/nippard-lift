import { useNavigate } from 'react-router-dom'
import { useWorkoutStore, buildSessionFromProgram } from '../store/useWorkoutStore'
import type { Program } from '../types'
import { format, parseISO } from 'date-fns'

interface Props {
  program: Program
  lastDate?: string
}

const tagLabels: Record<string, string> = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  upper: 'UPPER',
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
    <div
      onClick={handleStart}
      style={{
        minWidth: 200,
        background: '#161616',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        flexShrink: 0,
        transition: 'transform 0.12s, opacity 0.12s',
        userSelect: 'none',
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
      onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.opacity = '' }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.opacity = '' }}
    >
      {/* Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.5px',
          color: program.tagColor,
          background: `${program.tagColor}18`,
          border: `1px solid ${program.tagColor}35`,
          borderRadius: 6,
          padding: '3px 8px',
        }}>
          {tagLabels[program.tag]}
        </span>
        <span style={{ fontSize: 12, color: '#8A8680' }}>{program.estimatedMinutes} min</span>
      </div>

      {/* Name */}
      <div>
        <p style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: '#F0EDE8', lineHeight: 1.1 }}>
          {program.name}
        </p>
        <p style={{ fontSize: 12, color: '#8A8680', marginTop: 4 }}>
          {program.exercises.length} exercises
        </p>
      </div>

      {/* Last performed */}
      <p style={{ fontSize: 11, color: '#8A8680', marginTop: 'auto' }}>
        {lastDate
          ? `Last: ${format(parseISO(lastDate), 'MMM d')}`
          : 'Not started yet'}
      </p>
    </div>
  )
}
