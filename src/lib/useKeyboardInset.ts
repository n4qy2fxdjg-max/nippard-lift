import { useEffect, useState } from 'react'

/**
 * Height (px) of the software keyboard overlapping the layout viewport.
 * On iOS the layout viewport does NOT shrink when the keyboard opens — only
 * window.visualViewport reports the reduced height — so fixed-bottom UI
 * (sheets, onboarding footer) must offset itself by this inset to stay
 * visible above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop
      setInset(Math.max(0, Math.round(covered)))
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}
