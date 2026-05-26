import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getExercisesByGroup } from '../data/exercises'
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

const listVariants = {
  visible: { transition: { staggerChildren: 0.03 } },
}
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
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
        background: 'rgba(12,12,12,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 30, color: '#F0EDE8',
          }}>
            Library
          </h1>
          <p style={{
            fontSize: 11, color: '#8A8680',
            fontFamily: '"Outfit", system-ui, sans-serif',
            paddingBottom: 4,
          }}>
            {filtered.length} exercises
          </p>
        </div>

        {/* Group tabs */}
        <div className="scroll-x" style={{ display: 'flex', gap: 8, padding: '14px 24px 0' }}>
          {groupTabs.map(({ key, label }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleGroupChange(key)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: group === key
                  ? '1px solid rgba(200,169,110,0.35)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: group === key ? 'rgba(200,169,110,0.1)' : 'transparent',
                color: group === key ? '#C8A96E' : '#8A8680',
                fontSize: 13,
                fontWeight: group === key ? 600 : 400,
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: '"Outfit", system-ui, sans-serif',
                letterSpacing: '0.2px',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Muscle chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: 6, padding: '10px 24px 14px' }}>
          <button
            onClick={() => setMuscle(null)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: muscle === null
                ? '1px solid rgba(200,169,110,0.3)'
                : '1px solid rgba(255,255,255,0.05)',
              background: muscle === null ? 'rgba(200,169,110,0.08)' : 'transparent',
              color: muscle === null ? '#C8A96E' : '#8A8680',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}
          >
            All
          </button>
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m === muscle ? null : m)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: muscle === m
                  ? '1px solid rgba(200,169,110,0.3)'
                  : '1px solid rgba(255,255,255,0.05)',
                background: muscle === m ? 'rgba(200,169,110,0.08)' : 'transparent',
                color: muscle === m ? '#C8A96E' : '#8A8680',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}
            >
              {muscleLabels[m] ?? m}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <motion.div
        key={`${group}-${muscle}`}
        className="scroll-y"
        style={{ flex: 1 }}
        initial="hidden"
        animate="visible"
        variants={listVariants}
      >
        {filtered.map((ex) => (
          <motion.div key={ex.id} variants={rowVariants}>
            <ExerciseRow exercise={ex} onClick={() => setSelected(ex)} />
          </motion.div>
        ))}
        <div style={{ height: 100 }} />
      </motion.div>

      <ExerciseDetailSheet exercise={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
