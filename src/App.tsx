import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Home from './screens/Home'
import Library from './screens/Library'
import Builder from './screens/Builder'
import ActiveWorkout from './screens/ActiveWorkout'
import Progress from './screens/Progress'
import Settings from './screens/Settings'
import Onboarding from './screens/Onboarding'
import Toaster from './components/Toaster'
import { useAppStore } from './store/useAppStore'

// Light fade — no horizontal slide, faster duration. Page changes feel snappy on mobile.
const pageTransition = { duration: 0.14, ease: 'easeOut' as const }

function PageFade() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        style={{ height: '100%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={pageTransition}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  const onboarded = useAppStore((s) => s.onboarded)

  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (onboarded && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<PageFade />}>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/active" element={<ActiveWorkout />} />
      <Route path="/onboarding" element={<Onboarding />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Toaster />
    </BrowserRouter>
  )
}
