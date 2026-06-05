import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Layout from './components/Layout'
import Home from './screens/Home'
import Library from './screens/Library'
import Builder from './screens/Builder'
import ActiveWorkout from './screens/ActiveWorkout'
import Progress from './screens/Progress'
import Settings from './screens/Settings'
import Onboarding from './screens/Onboarding'
import Toaster from './components/Toaster'
import UpdatePrompt from './components/UpdatePrompt'
import { useAppStore } from './store/useAppStore'
import { useSyncStore } from './store/useSyncStore'
import { anim } from './lib/theme'

// Tab order drives the direction of the slide between tabs (left → right).
const TAB_ORDER = ['/', '/library', '/builder', '/progress', '/settings']

function PageFade() {
  const location = useLocation()
  const reduce = useReducedMotion()
  // Track the previous path in state (updated during render — React's sanctioned
  // derive-during-render pattern) so we can compute slide direction without
  // reading a ref during render.
  const [prev, setPrev] = useState({ path: location.pathname, dir: 1 })
  if (prev.path !== location.pathname) {
    const prevIdx = TAB_ORDER.indexOf(prev.path)
    const currIdx = TAB_ORDER.indexOf(location.pathname)
    setPrev({ path: location.pathname, dir: currIdx >= prevIdx ? 1 : -1 })
  }
  const dir = prev.dir

  // Directional slide + fade. Exit actually moves now (it used to exit at full
  // opacity, which read as a flash). Reduced motion collapses to a plain fade.
  const variants = {
    initial: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 24 }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -24 }),
  }

  return (
    <AnimatePresence mode="sync" custom={dir}>
      <motion.div
        key={location.pathname}
        custom={dir}
        style={{ height: '100%', position: 'absolute', inset: 0 }}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={anim.enter}
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

  // Coarse key so tab↔tab keeps Layout (and the portaled nav) mounted and is
  // animated by PageFade, while switching to/from the full-screen routes
  // (/active, /onboarding) is animated by this outer AnimatePresence — which is
  // what lets ActiveWorkout play its slide-down exit. Pinning `location` keeps
  // the outgoing route matched while it animates out.
  const routeKey =
    location.pathname === '/active' ? 'active'
    : location.pathname === '/onboarding' ? 'onboarding'
    : 'app'

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={routeKey}>
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
    </AnimatePresence>
  )
}

function AutoSync() {
  const autoSync = useSyncStore((s) => s.autoSync)
  useEffect(() => {
    // Sync on first mount (app open)
    autoSync()
    // Sync whenever the app comes back to the foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') autoSync()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [autoSync])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AutoSync />
      <AnimatedRoutes />
      <Toaster />
      <UpdatePrompt />
    </BrowserRouter>
  )
}
