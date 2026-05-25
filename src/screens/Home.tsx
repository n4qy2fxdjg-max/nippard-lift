import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { useBuilderStore } from '../store/useBuilderStore'
import { featuredPrograms } from '../data/programs'
import WorkoutCard from '../components/WorkoutCard'
import StreakChip from '../components/StreakChip'
import { isWithinInterval, subWeeks, parseISO, startOfDay } from 'date-fns'

function greeting(name: string): string {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function computeStreak(logs: { date: string }[]): number {
  if (logs.length === 0) return 0
  let streak = 0
  const now = new Date()
  for (let w = 0; w < 52; w++) {
    const start = startOfDay(subWeeks(now, w + 1))
    const end = startOfDay(subWeeks(now, w))
    const hasSession = logs.some((l) =>
      isWithinInterval(parseISO(l.date), { start, end })
    )
    if (hasSession) streak++
    else break
  }
  return streak
}

export default function Home() {
  const userName = useAppStore((s) => s.userName)
  const logs = useWorkoutStore((s) => s.logs)
  const plans = useBuilderStore((s) => s.plans)
  const startSession = useWorkoutStore((s) => s.startSession)
  const navigate = useNavigate()

  const streak = useMemo(() => computeStreak(logs), [logs])

  function lastPerformed(programId: string): string | undefined {
    return logs.find((l) => l.planId === programId)?.date
  }

  function startCustomPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    startSession(planId, plan.name, plan.items.map((item) => ({
      exerciseId: item.exerciseId,
      targetSets: item.sets,
      targetReps: String(item.reps),
      currentWeight: item.weightKg,
      sets: [],
    })))
    navigate('/active')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      <div className="scroll-y" style={{ flex: 1, paddingBottom: 90 }}>
        {/* Header */}
        <div style={{ padding: 'max(54px, env(safe-area-inset-top)) 24px 20px' }}>
          <h1 style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 30,
            color: '#F0EDE8',
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            {greeting(userName)}
          </h1>
          <StreakChip streak={streak} />
        </div>

        {/* Featured Programs */}
        <div style={{ paddingLeft: 24, marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 14 }}>
            Programmes
          </p>
          <div className="scroll-x" style={{ display: 'flex', gap: 12, paddingRight: 24 }}>
            {featuredPrograms.map((p) => (
              <WorkoutCard key={p.id} program={p} lastDate={lastPerformed(p.id)} />
            ))}
          </div>
        </div>

        {/* Saved Plans */}
        {plans.length > 0 && (
          <div style={{ padding: '0 24px' }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8680', marginBottom: 14 }}>
              My Plans
            </p>
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => startCustomPlan(plan.id)}
                style={{
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.opacity = '' }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '' }}
              >
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>{plan.name}</p>
                  <p style={{ fontSize: 12, color: '#8A8680', marginTop: 3 }}>{plan.items.length} exercises</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#C8A96E', fontWeight: 600 }}>Start →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {plans.length === 0 && (
          <div style={{ padding: '0 24px' }}>
            <div style={{
              background: '#161616',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '24px 20px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, color: '#8A8680' }}>Build your first custom plan in the Builder tab</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
