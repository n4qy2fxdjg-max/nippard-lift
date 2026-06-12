import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { maxAppWidth, z } from '../lib/theme'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
  { to: '/builder', label: 'Build', icon: BuildIcon },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function BottomNav() {
  const activeSession = useWorkoutStore((s) => s.activeSession)

  return createPortal(
    <>
      {activeSession && <ResumeWorkoutPill planName={activeSession.planName} startedAt={activeSession.startedAt} />}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          margin: '0 auto',
          width: '100%',
          maxWidth: maxAppWidth,
          background: 'rgba(12,12,12,0.88)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-around',
          paddingTop: 8,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          zIndex: z.nav,
        }}
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{ flex: 1, textDecoration: 'none', display: 'flex', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.12 }}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 0',
                  cursor: 'pointer',
                }}
              >
                <Icon active={isActive} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#C8A96E' : '#A8A49E',
                    letterSpacing: '0.3px',
                    fontFamily: '"Outfit", system-ui, sans-serif',
                  }}
                >
                  {label}
                </span>
                {isActive && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#C8A96E',
                    }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </>,
    document.body
  )
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Floating "return to workout" pill above the nav (Apple Music now-playing
 * pattern). Replaces the old sixth "Live" tab, which compressed the other five
 * and shifted every tab's position mid-session.
 */
function ResumeWorkoutPill({ planName, startedAt }: { planName: string; startedAt: number }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/active')}
      aria-label="Resume workout"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        // Centered via auto margins, not translateX — framer-motion owns the
        // transform while animating y/scale and would overwrite it.
        left: 0,
        right: 0,
        margin: '0 auto',
        width: 'fit-content',
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        background: '#C8A96E',
        border: 'none',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
        cursor: 'pointer',
        zIndex: z.nav,
        WebkitTapHighlightColor: 'transparent',
        maxWidth: 'calc(100% - 48px)',
      }}
    >
      <motion.div
        animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
        transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 8, height: 8, borderRadius: '50%', background: '#0C0C0C', flexShrink: 0 }}
      />
      <span style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#0C0C0C',
        fontFamily: '"Outfit", system-ui, sans-serif',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {planName}
      </span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(12,12,12,0.65)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: '"Outfit", system-ui, sans-serif',
        flexShrink: 0,
      }}>
        {formatElapsed(elapsed)}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M6 4l13 8-13 8V4z" fill="#0C0C0C" />
      </svg>
    </motion.button>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#A8A49E'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z"
        stroke={c}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={active ? 'rgba(200,169,110,0.12)' : 'none'}
      />
    </svg>
  )
}

function LibraryIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#A8A49E'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="16" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
      <rect x="14" y="4" width="6" height="9" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
      <rect x="14" y="16" width="6" height="4" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
    </svg>
  )
}

function BuildIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#A8A49E'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  )
}

function ProgressIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#A8A49E'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polyline
        points="3,17 8,11 12.5,15 20,6"
        stroke={c}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#A8A49E'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
