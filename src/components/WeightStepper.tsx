interface Props {
  weight: number
  onChange: (next: number) => void
  step?: number
  min?: number
}

export default function WeightStepper({ weight, onChange, step = 0.25, min = 0 }: Props) {
  function adjust(delta: number) {
    const next = Math.max(min, parseFloat((weight + delta).toFixed(2)))
    onChange(next)
  }

  const display = weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(2)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button
        onClick={() => adjust(-step)}
        style={btnStyle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10" stroke="#F0EDE8" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      <div style={{
        minWidth: 80, textAlign: 'center',
        fontFamily: '"Outfit", system-ui, sans-serif',
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#F0EDE8', letterSpacing: '-0.5px' }}>
          {display}
        </span>
        <span style={{ fontSize: 12, color: '#8A8680', marginLeft: 3 }}>kg</span>
      </div>
      <button
        onClick={() => adjust(step)}
        style={btnStyle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="#F0EDE8" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 48, height: 48,
  background: '#1E1E1E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#F0EDE8',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
}
