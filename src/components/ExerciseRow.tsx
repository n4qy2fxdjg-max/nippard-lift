import type { Exercise, MuscleGroup } from '../types'

const muscleLabels: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Upper Chest', lats: 'Lats',
  'mid-back': 'Mid Back', 'rear-delts': 'Rear Delts', 'side-delts': 'Side Delts',
  'front-delts': 'Front Delts', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abs: 'Abs',
  obliques: 'Obliques', 'lower-back': 'Lower Back', traps: 'Traps', neck: 'Neck',
}

const muscleColors: Record<MuscleGroup, string> = {
  chest: '#E87B6A', 'upper-chest': '#E87B6A',
  lats: '#6A9CE8', 'mid-back': '#6A9CE8',
  'rear-delts': '#7ABCE8', 'side-delts': '#C8A96E', 'front-delts': '#C8A96E',
  shoulders: '#C8A96E',
  triceps: '#B06AE8',
  biceps: '#7DD87D', forearms: '#7DD87D',
  quads: '#E8C56A', hamstrings: '#E89A6A', glutes: '#E8886A', calves: '#6AE8C8',
  adductors: '#E8886A',
  abs: '#A8E86A', obliques: '#A8E86A', 'lower-back': '#E8A06A',
  traps: '#C8A96E', neck: '#A0A09E',
}

interface Props {
  exercise: Exercise
  onClick: () => void
}

export default function ExerciseRow({ exercise, onClick }: Props) {
  const accentColor = muscleColors[exercise.primaryMuscle as MuscleGroup] ?? '#8A8680'

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
          {muscleLabels[exercise.primaryMuscle] ?? exercise.primaryMuscle}
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
