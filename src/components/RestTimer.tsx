interface Props {
  remaining: number
  total: number
  onSkip: () => void
}

export default function RestTimer({ remaining, total, onSkip }: Props) {
  const fraction = total > 0 ? remaining / total : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - fraction)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8A8680' }}>Rest</p>

      {/* SVG Ring */}
      <div style={{ position: 'relative', width: 128, height: 128 }}>
        <svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={64} cy={64} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          {/* Progress */}
          <circle
            cx={64} cy={64} r={radius}
            fill="none"
            stroke="#C8A96E"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        {/* Countdown */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#F0EDE8', fontVariantNumeric: 'tabular-nums' }}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
          </span>
          {mins === 0 && <span style={{ fontSize: 11, color: '#8A8680' }}>sec</span>}
        </div>
      </div>

      <button
        onClick={onSkip}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          color: '#8A8680',
          fontSize: 13,
          fontWeight: 500,
          padding: '10px 28px',
          cursor: 'pointer',
          letterSpacing: '0.3px',
        }}
      >
        Skip Rest
      </button>
    </div>
  )
}
