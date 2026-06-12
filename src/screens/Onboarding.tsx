import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

const STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const slideTransition = { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const }

export default function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const inputRef = useRef<HTMLInputElement>(null)

  function goTo(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  function finish() {
    completeOnboarding(name, unit)
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0C0C0C',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Progress dots */}
      <div style={{
        position: 'absolute', top: 'max(20px, env(safe-area-inset-top))',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, zIndex: 10,
      }}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === step ? 20 : 6, background: i === step ? '#C8A96E' : 'rgba(255,255,255,0.2)' }}
            transition={{ duration: 0.3 }}
            style={{ height: 6, borderRadius: 3 }}
          />
        ))}
      </div>

      {/* Slides */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence custom={dir} mode="wait">
          {step === 0 && (
            <motion.div
              key="hero"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              style={slideStyle}
            >
              <HeroStep />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="name"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              style={slideStyle}
              onAnimationComplete={() => inputRef.current?.focus()}
            >
              <NameStep name={name} setName={setName} inputRef={inputRef} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="unit"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              style={slideStyle}
            >
              <UnitStep unit={unit} setUnit={setUnit} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="ready"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              style={slideStyle}
            >
              <ReadyStep name={name} unit={unit} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div style={{
        padding: `20px 32px max(32px, env(safe-area-inset-bottom))`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={step < STEPS - 1 ? () => goTo(step + 1) : finish}
          style={{
            width: '100%', padding: '16px 0',
            background: '#C8A96E', borderRadius: 16,
            border: 'none', cursor: 'pointer',
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: 16, fontWeight: 700, color: '#0C0C0C',
            letterSpacing: '-0.2px',
          }}
        >
          {step === 0 ? 'Get Started' : step < STEPS - 1 ? 'Continue' : "Let's Go"}
        </motion.button>

        {step > 0 && (
          <button
            onClick={() => goTo(step - 1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#A8A49E', fontSize: 14,
              fontFamily: '"Outfit", system-ui, sans-serif',
            }}
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}

const slideStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '0 32px',
}

/* ── Step 0: Hero ── */
function HeroStep() {
  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', damping: 18, stiffness: 260 }}
        style={{ marginBottom: 32 }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect width="80" height="80" rx="20" fill="#161616" />
          <rect x="8" y="36" width="64" height="8" rx="4" fill="#C8A96E" />
          <rect x="8" y="32" width="10" height="16" rx="3" fill="#C8A96E" />
          <rect x="62" y="32" width="10" height="16" rx="3" fill="#C8A96E" />
          <rect x="4" y="28" width="8" height="24" rx="3" fill="#C8A96E" />
          <rect x="68" y="28" width="8" height="24" rx="3" fill="#C8A96E" />
        </svg>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 42, color: '#F0EDE8',
          lineHeight: 1.1, marginBottom: 16,
        }}
      >
        Lift
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ fontSize: 16, color: '#A8A49E', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}
      >
        Science-based training. Every session tracked. Every rep counts.
      </motion.p>
    </div>
  )
}

/* ── Step 1: Name ── */
function NameStep({ name, setName, inputRef }: {
  name: string
  setName: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div style={{ width: '100%', maxWidth: 340 }}>
      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', color: '#C8A96E', marginBottom: 12 }}>
        Step 1 of 3
      </p>
      <h2 style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontSize: 34, color: '#F0EDE8',
        lineHeight: 1.15, marginBottom: 10,
      }}>
        What should we call you?
      </h2>
      <p style={{ fontSize: 15, color: '#A8A49E', marginBottom: 32, lineHeight: 1.5 }}>
        We'll use this to personalise your experience.
      </p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={24}
        style={{
          width: '100%', padding: '14px 16px',
          background: '#161616',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontSize: 17, color: '#F0EDE8',
          outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
      <p style={{ fontSize: 12, color: '#A8A49E', marginTop: 10 }}>
        Leave blank and we'll call you "You"
      </p>
    </div>
  )
}

/* ── Step 2: Unit ── */
function UnitStep({ unit, setUnit }: { unit: 'kg' | 'lb'; setUnit: (u: 'kg' | 'lb') => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 340 }}>
      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', color: '#C8A96E', marginBottom: 12 }}>
        Step 2 of 3
      </p>
      <h2 style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontSize: 34, color: '#F0EDE8',
        lineHeight: 1.15, marginBottom: 10,
      }}>
        Your preferred unit?
      </h2>
      <p style={{ fontSize: 15, color: '#A8A49E', marginBottom: 32, lineHeight: 1.5 }}>
        Used for weight tracking across the app. You can change this later.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        {(['kg', 'lb'] as const).map((u) => (
          <motion.button
            key={u}
            whileTap={{ scale: 0.96 }}
            onClick={() => setUnit(u)}
            style={{
              flex: 1, padding: '20px 0',
              background: unit === u ? 'rgba(200,169,110,0.12)' : '#161616',
              border: `2px solid ${unit === u ? '#C8A96E' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16, cursor: 'pointer',
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontSize: 22, fontWeight: 700,
              color: unit === u ? '#C8A96E' : '#A8A49E',
              transition: 'all 0.18s ease',
            }}
          >
            {u}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ── Step 3: Ready ── */
function ReadyStep({ name, unit }: { name: string; unit: 'kg' | 'lb' }) {
  const displayName = name.trim() || 'You'
  const programs = [
    { label: 'Push', color: '#4DABF7', exercises: 6 },
    { label: 'Pull', color: '#C084FC', exercises: 6 },
    { label: 'Legs', color: '#4ADE80', exercises: 6 },
    { label: 'Upper', color: '#FBBF24', exercises: 6 },
    { label: 'Lower', color: '#FB923C', exercises: 7 },
    { label: 'Full Body', color: '#2DD4BF', exercises: 7 },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 340 }}>
      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', color: '#C8A96E', marginBottom: 12 }}>
        Step 3 of 3
      </p>
      <h2 style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontSize: 34, color: '#F0EDE8',
        lineHeight: 1.15, marginBottom: 10,
      }}>
        Ready, {displayName}.
      </h2>
      <p style={{ fontSize: 15, color: '#A8A49E', marginBottom: 28, lineHeight: 1.5 }}>
        57 exercises · 6 programmes · weights in {unit}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {programs.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 + 0.1 }}
            style={{
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '14px 14px 12px',
            }}
          >
            <div style={{
              display: 'inline-block',
              background: p.color + '22',
              border: `1px solid ${p.color}44`,
              borderRadius: 12, padding: '2px 8px',
              fontSize: 11, fontWeight: 700, color: p.color,
              marginBottom: 8,
            }}>
              {p.label}
            </div>
            <p style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 600 }}>{p.exercises} exercises</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
