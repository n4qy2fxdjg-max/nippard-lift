import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { getExerciseById } from '../data/exercises'
import WeightStepper from '../components/WeightStepper'
import RestTimer from '../components/RestTimer'

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ActiveWorkout() {
  const navigate = useNavigate()
  const { activeSession, markSetComplete, adjustWeight, skipRest, tickRest, completeSession, abandonSession } = useWorkoutStore()
  const [elapsed, setElapsed] = useState(0)
  const [showAbandon, setShowAbandon] = useState(false)
  const [reps, setReps] = useState(8)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!activeSession) { navigate('/'); return }

    // Elapsed timer
    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000))
    }, 1000)

    return () => clearInterval(elapsedInterval)
  }, [activeSession?.startedAt])

  // Rest countdown (accurate against wall time)
  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'rest') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null }
      return
    }

    // Request wake lock during rest
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => { wakeLockRef.current = lock }).catch(() => {})
    }

    timerRef.current = setInterval(tickRest, 500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeSession?.phase])

  useEffect(() => {
    if (!activeSession) return
    const currentEx = activeSession.exercises[activeSession.currentExIdx]
    if (currentEx) {
      const ex = getExerciseById(currentEx.exerciseId)
      const defaultReps = ex ? parseInt(ex.defaultReps.split('–')[0]) : 8
      setReps(defaultReps)
    }
  }, [activeSession?.currentExIdx])

  if (!activeSession) return null

  const { exercises, currentExIdx, phase, restRemaining, restTotal } = activeSession
  const currentEx = exercises[currentExIdx]
  const exercise = currentEx ? getExerciseById(currentEx.exerciseId) : null
  const setsCompleted = currentEx?.sets.filter((s) => s.completed).length ?? 0
  const isDone = phase === 'done'

  function handleComplete() {
    completeSession()
    navigate('/progress?new=1')
  }

  function handleAbandon() {
    abandonSession()
    navigate('/')
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 280 }}
      style={{
        position: 'fixed', inset: 0,
        background: '#0C0C0C',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'max(54px, env(safe-area-inset-top))',
        paddingBottom: 'max(34px, env(safe-area-inset-bottom))',
        zIndex: 200,
      }}
    >
      {/* Top bar */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 12, color: '#8A8680' }}>{activeSession.planName}</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#C8A96E', fontVariantNumeric: 'tabular-nums' }}>
            {formatElapsed(elapsed)}
          </p>
        </div>
        <button
          onClick={() => setShowAbandon(true)}
          style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#8A8680', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      {/* Progress pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 16px', flexShrink: 0, overflowX: 'auto' }}>
        {exercises.map((ex, i) => {
          const exData = getExerciseById(ex.exerciseId)
          const done = ex.sets.filter((s) => s.completed).length
          const isActive = i === currentExIdx
          return (
            <div key={i} style={{
              padding: '4px 10px', borderRadius: 20, flexShrink: 0,
              background: isActive ? 'rgba(200,169,110,0.15)' : done === ex.targetSets ? 'rgba(52,199,89,0.12)' : '#161616',
              border: isActive ? '1px solid rgba(200,169,110,0.35)' : done === ex.targetSets ? '1px solid rgba(52,199,89,0.25)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#C8A96E' : done === ex.targetSets ? '#34C759' : '#8A8680' }}>
                {exData?.name.split(' ')[0] ?? '?'} {done}/{ex.targetSets}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', gap: 32 }}>
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: 48, marginBottom: 16 }}>🏆</p>
              <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 32, color: '#F0EDE8', marginBottom: 8 }}>
                Workout Complete
              </h2>
              <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 8 }}>
                {formatElapsed(elapsed)} · {exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0)} sets
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#C8A96E' }}>
                {exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).reduce((v, s) => v + s.weight * s.reps, 0), 0).toFixed(0)} kg volume
              </p>
            </motion.div>
          ) : phase === 'rest' ? (
            <motion.div
              key="rest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <RestTimer remaining={restRemaining} total={restTotal} onSkip={skipRest} />
            </motion.div>
          ) : (
            <motion.div
              key={`ex-${currentExIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {/* Exercise name */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 8 }}>
                  Exercise {currentExIdx + 1} of {exercises.length}
                </p>
                <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 32, color: '#F0EDE8', lineHeight: 1.15 }}>
                  {exercise?.name ?? currentEx?.exerciseId}
                </h2>
              </div>

              {/* Set progress */}
              <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 20 }}>
                Set {setsCompleted + 1} of {currentEx?.targetSets} · {currentEx?.targetReps} reps
              </p>

              {/* Set circles */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                {Array.from({ length: currentEx?.targetSets ?? 0 }).map((_, i) => {
                  const done = i < setsCompleted
                  const active = i === setsCompleted
                  return (
                    <div key={i} style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: done ? '#C8A96E' : active ? 'rgba(200,169,110,0.15)' : '#1E1E1E',
                      border: done ? 'none' : active ? '2px solid #C8A96E' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <span style={{ fontSize: 16, color: '#0C0C0C' }}>✓</span>}
                      {!done && <span style={{ fontSize: 12, color: active ? '#C8A96E' : '#8A8680', fontWeight: 600 }}>{i + 1}</span>}
                    </div>
                  )
                })}
              </div>

              {/* Weight stepper */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: '#8A8680', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Weight</p>
                <WeightStepper
                  weight={currentEx?.currentWeight ?? 0}
                  onChange={(w) => currentEx && adjustWeight(currentEx.exerciseId, w - currentEx.currentWeight)}
                />
              </div>

              {/* Reps */}
              <div>
                <p style={{ fontSize: 11, color: '#8A8680', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Reps</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => setReps(Math.max(1, reps - 1))} style={bigBtnStyle}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#F0EDE8', minWidth: 44, textAlign: 'center' }}>{reps}</span>
                  <button onClick={() => setReps(reps + 1)} style={bigBtnStyle}>+</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        {isDone ? (
          <button
            onClick={handleComplete}
            style={{ width: '100%', height: 56, background: '#C8A96E', border: 'none', borderRadius: 16, color: '#0C0C0C', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            Save & Exit
          </button>
        ) : phase !== 'rest' && (
          <button
            onClick={() => markSetComplete(reps)}
            style={{ width: '100%', height: 56, background: '#C8A96E', border: 'none', borderRadius: 16, color: '#0C0C0C', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px' }}
          >
            Complete Set {setsCompleted + 1}
          </button>
        )}
      </div>

      {/* Abandon dialog */}
      {showAbandon && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
          <div style={{ background: '#161616', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: '#F0EDE8', marginBottom: 10 }}>End workout?</h3>
            <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 20 }}>Your progress will not be saved.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAbandon(false)} style={{ flex: 1, height: 46, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F0EDE8', fontSize: 14, cursor: 'pointer' }}>Keep Going</button>
              <button onClick={handleAbandon} style={{ flex: 1, height: 46, background: '#FF453A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>End</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

const bigBtnStyle: React.CSSProperties = {
  width: 44, height: 44,
  background: '#1E1E1E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#F0EDE8',
  fontSize: 22,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
