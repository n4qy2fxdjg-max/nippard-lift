import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'
import { createPortal } from 'react-dom'
import { colors, z, anim } from '../lib/theme'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Optional top accent strip color (e.g. a programme's tag colour). */
  accent?: string
  /** 0 = base sheet, 1 = a sheet stacked on top of another (e.g. the swap picker). */
  level?: number
}

/**
 * Single source of truth for bottom sheets. Replaces four hand-rolled copies
 * that had drifted apart (different backgrounds, backdrops, z-index, close
 * buttons). Drag-to-dismiss is wired to the handle only — via dragControls —
 * so it never fights a scrollable list inside the sheet.
 */
export default function Sheet({ open, onClose, children, accent, level = 0 }: SheetProps) {
  const dragControls = useDragControls()
  const baseZ = z.sheetBackdrop + level * 2

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: baseZ,
            }}
          />
          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={anim.sheet}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info: PanInfo) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
            style={{
              position: 'fixed',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)',
              left: 0, right: 0,
              margin: '0 auto', maxWidth: 430,
              background: colors.sheet,
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -20px 60px rgba(0,0,0,0.4)',
              maxHeight: 'calc(100svh - env(safe-area-inset-bottom, 0px) - 110px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              zIndex: baseZ + 1,
            }}
          >
            {/* Drag handle — the only region that initiates a dismiss-drag. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{
                padding: '14px 0 12px',
                display: 'flex', justifyContent: 'center',
                flexShrink: 0, cursor: 'grab', touchAction: 'none',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
            </div>

            {accent && (
              <div style={{ height: 3, background: accent, margin: '0 24px 12px', borderRadius: 2, flexShrink: 0 }} />
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
