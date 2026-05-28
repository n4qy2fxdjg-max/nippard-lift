import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      margin: '0 auto',
      width: '100%',
      maxWidth: 430,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#0C0C0C',
    }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>
      {/* Reserves space so content area sizes correctly even though nav is fixed */}
      <div style={{
        height: 'calc(61px + max(8px, env(safe-area-inset-bottom)))',
        flexShrink: 0,
      }} />
      <BottomNav />
    </div>
  )
}
