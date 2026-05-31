import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { exercises as allExercises, getExercisesByGroup } from '../data/exercises'
import ExerciseRow from '../components/ExerciseRow'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import { useLibraryStore } from '../store/useLibraryStore'
import type { BodyGroup, Exercise, MuscleGroup } from '../types'

/** Consolidated muscle categories — each label covers one or more primaryMuscle values */
const MUSCLE_CATEGORIES: { label: string; muscles: MuscleGroup[] }[] = [
  { label: 'Chest',      muscles: ['chest', 'upper-chest'] },
  { label: 'Back',       muscles: ['lats', 'mid-back', 'rear-delts', 'traps', 'lower-back'] },
  { label: 'Shoulders',  muscles: ['shoulders', 'side-delts', 'front-delts'] },
  { label: 'Biceps',     muscles: ['biceps'] },
  { label: 'Triceps',    muscles: ['triceps'] },
  { label: 'Forearms',   muscles: ['forearms'] },
  { label: 'Glutes',     muscles: ['glutes'] },
  { label: 'Hamstrings', muscles: ['hamstrings'] },
  { label: 'Quads',      muscles: ['quads'] },
  { label: 'Calves',     muscles: ['calves'] },
  { label: 'Abs',        muscles: ['abs'] },
  { label: 'Obliques',   muscles: ['obliques'] },
  { label: 'Adductors',  muscles: ['adductors'] },
]

/** Returns a match score (lower = better), or null if the query doesn't match. */
function fuzzyScore(name: string, q: string): number | null {
  const lower = name.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx !== -1) return idx // direct substring — earlier = better
  // subsequence fallback (e.g. "ohp" → "Overhead Press")
  let qi = 0
  let firstIdx = -1
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      if (firstIdx === -1) firstIdx = i
      qi++
    }
  }
  return qi === q.length ? 1000 + firstIdx : null
}

function fuzzySearch(list: Exercise[], q: string): Exercise[] {
  return list
    .map((e) => ({ e, s: fuzzyScore(e.name, q) }))
    .filter((x): x is { e: Exercise; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s)
    .map((x) => x.e)
}

const groupTabs: { key: 'all' | BodyGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'core', label: 'Core' },
]


export default function Library() {
  const [group, setGroup] = useState<'all' | BodyGroup>('all')
  const [muscleCategory, setMuscleCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [query, setQuery] = useState('')
  const [trainedOnly, setTrainedOnly] = useState(false)
  const weightHistory = useLibraryStore((s) => s.weightHistory)
  const trainedIds = useMemo(() => new Set(Object.keys(weightHistory)), [weightHistory])

  const searching = query.trim().length > 0

  // Muscles that exist in the current group — used to hide irrelevant chips
  const presentMuscles = useMemo<Set<MuscleGroup>>(() => {
    return new Set(getExercisesByGroup(group).map((e) => e.primaryMuscle))
  }, [group])

  // Only show categories that have at least one exercise in the current group
  const visibleCategories = useMemo(() =>
    MUSCLE_CATEGORIES.filter((c) => c.muscles.some((m) => presentMuscles.has(m))),
  [presentMuscles])

  const filtered = useMemo(() => {
    let list: Exercise[]
    if (searching) {
      list = fuzzySearch(allExercises, query.trim().toLowerCase())
    } else {
      list = getExercisesByGroup(group)
      if (muscleCategory) {
        const cat = MUSCLE_CATEGORIES.find((c) => c.label === muscleCategory)
        if (cat) list = list.filter((e) => cat.muscles.includes(e.primaryMuscle))
      }
    }
    if (trainedOnly) list = list.filter((e) => trainedIds.has(e.id))
    return list
  }, [searching, query, group, muscleCategory, trainedOnly, trainedIds])

  function handleGroupChange(g: 'all' | BodyGroup) {
    setGroup(g)
    setMuscleCategory(null)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      {/* Sticky header */}
      <div style={{
        paddingTop: 'max(30px, env(safe-area-inset-top))',
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

        {/* Search field */}
        <div style={{ padding: '14px 24px 0' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: 14, color: '#8A8680', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              style={{
                width: '100%',
                padding: '11px 38px 11px 40px',
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 16,
                fontFamily: '"Outfit", system-ui, sans-serif',
                fontSize: 16, color: '#F0EDE8',
                outline: 'none', boxSizing: 'border-box',
                WebkitAppearance: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
            />
            {searching && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 8,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: '#8A8680', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Group tabs + muscle chips — hidden while searching */}
        {!searching && (
        <>
        <div className="scroll-x" style={{ display: 'flex', gap: 8, padding: '14px 24px 0' }}>
          {groupTabs.map(({ key, label }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleGroupChange(key)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
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

          {/* Separator */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '4px 0' }} />

          {/* Trained filter */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setTrainedOnly((v) => !v)}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: trainedOnly
                ? '1px solid rgba(52,199,89,0.4)'
                : '1px solid rgba(255,255,255,0.07)',
              background: trainedOnly ? 'rgba(52,199,89,0.1)' : 'transparent',
              color: trainedOnly ? '#34C759' : '#8A8680',
              fontSize: 13,
              fontWeight: trainedOnly ? 600 : 400,
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: '"Outfit", system-ui, sans-serif',
              letterSpacing: '0.2px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trained
          </motion.button>
        </div>

        {/* Muscle chips */}
        <div className="scroll-x" style={{ display: 'flex', gap: 6, padding: '10px 24px 14px' }}>
          <button
            onClick={() => setMuscleCategory(null)}
            style={{
              padding: '4px 12px', borderRadius: 999,
              border: muscleCategory === null ? '1px solid rgba(200,169,110,0.3)' : '1px solid rgba(255,255,255,0.05)',
              background: muscleCategory === null ? 'rgba(200,169,110,0.08)' : 'transparent',
              color: muscleCategory === null ? '#C8A96E' : '#8A8680',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}
          >
            All
          </button>
          {visibleCategories.map(({ label }) => (
            <button
              key={label}
              onClick={() => setMuscleCategory(label === muscleCategory ? null : label)}
              style={{
                padding: '4px 12px', borderRadius: 999,
                border: muscleCategory === label ? '1px solid rgba(200,169,110,0.3)' : '1px solid rgba(255,255,255,0.05)',
                background: muscleCategory === label ? 'rgba(200,169,110,0.08)' : 'transparent',
                color: muscleCategory === label ? '#C8A96E' : '#8A8680',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        </>
        )}
      </div>

      {/* Exercise list */}
      <div className="scroll-y" style={{ flex: 1 }}>
        {filtered.length === 0 && searching && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{
              fontSize: 15, fontWeight: 600, color: '#F0EDE8', marginBottom: 6,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}>
              No matches
            </p>
            <p style={{
              fontSize: 13, color: '#8A8680',
              fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6,
            }}>
              Nothing matches "{query.trim()}". Try a shorter term.
            </p>
          </div>
        )}
        {filtered.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} onClick={() => setSelected(ex)} />
        ))}
        <div style={{ height: 100 }} />
      </div>

      <ExerciseDetailSheet exercise={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
