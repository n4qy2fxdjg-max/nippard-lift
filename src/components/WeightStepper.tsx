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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => adjust(-step)}
        style={{
          width: 36, height: 36,
          background: '#1E1E1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: '#F0EDE8',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 300,
          flexShrink: 0,
        }}
      >−</button>
      <span style={{ minWidth: 60, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>
        {weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(2)} kg
      </span>
      <button
        onClick={() => adjust(step)}
        style={{
          width: 36, height: 36,
          background: '#1E1E1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: '#F0EDE8',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 300,
          flexShrink: 0,
        }}
      >+</button>
    </div>
  )
}
