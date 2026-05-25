import { useState, useMemo } from 'react'
import { exercises, getExercisesByGroup } from '../data/exercises'
import ExerciseRow from '../components/ExerciseRow'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import type { BodyGroup, Exercise, MuscleGroup } from '../types'

const groupTabs: { key: 'all' | BodyGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'core', label: 'Core' },
]

const muscleLabels: Record<MuscleGroup, string> = {
  chest: 'Chest', 'upper-chest': 'Upper Chest', lats: 'Lats',
  'mid-back': 'Mid Back', 'rear-delts': 'Rear Delts', 'side-delts': 'Side Delts',
  'front-delts': 'Front Delts', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abs: 'Abs',
  obliques: 'Obliques', 'lower-back': 'Lower Back', traps: 'Traps', neck: 'Neck',
}

export default function Library() {
  const [group, setGroup] = useState<'all' | BodyGroup>('all')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    let list = getExercisesByGroup(group)
    if (muscle) list = list.filter((e) => e.primaryMuscle === muscle)
    return list
  }, [group, muscle])

  const muscles = useMemo<MuscleGroup[]>(() => {
    const base = getExercisesByGroup(group)
    return [...new Set(base.map((e) => e.primaryMuscle))] as MuscleGroup[]
  }, [group])

  function handleGroupChange(g: 'all' | BodyGroup) {
    setGroup(g)
    setMuscle(null)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      {/* Sticky header */}
      <div style={{
        paddingTop: 'max(54px, env(safe-area-inset-top))',
        background: '#0C0C0C',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px 24px 0' }}>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#F0EDE8' }}>Library</h1>
          <p style={{ fontSize: 12, color: '#8A8680', marginTop: 2 }}>{exercises.length} exercises</p>
        </div>

        {/* Group tabs */}
        <div className="scroll-x" style={{ display: 'flex', gap: 8, padding: '14px 24px 0' }}>
          {groupTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleGroupChange(key)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: group === key ? '1px solid rgba(200,169,110,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: group === key ? 'rgba(200,169,110,0.12)' : '#161616',
                color: group === key ? '#C8A96E' : '#8A8680',
                fontSize: 13,
                fontWeight: group === key ? 600 : 400,
                cursor: 'pointer',
                flexShrink: 0,
                letterSpacing: '0.2px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Muscle chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: 8, padding: '10px 24px 14px' }}>
          <button
            onClick={() => setMuscle(null)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: muscle === null ? '1px solid rgba(200,169,110,0.3)' : '1px solid rgba(255,255,255,0.06)',
              background: muscle === null ? 'rgba(200,169,110,0.1)' : 'transparent',
              color: muscle === null ? '#C8A96E' : '#8A8680',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >All</button>
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m === muscle ? null : m)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: muscle === m ? '1px solid rgba(200,169,110,0.3)' : '1px solid rgba(255,255,255,0.06)',
                background: muscle === m ? 'rgba(200,169,110,0.1)' : 'transparent',
                color: muscle === m ? '#C8A96E' : '#8A8680',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {muscleLabels[m] ?? m}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="scroll-y" style={{ flex: 1 }}>
        {filtered.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} onClick={() => setSelected(ex)} />
        ))}
        <div style={{ height: 90 }} />
      </div>

      <ExerciseDetailSheet exercise={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
