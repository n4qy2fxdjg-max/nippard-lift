import LineChart from './LineChart'
import type { WeightHistoryEntry } from '../types'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../store/useAppStore'

const KG_TO_LB = 2.20462

interface Props {
  history: WeightHistoryEntry[]
}

export default function OverloadChart({ history }: Props) {
  const unit = useAppStore((s) => s.unit)

  if (history.length === 0) {
    return (
      <div style={{
        height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A8A49E',
        fontSize: 13,
        fontStyle: 'italic',
        fontFamily: '"Outfit", system-ui, sans-serif',
      }}>
        No data yet — complete this exercise to track progress
      </div>
    )
  }

  const data = history.map((h) => ({
    label: format(parseISO(h.date), 'MMM d'),
    value: unit === 'lb' ? Math.round(h.e1rm * KG_TO_LB) : Math.round(h.e1rm),
  }))

  return (
    <div>
      <p style={{
        fontSize: 11, color: '#A8A49E', marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: '0.8px',
        fontFamily: '"Outfit", system-ui, sans-serif',
      }}>
        Estimated 1RM — {unit}
      </p>
      <LineChart data={data} unit={` ${unit}`} />
    </div>
  )
}
