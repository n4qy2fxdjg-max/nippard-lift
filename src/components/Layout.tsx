import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100svh',
      overflow: 'hidden',
      background: '#0C0C0C',
    }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
