import type { Exercise } from '../types'

const equipmentIcons: Record<string, string> = {
  barbell: '🏋️',
  dumbbell: '💪',
  cable: '〽️',
  machine: '⚙️',
  bodyweight: '🤸',
  smith: '🔧',
}

const muscleLabels: Record<string, string> = {
  chest: 'Chest',
  'upper-chest': 'Upper Chest',
  lats: 'Lats',
  'mid-back': 'Mid Back',
  'rear-delts': 'Rear Delts',
  'side-delts': 'Side Delts',
  'front-delts': 'Front Delts',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  adductors: 'Adductors',
  abs: 'Abs',
  obliques: 'Obliques',
  'lower-back': 'Lower Back',
  traps: 'Traps',
  neck: 'Neck',
}

interface Props {
  exercise: Exercise
  onClick: () => void
}

export default function ExerciseRow({ exercise, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
      onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{equipmentIcons[exercise.equipment]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8', lineHeight: 1.2 }}>
          {exercise.name}
        </p>
        <p style={{ fontSize: 12, color: '#8A8680', marginTop: 2 }}>
          {muscleLabels[exercise.primaryMuscle] ?? exercise.primaryMuscle}
          {' · '}{exercise.defaultSets}×{exercise.defaultReps}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 6L15 12L9 18" stroke="#8A8680" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
