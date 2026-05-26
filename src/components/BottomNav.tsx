import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
  { to: '/builder', label: 'Build', icon: BuildIcon },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function BottomNav() {
  const activeSession = useWorkoutStore((s) => s.activeSession)
  const navigate = useNavigate()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(12,12,12,0.88)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        zIndex: 50,
      }}
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <motion.div
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                paddingTop: 12,
                paddingBottom: 4,
                position: 'relative',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 2,
                    background: '#C8A96E',
                    borderRadius: 1,
                  }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                />
              )}
              <Icon active={isActive} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#C8A96E' : '#8A8680',
                  letterSpacing: '0.3px',
                  fontFamily: '"Outfit", system-ui, sans-serif',
                }}
              >
                {label}
              </span>
            </motion.div>
          )}
        </NavLink>
      ))}

      {activeSession && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={() => navigate('/active')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            paddingTop: 12,
            paddingBottom: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#C8A96E',
              position: 'absolute',
              top: 10,
              right: 'calc(50% - 18px)',
            }}
          />
          <LiveIcon />
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#C8A96E',
            fontFamily: '"Outfit", system-ui, sans-serif',
          }}>
            Live
          </span>
        </motion.button>
      )}
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
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
  const c = active ? '#C8A96E' : '#8A8680'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="16" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
      <rect x="14" y="4" width="6" height="9" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
      <rect x="14" y="16" width="6" height="4" rx="1" stroke={c} strokeWidth={1.6} fill={active ? 'rgba(200,169,110,0.12)' : 'none'} />
    </svg>
  )
}

function BuildIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  )
}

function ProgressIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
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
  const c = active ? '#C8A96E' : '#8A8680'
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

function LiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 4l13 8-13 8V4z" fill="#C8A96E" />
    </svg>
  )
}
