import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore } from '../store/useSyncStore'
import { format } from 'date-fns'

interface Props {
  open: boolean
  onClose: () => void
}

type View = 'home' | 'create' | 'join'

export default function SyncSheet({ open, onClose }: Props) {
  const { syncCode, lastSyncAt, isSyncing, createSync, joinSync, pullSync, clearSync } = useSyncStore()
  const [view, setView] = useState<View>('home')
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Auto-pull when sheet opens with existing code
  useEffect(() => {
    if (open && syncCode) pullSync()
  }, [open])

  // Reset view when sheet closes
  useEffect(() => {
    if (!open) { setView('home'); setJoinInput(''); setJoinError('') }
  }, [open])

  async function handleCreate() {
    try {
      await createSync()
      setView('home')
    } catch (_) {}
  }

  async function handleJoin() {
    setJoinError('')
    if (!joinInput.trim()) return
    try {
      await joinSync(joinInput)
      setView('home')
    } catch (_) {
      setJoinError(useSyncStore.getState().syncError ?? 'Failed to join')
    }
  }

  function handleCopy() {
    if (!syncCode) return
    navigator.clipboard.writeText(syncCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const syncConfigured = !!(import.meta.env.VITE_SYNC_URL)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sync-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 300,
            }}
          />
          <motion.div
            key="sync-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              background: '#111111',
              borderRadius: '28px 28px 0 0',
              padding: '16px 24px',
              paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
              zIndex: 301,
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

            <AnimatePresence mode="wait">
              {view === 'home' && (
                <motion.div key="view-home" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                  <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 28, color: '#F0EDE8', marginBottom: 6, lineHeight: 1 }}>
                    Sync
                  </h3>
                  <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 28, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.5 }}>
                    Share your workout history across devices.
                  </p>

                  {!syncConfigured && (
                    <div style={{
                      background: 'rgba(251,191,36,0.08)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      borderRadius: 14, padding: '14px 16px', marginBottom: 20,
                    }}>
                      <p style={{ fontSize: 13, color: '#FBBF24', fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.5 }}>
                        Set <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>VITE_SYNC_URL</code> in your <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>.env</code> file to enable sync. Deploy the Worker in <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>workers/sync/</code> first.
                      </p>
                    </div>
                  )}

                  {syncCode ? (
                    <>
                      {/* Current sync code */}
                      <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                        <p style={{ fontSize: 10, color: '#8A8680', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                          Your sync code
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: '"Outfit", system-ui, sans-serif', fontSize: 32, fontWeight: 700, color: '#C8A96E', letterSpacing: '4px' }}>
                            {syncCode}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={handleCopy}
                            style={{
                              background: copied ? 'rgba(52,199,89,0.12)' : '#1E1E1E',
                              border: `1px solid ${copied ? 'rgba(52,199,89,0.25)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 10, padding: '8px 14px',
                              fontSize: 12, fontWeight: 600,
                              color: copied ? '#34C759' : '#F0EDE8',
                              cursor: 'pointer', fontFamily: '"Outfit", system-ui, sans-serif',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </motion.button>
                        </div>
                        {lastSyncAt && (
                          <p style={{ fontSize: 11, color: '#8A8680', marginTop: 10, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                            Last synced {format(new Date(lastSyncAt), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => pullSync()}
                        disabled={isSyncing}
                        style={{
                          width: '100%', height: 50,
                          background: '#C8A96E', border: 'none',
                          borderRadius: 14, color: '#0C0C0C',
                          fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          marginBottom: 10,
                          opacity: isSyncing ? 0.6 : 1,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {isSyncing ? 'Syncing…' : 'Sync Now'}
                      </motion.button>

                      <button
                        onClick={() => { clearSync() }}
                        style={{
                          width: '100%', height: 46,
                          background: 'transparent', border: '1px solid rgba(255,59,48,0.2)',
                          borderRadius: 14, color: '#FF3B30',
                          fontSize: 13, cursor: 'pointer',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        Disconnect Sync
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setView('create')}
                        disabled={!syncConfigured}
                        style={{
                          height: 54, background: syncConfigured ? '#F0EDE8' : '#1A1A1A',
                          border: 'none', borderRadius: 14,
                          color: syncConfigured ? '#0C0C0C' : '#8A8680',
                          fontSize: 15, fontWeight: 700, cursor: syncConfigured ? 'pointer' : 'not-allowed',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        Set up sync — get a code
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setView('join')}
                        disabled={!syncConfigured}
                        style={{
                          height: 54, background: 'transparent',
                          border: `1px solid ${syncConfigured ? 'rgba(200,169,110,0.3)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: 14,
                          color: syncConfigured ? '#C8A96E' : '#8A8680',
                          fontSize: 15, fontWeight: 600, cursor: syncConfigured ? 'pointer' : 'not-allowed',
                          fontFamily: '"Outfit", system-ui, sans-serif',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        Join with a code
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}

              {view === 'create' && (
                <motion.div key="view-create" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                  <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', fontSize: 13, fontFamily: '"Outfit", system-ui, sans-serif', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    Back
                  </button>
                  <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 26, color: '#F0EDE8', marginBottom: 10 }}>
                    Create sync
                  </h3>
                  <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 28, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
                    Your workout history will be uploaded and a unique code generated. Share it with anyone you want to sync with.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreate}
                    disabled={isSyncing}
                    style={{
                      width: '100%', height: 54, background: '#C8A96E',
                      border: 'none', borderRadius: 14, color: '#0C0C0C',
                      fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      opacity: isSyncing ? 0.6 : 1,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {isSyncing ? 'Uploading…' : 'Generate my code'}
                  </motion.button>
                </motion.div>
              )}

              {view === 'join' && (
                <motion.div key="view-join" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                  <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', fontSize: 13, fontFamily: '"Outfit", system-ui, sans-serif', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    Back
                  </button>
                  <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 26, color: '#F0EDE8', marginBottom: 10 }}>
                    Join sync
                  </h3>
                  <p style={{ fontSize: 14, color: '#8A8680', marginBottom: 24, fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
                    Enter the code from the other device to merge and sync histories.
                  </p>
                  <input
                    value={joinInput}
                    onChange={(e) => { setJoinInput(e.target.value.toUpperCase()); setJoinError('') }}
                    placeholder="e.g. ZAI-482"
                    maxLength={7}
                    style={{
                      width: '100%', padding: '16px',
                      background: '#161616',
                      border: `1px solid ${joinError ? 'rgba(255,59,48,0.4)' : 'rgba(255,255,255,0.09)'}`,
                      borderRadius: 14, fontSize: 22, fontWeight: 700,
                      color: '#C8A96E', letterSpacing: '4px',
                      textAlign: 'center',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      outline: 'none', boxSizing: 'border-box',
                      marginBottom: joinError ? 8 : 20,
                      WebkitAppearance: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(200,169,110,0.5)' }}
                    onBlur={(e) => { if (!joinError) e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
                  />
                  {joinError && (
                    <p style={{ fontSize: 12, color: '#FF3B30', marginBottom: 16, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                      {joinError}
                    </p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleJoin}
                    disabled={isSyncing || !joinInput.trim()}
                    style={{
                      width: '100%', height: 54,
                      background: joinInput.trim() ? '#C8A96E' : '#1A1A1A',
                      border: 'none', borderRadius: 14,
                      color: joinInput.trim() ? '#0C0C0C' : '#8A8680',
                      fontSize: 15, fontWeight: 700,
                      cursor: joinInput.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      opacity: isSyncing ? 0.6 : 1,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {isSyncing ? 'Joining…' : 'Join & Sync'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
