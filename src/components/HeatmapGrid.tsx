import { startOfWeek, subWeeks, addDays, isSameDay, parseISO, format } from 'date-fns'

const WEEKS = 16
const DAYS = 7

function getOpacity(count: number): number {
  if (count === 0) return 0.08
  if (count === 1) return 0.4
  if (count === 2) return 0.7
  return 1
}

interface Props {
  logDates: string[] // ISO date strings
}

export default function HeatmapGrid({ logDates }: Props) {
  const today = new Date()
  const anchor = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 0 })

  const weeks: Date[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const week: Date[] = []
    for (let d = 0; d < DAYS; d++) {
      week.push(addDays(anchor, w * 7 + d))
    }
    weeks.push(week)
  }

  function countForDay(day: Date): number {
    return logDates.filter((iso) => isSameDay(parseISO(iso), day)).length
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 18 }}>
          {dayLabels.map((l, i) => (
            <div key={i} style={{ width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i % 2 === 1 && <span style={{ fontSize: 8, color: '#8A8680' }}>{l}</span>}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Month label */}
            <div style={{ height: 14, display: 'flex', alignItems: 'center' }}>
              {wi === 0 || format(week[0], 'M') !== format(weeks[wi - 1][0], 'M') ? (
                <span style={{ fontSize: 8, color: '#8A8680', whiteSpace: 'nowrap' }}>
                  {format(week[0], 'MMM')}
                </span>
              ) : null}
            </div>
            {/* Day cells */}
            {week.map((day, di) => {
              const count = countForDay(day)
              const isFuture = day > today
              return (
                <div
                  key={di}
                  title={`${format(day, 'MMM d')}: ${count} workout${count !== 1 ? 's' : ''}`}
                  style={{
                    width: 10, height: 10,
                    borderRadius: 2,
                    background: isFuture
                      ? 'rgba(255,255,255,0.03)'
                      : `rgba(200,169,110,${getOpacity(count)})`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
