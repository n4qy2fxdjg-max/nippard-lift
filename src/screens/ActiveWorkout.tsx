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
    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000))
    }, 1000)
    return () => clearInterval(elapsedInterval)
  }, [activeSession?.startedAt])

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'rest') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null }
      return
    }
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
      setReps(ex ? parseInt(ex.defaultReps.split('–')[0]) : 8)
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
      <div style={{
        padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div>
          <p style={{
            fontSize: 11, color: '#8A8680',
            fontFamily: '"Outfit", system-ui, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.8px',
          }}>
            {activeSession.planName}
          </p>
          <p style={{
            fontSize: 18, fontWeight: 700, color: '#C8A96E',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: '"Outfit", system-ui, sans-serif',
            letterSpacing: '-0.5px',
          }}>
            {formatElapsed(elapsed)}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setShowAbandon(true)}
          style={{
            width: 38, height: 38,
            background: '#1E1E1E',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, color: '#8A8680', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>

      {/* Progress pills */}
      <div style={{
        display: 'flex', gap: 6,
        padding: '12px 20px',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {exercises.map((ex, i) => {
          const exData = getExerciseById(ex.exerciseId)
          const done = ex.sets.filter((s) => s.completed).length
          const isActive = i === currentExIdx
          const isComplete = done === ex.targetSets
          return (
            <div key={i} style={{
              padding: '5px 10px', borderRadius: 20, flexShrink: 0,
              background: isActive
                ? 'rgba(200,169,110,0.12)'
                : isComplete ? 'rgba(52,199,89,0.08)' : '#161616',
              border: isActive
                ? '1px solid rgba(200,169,110,0.3)'
                : isComplete ? '1px solid rgba(52,199,89,0.2)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: isActive ? '#C8A96E' : isComplete ? '#34C759' : '#8A8680',
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {exData?.name.split(' ')[0] ?? '?'} {done}/{ex.targetSets}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', gap: 28 }}>
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'left' }}
            >
              {/* Trophy SVG */}
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 20 }}>
                <path d="M24 38v8M16 46h16" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 6h28v18c0 7.732-6.268 14-14 14S10 31.732 10 24V6z"
                  stroke="#C8A96E" strokeWidth="2" strokeLinejoin="round"
                  fill="rgba(200,169,110,0.08)" />
                <path d="M10 10H4c0 8 3 13 6 14" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" />
                <path d="M38 10h6c0 8-3 13-6 14" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h2 style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 36, color: '#F0EDE8', marginBottom: 10,
                lineHeight: 1.1,
              }}>
                Workout<br />Complete.
              </h2>
              <p style={{
                fontSize: 13, color: '#8A8680', marginBottom: 16,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                {formatElapsed(elapsed)} · {exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0)} sets
              </p>
              <p style={{
                fontSize: 32, fontWeight: 700, color: '#C8A96E',
                fontFamily: '"Outfit", system-ui, sans-serif',
                letterSpacing: '-1px',
              }}>
                {exercises
                  .reduce((sum, e) => sum + e.sets.filter(s => s.completed).reduce((v, s) => v + s.weight * s.reps, 0), 0)
                  .toFixed(0)}
                <span style={{ fontSize: 16, color: '#8A8680', letterSpacing: 0, marginLeft: 4 }}>kg lifted</span>
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              <div style={{ marginBottom: 6 }}>
                <p style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '1.8px',
                  color: '#8A8680', marginBottom: 10,
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  fontWeight: 600,
                }}>
                  {currentExIdx + 1} / {exercises.length}
                </p>
                <h2 style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 34, color: '#F0EDE8', lineHeight: 1.1,
                  marginBottom: 6,
                }}>
                  {exercise?.name ?? currentEx?.exerciseId}
                </h2>
              </div>

              <p style={{
                fontSize: 13, color: '#8A8680', marginBottom: 20,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                Set {setsCompleted + 1} of {currentEx?.targetSets} · {currentEx?.targetReps} reps
              </p>

              {/* Set circles */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                {Array.from({ length: currentEx?.targetSets ?? 0 }).map((_, i) => {
                  const done = i < setsCompleted
                  const active = i === setsCompleted
                  return (
                    <div key={i} style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: done ? '#C8A96E' : active ? 'rgba(200,169,110,0.1)' : '#1E1E1E',
                      border: done ? 'none' : active ? '2px solid #C8A96E' : '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="#0C0C0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: active ? '#C8A96E' : '#8A8680',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                        }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Weight stepper */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 10, color: '#8A8680', marginBottom: 12,
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                  fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600,
                }}>
                  Weight
                </p>
                <WeightStepper
                  weight={currentEx?.currentWeight ?? 0}
                  onChange={(w) => currentEx && adjustWeight(currentEx.exerciseId, w - currentEx.currentWeight)}
                />
              </div>

              {/* Reps */}
              <div>
                <p style={{
                  fontSize: 10, color: '#8A8680', marginBottom: 12,
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                  fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600,
                }}>
                  Reps
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <button
                    onClick={() => setReps(Math.max(1, reps - 1))}
                    style={bigBtnStyle}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10" stroke="#F0EDE8" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span style={{
                    fontSize: 28, fontWeight: 700, color: '#F0EDE8',
                    minWidth: 64, textAlign: 'center',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    letterSpacing: '-0.5px',
                  }}>
                    {reps}
                  </span>
                  <button
                    onClick={() => setReps(reps + 1)}
                    style={bigBtnStyle}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="#F0EDE8" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        {isDone ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleComplete}
            style={primaryBtnStyle}
          >
            Save & Exit
          </motion.button>
        ) : phase !== 'rest' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => markSetComplete(reps)}
            style={primaryBtnStyle}
          >
            Complete Set {setsCompleted + 1}
          </motion.button>
        )}
      </div>

      {/* Abandon dialog */}
      <AnimatePresence>
        {showAbandon && (
          <motion.div
            key="abandon-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 300, padding: 24,
            }}
          >
            <motion.div
              key="abandon"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background: 'rgba(22,22,22,0.98)',
                backdropFilter: 'blur(40px)',
                borderRadius: 22, padding: 28,
                width: '100%', maxWidth: 320,
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <h3 style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 24, color: '#F0EDE8', marginBottom: 8,
              }}>
                End workout?
              </h3>
              <p style={{
                fontSize: 14, color: '#8A8680', marginBottom: 24,
                fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.5,
              }}>
                Your progress will not be saved.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAbandon(false)}
                  style={{
                    flex: 1, height: 48,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 14, color: '#F0EDE8',
                    fontSize: 14, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                >
                  Keep Going
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAbandon}
                  style={{
                    flex: 1, height: 48,
                    background: '#FF453A', border: 'none',
                    borderRadius: 14, color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                >
                  End
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const bigBtnStyle: React.CSSProperties = {
  width: 48, height: 48,
  background: '#1E1E1E',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  color: '#F0EDE8',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', height: 56,
  background: '#C8A96E', border: 'none',
  borderRadius: 18, color: '#0C0C0C',
  fontSize: 16, fontWeight: 700, cursor: 'pointer',
  fontFamily: '"Outfit", system-ui, sans-serif',
  letterSpacing: '-0.2px',
  WebkitTapHighlightColor: 'transparent',
}
