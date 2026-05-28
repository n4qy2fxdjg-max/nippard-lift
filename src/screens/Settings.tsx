import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { useSyncStore } from '../store/useSyncStore'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { format } from 'date-fns'

type SyncView = 'idle' | 'creating' | 'joining'

export default function Settings() {
  const { userName, unit, setUserName, setUnit } = useAppStore()
  const { syncCode, lastSyncAt, isSyncing, syncError, createSync, verifyAndJoin, pullSync, clearSync, clearError } = useSyncStore()
  const logs = useWorkoutStore((s) => s.logs)

  // Profile form — uncontrolled input avoids iOS Safari dropping controlled values
  const nameRef = useRef<HTMLInputElement>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  // Sync view
  const [syncView, setSyncView] = useState<SyncView>('idle')
  const [codeInput, setCodeInput] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function saveProfile() {
    const val = nameRef.current?.value?.trim() || 'You'
    setUserName(val)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 1800)
  }

  async function handleCreate() {
    try {
      const code = await createSync()
      setGeneratedCode(code)
    } catch (_) {}
  }

  async function handleJoin() {
    if (!codeInput.trim()) return
    clearError()
    try {
      await verifyAndJoin(codeInput)
      setSyncView('idle')
      setCodeInput('')
    } catch (_) {}
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const displayCode = syncCode ?? generatedCode

  // Stats
  const totalSets = logs.reduce((sum, l) => sum + l.exerciseResults.reduce((s, e) => s + e.sets.length, 0), 0)
  const totalVolume = logs.reduce((sum, l) => sum + l.totalVolume, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      <div className="scroll-y" style={{ flex: 1, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ padding: 'max(30px, env(safe-area-inset-top)) 24px 28px' }}>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 40, color: '#F0EDE8', lineHeight: 1.1, letterSpacing: '-0.5px',
          }}>
            <em style={{ fontStyle: 'italic', color: '#8A8680', fontSize: 26, display: 'block', lineHeight: 1.3, marginBottom: 2 }}>
              Your
            </em>
            Settings.
          </h1>
        </div>

        {/* ── Profile ─────────────────────────────────────────────────── */}
        <Section label="Profile">
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Name</FieldLabel>
            <input
              key={userName}
              ref={nameRef}
              defaultValue={userName}
              placeholder="Your name"
              maxLength={24}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Weight unit</FieldLabel>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['kg', 'lb'] as const).map((u) => (
                <motion.button
                  key={u}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setUnit(u)}
                  style={{
                    flex: 1, padding: '14px 0',
                    background: unit === u ? 'rgba(200,169,110,0.12)' : '#161616',
                    border: `2px solid ${unit === u ? '#C8A96E' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    fontSize: 18, fontWeight: 700,
                    color: unit === u ? '#C8A96E' : '#8A8680',
                    transition: 'all 0.18s ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {u}
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {profileSaved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  height: 50, borderRadius: 14,
                  background: 'rgba(52,199,89,0.1)',
                  border: '1px solid rgba(52,199,89,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#34C759',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                }}
              >
                Saved
              </motion.div>
            ) : (
              <motion.button
                key="save"
                whileTap={{ scale: 0.97 }}
                onClick={saveProfile}
                style={{
                  width: '100%', height: 50,
                  background: '#F0EDE8', border: 'none',
                  borderRadius: 14, color: '#0C0C0C',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Save Profile
              </motion.button>
            )}
          </AnimatePresence>
        </Section>

        {/* ── Sync ────────────────────────────────────────────────────── */}
        <Section label="Sync">
          <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 20, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
            Share your history across devices. One code, everything in sync.
          </p>

          {syncError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(255,59,48,0.08)',
                border: '1px solid rgba(255,59,48,0.2)',
                borderRadius: 12, padding: '10px 14px',
                marginBottom: 14, fontSize: 13, color: '#FF3B30',
                fontFamily: '"Outfit", system-ui, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              {syncError}
              <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30', padding: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Active sync code ── */}
            {displayCode && syncView === 'idle' && (
              <motion.div key="code-active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Code display */}
                <div style={{
                  background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '20px',
                  marginBottom: 12,
                }}>
                  <p style={{ fontSize: 10, color: '#8A8680', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                    Your sync code
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: '"Outfit", system-ui, sans-serif', fontSize: 36, fontWeight: 700, color: '#C8A96E', letterSpacing: '5px' }}>
                      {displayCode}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => handleCopy(displayCode)}
                      style={{
                        background: copied ? 'rgba(52,199,89,0.1)' : '#1E1E1E',
                        border: `1px solid ${copied ? 'rgba(52,199,89,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 10, padding: '8px 14px',
                        fontSize: 12, fontWeight: 600,
                        color: copied ? '#34C759' : '#F0EDE8',
                        cursor: 'pointer',
                        fontFamily: '"Outfit", system-ui, sans-serif',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </motion.button>
                  </div>
                  {lastSyncAt && (
                    <p style={{ fontSize: 11, color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                      Last synced {format(new Date(lastSyncAt), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>

                {/* Sync now */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pullSync()}
                  disabled={isSyncing}
                  style={{
                    width: '100%', height: 50,
                    background: '#C8A96E', border: 'none',
                    borderRadius: 14, color: '#0C0C0C',
                    fontSize: 14, fontWeight: 700, cursor: isSyncing ? 'not-allowed' : 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    marginBottom: 10, opacity: isSyncing ? 0.6 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isSyncing ? (
                    <>
                      <SpinnerIcon /> Syncing…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 2v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12a9 9 0 0115-6.7L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M3 22v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12a9 9 0 01-15 6.7L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      Sync Now
                    </>
                  )}
                </motion.button>

                {/* Disconnect */}
                <button
                  onClick={clearSync}
                  style={{
                    width: '100%', height: 46,
                    background: 'transparent',
                    border: '1px solid rgba(255,59,48,0.2)',
                    borderRadius: 14, color: '#FF3B30',
                    fontSize: 13, cursor: 'pointer',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Disconnect Sync
                </button>
              </motion.div>
            )}

            {/* ── No sync yet: setup options ── */}
            {!displayCode && syncView === 'idle' && (
              <motion.div key="no-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSyncView('creating')}
                  style={{ ...ctaBtn, background: '#F0EDE8', color: '#0C0C0C', marginBottom: 10 }}
                >
                  Set up sync — get a code
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSyncView('joining')}
                  style={{ ...ctaBtn, background: 'transparent', border: '1px solid rgba(200,169,110,0.3)', color: '#C8A96E' }}
                >
                  Join with a code
                </motion.button>
              </motion.div>
            )}

            {/* ── Creating flow ── */}
            {syncView === 'creating' && (
              <motion.div key="creating" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <BackButton onClick={() => setSyncView('idle')} />
                <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 24, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
                  Your workout history will upload and you'll get a unique code to share.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={isSyncing}
                  style={{ ...ctaBtn, background: '#C8A96E', color: '#0C0C0C', opacity: isSyncing ? 0.6 : 1 }}
                >
                  {isSyncing ? <><SpinnerIcon /> Uploading…</> : 'Generate my code'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Joining flow ── */}
            {syncView === 'joining' && (
              <motion.div key="joining" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <BackButton onClick={() => { setSyncView('idle'); setCodeInput(''); clearError() }} />
                <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 20, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
                  Enter the code from the other device.
                </p>
                <input
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); clearError() }}
                  placeholder="e.g. ZAI-482"
                  maxLength={7}
                  style={{
                    ...inputStyle,
                    fontSize: 26, fontWeight: 700,
                    letterSpacing: '5px', textAlign: 'center',
                    color: '#C8A96E', marginBottom: 12,
                    borderColor: syncError ? 'rgba(255,59,48,0.4)' : 'rgba(255,255,255,0.09)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
                  onBlur={(e) => { if (!syncError) e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleJoin}
                  disabled={isSyncing || !codeInput.trim()}
                  style={{
                    ...ctaBtn,
                    background: codeInput.trim() ? '#C8A96E' : '#1A1A1A',
                    color: codeInput.trim() ? '#0C0C0C' : '#8A8680',
                    opacity: isSyncing ? 0.6 : 1,
                  }}
                >
                  {isSyncing ? <><SpinnerIcon /> Joining…</> : 'Join & Sync'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <Section label="Lifetime Stats">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard label="Workouts" value={String(logs.length)} />
            <StatCard label="Total Sets" value={String(totalSets)} />
            <StatCard
              label="Volume Lifted"
              value={unit === 'lb'
                ? `${Math.round(totalVolume * 2.20462).toLocaleString()} lb`
                : `${totalVolume.toLocaleString()} kg`
              }
              wide
            />
          </div>
        </Section>

      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 24px', marginBottom: 36 }}>
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1.5px', color: '#8A8680',
        fontFamily: '"Outfit", system-ui, sans-serif',
        marginBottom: 16,
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, color: '#C8A96E', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.8px',
      marginBottom: 8, fontFamily: '"Outfit", system-ui, sans-serif',
    }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{
      background: '#161616', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '16px',
      gridColumn: wide ? '1 / -1' : undefined,
    }}>
      <p style={{ fontSize: 10, color: '#8A8680', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontFamily: '"Outfit", system-ui, sans-serif' }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#F0EDE8', letterSpacing: '-0.5px', fontFamily: '"Outfit", system-ui, sans-serif' }}>
        {value}
      </p>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer',
        fontSize: 13, fontFamily: '"Outfit", system-ui, sans-serif',
        padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Back
    </button>
  )
}

function SpinnerIcon() {
  return (
    <motion.svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <path d="M12 2a10 10 0 010 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </motion.svg>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  background: '#161616',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
  fontFamily: '"Outfit", system-ui, sans-serif',
  fontSize: 17, color: '#F0EDE8',
  outline: 'none', boxSizing: 'border-box',
  WebkitAppearance: 'none',
  display: 'block',
}

const ctaBtn: React.CSSProperties = {
  width: '100%', height: 54, border: 'none',
  borderRadius: 14, fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
  WebkitTapHighlightColor: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}
