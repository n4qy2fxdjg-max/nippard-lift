import { LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { WeightHistoryEntry } from '../types'
import { format, parseISO } from 'date-fns'

interface Props {
  history: WeightHistoryEntry[]
}

export default function OverloadChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div style={{
        height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8A8680',
        fontSize: 13,
        fontStyle: 'italic',
      }}>
        No data yet — complete this exercise to track progress
      </div>
    )
  }

  const data = history.map((h) => ({
    date: format(parseISO(h.date), 'MMM d'),
    e1rm: h.e1rm,
    weight: h.weight,
  }))

  return (
    <div>
      <p style={{ fontSize: 11, color: '#8A8680', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        Estimated 1RM — kg
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#8A8680' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1E1E1E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
              color: '#F0EDE8',
            }}
            itemStyle={{ color: '#C8A96E' }}
            formatter={(val) => [`${val} kg`, 'e1RM']}
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="#C8A96E"
            strokeWidth={2}
            dot={{ fill: '#C8A96E', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#C8A96E' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
