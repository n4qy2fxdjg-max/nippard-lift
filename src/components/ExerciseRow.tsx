import type { Exercise, MuscleGroup } from '../types'
import { muscleLabel, muscleColor } from '../lib/muscleLabels'

interface Props {
  exercise: Exercise
  onClick: () => void
}

export default function ExerciseRow({ exercise, onClick }: Props) {
  const accentColor = muscleColor[exercise.primaryMuscle as MuscleGroup] ?? '#8A8680'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '15px 20px 15px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.045)',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
      onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
    >
      {/* Muscle color accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: '50%',
        transform: 'translateY(-50%)',
        width: 3,
        height: 28,
        background: accentColor,
        borderRadius: '0 2px 2px 0',
        opacity: 0.75,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 15,
          fontWeight: 500,
          color: '#F0EDE8',
          lineHeight: 1.2,
          fontFamily: '"Outfit", system-ui, sans-serif',
        }}>
          {exercise.name}
        </p>
        <p style={{
          fontSize: 12,
          color: '#8A8680',
          marginTop: 3,
          fontFamily: '"Outfit", system-ui, sans-serif',
        }}>
          {muscleLabel[exercise.primaryMuscle] ?? exercise.primaryMuscle}
          <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
          {exercise.defaultSets}×{exercise.defaultReps}
        </p>
      </div>

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M9 6l6 6-6 6" stroke="#8A8680" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
