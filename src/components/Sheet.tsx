import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'
import { createPortal } from 'react-dom'
import { colors, z, anim, maxAppWidth } from '../lib/theme'
import { useKeyboardInset } from '../lib/useKeyboardInset'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Optional top accent strip color (e.g. a programme's tag colour). */
  accent?: string
  /** 0 = base sheet, 1 = a sheet stacked on top of another (e.g. the swap picker). */
  level?: number
  /** Explicit stacking override — needed above full-screen routes (z.fullscreen),
      which sit higher than the default sheet band. */
  zIndex?: number
}

/**
 * Single source of truth for bottom sheets. Replaces four hand-rolled copies
 * that had drifted apart (different backgrounds, backdrops, z-index, close
 * buttons). Drag-to-dismiss is wired to the handle only — via dragControls —
 * so it never fights a scrollable list inside the sheet.
 *
 * The panel lifts above the iOS software keyboard (visualViewport inset) so
 * inputs and the footer CTA stay reachable, closes on Escape, and carries
 * dialog semantics with focus moved in on open and restored on close.
 */
export default function Sheet({ open, onClose, children, accent, level = 0, zIndex }: SheetProps) {
  const dragControls = useDragControls()
  const baseZ = zIndex ?? z.sheetBackdrop + level * 2
  const keyboardInset = useKeyboardInset()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Close on Escape (hardware keyboards / iPad).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Move focus into the dialog on open; restore it on close so VoiceOver
  // doesn't land in the obscured page behind the overlay.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      panelRef.current?.focus({ preventScroll: true })
    } else {
      restoreFocusRef.current?.focus?.({ preventScroll: true })
      restoreFocusRef.current = null
    }
  }, [open])

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
            aria-hidden="true"
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: baseZ,
              // Swallow pan gestures so they can't chain into the page scroll
              // underneath (iOS scroll bleed-through).
              touchAction: 'none',
              overscrollBehavior: 'contain',
            }}
          />
          <motion.div
            key="sheet-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
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
              // Lift above the software keyboard — iOS doesn't shrink the
              // layout viewport, so a plain bottom: 0 panel gets covered.
              bottom: keyboardInset,
              left: 0, right: 0,
              margin: '0 auto', maxWidth: maxAppWidth,
              background: colors.sheet,
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -20px 60px rgba(0,0,0,0.4)',
              // Flush to the bottom (covers the nav) rather than floating above it;
              // pad for the home indicator so content/footers clear it.
              maxHeight: `calc(100svh - 56px - ${keyboardInset}px)`,
              paddingBottom: keyboardInset > 0 ? 0 : 'env(safe-area-inset-bottom, 0px)',
              transition: 'bottom 0.25s ease, max-height 0.25s ease',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
              outline: 'none',
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
