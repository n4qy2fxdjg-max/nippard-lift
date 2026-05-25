import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useWorkoutStore } from '../store/useWorkoutStore'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
  { to: '/builder', label: 'Build', icon: BuildIcon },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
]

export default function BottomNav() {
  const activeSession = useWorkoutStore((s) => s.activeSession)
  const navigate = useNavigate()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0C0C0C',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                paddingTop: 10,
                paddingBottom: 4,
                position: 'relative',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 2,
                    background: '#C8A96E',
                    borderRadius: 2,
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
                }}
              >
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}

      {/* Live session badge */}
      {activeSession && (
        <button
          onClick={() => navigate('/active')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            paddingTop: 10,
            paddingBottom: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#C8A96E',
              position: 'absolute',
              top: 8,
              right: 'calc(50% - 16px)',
            }}
          />
          <LiveIcon />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#C8A96E' }}>Live</span>
        </button>
      )}
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        stroke={active ? '#C8A96E' : '#8A8680'}
        strokeWidth={1.75}
        strokeLinejoin="round"
        fill={active ? 'rgba(200,169,110,0.15)' : 'none'}
      />
    </svg>
  )
}

function LibraryIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="18" rx="1" stroke={c} strokeWidth={1.75} fill={active ? 'rgba(200,169,110,0.15)' : 'none'} />
      <rect x="14" y="3" width="7" height="11" rx="1" stroke={c} strokeWidth={1.75} fill={active ? 'rgba(200,169,110,0.15)' : 'none'} />
      <rect x="14" y="17" width="7" height="4" rx="1" stroke={c} strokeWidth={1.75} fill={active ? 'rgba(200,169,110,0.15)' : 'none'} />
    </svg>
  )
}

function BuildIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 4V20M4 12H20" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function ProgressIcon({ active }: { active: boolean }) {
  const c = active ? '#C8A96E' : '#8A8680'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polyline points="3,18 9,12 13,16 21,6" stroke={c} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="6" r="2" fill={c} />
    </svg>
  )
}

function LiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 3L19 12L5 21V3Z" fill="#C8A96E" />
    </svg>
  )
}
