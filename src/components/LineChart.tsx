import { useRef, useState, useLayoutEffect, useId } from 'react'
import { motion } from 'framer-motion'

export interface ChartPoint {
  label: string
  value: number
}

interface Props {
  data: ChartPoint[]
  unit?: string
  color?: string
  height?: number
}

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

export default function LineChart({ data, unit = '', color = '#C8A96E', height = 150 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const gradId = 'lc' + useId().replace(/:/g, '')

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8A8680', fontSize: 13, fontStyle: 'italic',
        fontFamily: '"Outfit", system-ui, sans-serif',
      }}>
        No data yet
      </div>
    )
  }

  const padX = 12
  const padTop = 20      // room for the latest-value bubble
  const padBottom = 22   // room for x-axis labels
  const innerW = Math.max(0, w - padX * 2)
  const innerH = height - padTop - padBottom

  const values = data.map((d) => d.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) { min -= 1; max += 1 } // avoid divide-by-zero on a flat series
  const range = max - min

  const xFor = (i: number) =>
    data.length === 1 ? padX + innerW / 2 : padX + (i / (data.length - 1)) * innerW
  const yFor = (v: number) => padTop + (1 - (v - min) / range) * innerH

  const pts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), value: d.value }))
  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const baseY = padTop + innerH
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${baseY.toFixed(1)} L${pts[0].x.toFixed(1)},${baseY.toFixed(1)} Z`
  const last = pts[pts.length - 1]

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* baseline grid */}
          {[0, 0.5, 1].map((t) => {
            const y = padTop + t * innerH
            return (
              <line
                key={t}
                x1={padX} y1={y} x2={w - padX} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1}
              />
            )
          })}

          {/* area fill (only meaningful with >1 point) */}
          {data.length > 1 && <path d={areaPath} fill={`url(#${gradId})`} />}

          {/* line, animated draw */}
          {data.length > 1 && (
            <motion.path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}

          {/* dots */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={i === pts.length - 1 ? 4 : 2.5}
              fill={color}
            />
          ))}

          {/* latest value bubble */}
          <text
            x={data.length > 1 ? Math.min(last.x, w - padX) : last.x}
            y={last.y - 9}
            textAnchor={data.length > 1 ? 'end' : 'middle'}
            fontSize="11" fontWeight="600" fill={color}
            fontFamily='"Outfit", system-ui, sans-serif'
          >
            {fmt(last.value)}{unit}
          </text>

          {/* x-axis labels: first & last */}
          <text
            x={padX} y={height - 6} textAnchor="start"
            fontSize="10" fill="#8A8680"
            fontFamily='"Outfit", system-ui, sans-serif'
          >
            {data[0].label}
          </text>
          {data.length > 1 && (
            <text
              x={w - padX} y={height - 6} textAnchor="end"
              fontSize="10" fill="#8A8680"
              fontFamily='"Outfit", system-ui, sans-serif'
            >
              {data[data.length - 1].label}
            </text>
          )}
        </svg>
      )}
    </div>
  )
}
