import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Home from './screens/Home'
import Library from './screens/Library'
import Builder from './screens/Builder'
import ActiveWorkout from './screens/ActiveWorkout'
import Progress from './screens/Progress'

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

const pageTransition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <motion.div
                style={{ height: '100%' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Home />
              </motion.div>
            }
          />
          <Route
            path="/library"
            element={
              <motion.div
                style={{ height: '100%' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Library />
              </motion.div>
            }
          />
          <Route
            path="/builder"
            element={
              <motion.div
                style={{ height: '100%' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Builder />
              </motion.div>
            }
          />
          <Route
            path="/progress"
            element={
              <motion.div
                style={{ height: '100%' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Progress />
              </motion.div>
            }
          />
        </Route>
        <Route path="/active" element={<ActiveWorkout />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
