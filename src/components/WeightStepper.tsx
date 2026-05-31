import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { toWestern } from '../lib/numerals'

const KG_TO_LB = 2.20462
const LB_TO_KG = 1 / KG_TO_LB

interface Props {
  weight: number  // always stored in kg
  onChange: (nextKg: number) => void
}

export default function WeightStepper({ weight, onChange }: Props) {
  const unit = useAppStore((s) => s.unit)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const displayNum = unit === 'lb'
    ? Math.round(weight * KG_TO_LB)
    : (weight % 1 === 0 ? weight : parseFloat(weight.toFixed(2)))

  const step = unit === 'lb' ? LB_TO_KG : 1.0

  function adjust(delta: number) {
    onChange(Math.max(0, parseFloat((weight + delta).toFixed(4))))
  }

  function startEdit() {
    setInputVal(displayNum.toString())
    setEditing(true)
  }

  function commitEdit() {
    const num = parseFloat(inputVal)
    if (!isNaN(num) && num >= 0) {
      const kg = unit === 'lb' ? num * LB_TO_KG : num
      onChange(Math.max(0, parseFloat(kg.toFixed(4))))
    }
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button onClick={() => adjust(-step)} style={btnStyle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10" stroke="#F0EDE8" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      <div
        onClick={!editing ? startEdit : undefined}
        style={{
          minWidth: 80, textAlign: 'center',
          fontFamily: '"Outfit", system-ui, sans-serif',
          cursor: editing ? 'default' : 'text',
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(toWestern(e.target.value))}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
            inputMode="decimal"
            style={{
              width: 64, textAlign: 'center',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid #C8A96E',
              color: '#F0EDE8',
              fontSize: 22, fontWeight: 700,
              outline: 'none',
              fontFamily: '"Outfit", system-ui, sans-serif',
              letterSpacing: '-0.5px',
            }}
          />
        ) : (
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F0EDE8', letterSpacing: '-0.5px' }}>
            {displayNum}
          </span>
        )}
        {!editing && (
          <span style={{ fontSize: 12, color: '#8A8680', marginLeft: 3 }}>{unit}</span>
        )}
      </div>

      <button onClick={() => adjust(step)} style={btnStyle}>
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
