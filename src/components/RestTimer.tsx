import { useEffect, useRef } from 'react'

interface Props {
  remaining: number
  total: number
  startAt: number
  onSkip: () => void
}

export default function RestTimer({ remaining, total, startAt, onSkip }: Props) {
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const circleRef = useRef<SVGCircleElement>(null)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  // Drive the ring continuously off the wall clock via rAF so it stays perfectly
  // in sync with the once-per-second digits. The old approach eased a 1s CSS
  // transition toward an integer that stepped every second, so the ring always
  // trailed the number by up to a full second.
  useEffect(() => {
    let raf: number
    const update = () => {
      const elapsed = (Date.now() - startAt) / 1000
      const frac = total > 0 ? Math.max(0, Math.min(1, (total - elapsed) / total)) : 0
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = String(circumference * (1 - frac))
      }
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [startAt, total, circumference])

  const initialFrac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <p style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        color: '#8A8680',
        fontFamily: '"Outfit", system-ui, sans-serif',
        fontWeight: 600,
      }}>
        Rest
      </p>

      <div style={{ position: 'relative', width: 152, height: 152 }}>
        <svg width={152} height={152} viewBox="0 0 152 152" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={76} cy={76} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={6}
          />
          <circle
            ref={circleRef}
            cx={76} cy={76} r={radius}
            fill="none"
            stroke="#C8A96E"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: circumference * (1 - initialFrac) }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2,
        }}>
          <span style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#F0EDE8',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: '"Outfit", system-ui, sans-serif',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
          </span>
          <span style={{
            fontSize: 10,
            color: '#8A8680',
            fontFamily: '"Outfit", system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {mins === 0 ? 'sec' : 'min'}
          </span>
        </div>
      </div>

      <button
        onClick={onSkip}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          color: '#8A8680',
          fontSize: 13,
          fontWeight: 500,
          padding: '12px 32px',
          cursor: 'pointer',
          fontFamily: '"Outfit", system-ui, sans-serif',
          letterSpacing: '0.3px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Skip Rest
      </button>
    </div>
  )
}
