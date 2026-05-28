import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { buildWarmupSets } from '../store/useWorkoutStore'
import { useBuilderStore } from '../store/useBuilderStore'
import { featuredPrograms } from '../data/programs'
import WorkoutCard from '../components/WorkoutCard'
import StreakChip from '../components/StreakChip'
import ProgramDetailSheet from '../components/ProgramDetailSheet'
import { isWithinInterval, subWeeks, parseISO, startOfDay, format } from 'date-fns'
import type { Program } from '../types'

function greeting(name: string): { prefix: string; name: string } {
  const h = new Date().getHours()
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return { prefix, name }
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

const listVariants = {
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
}

export default function Home() {
  const userName = useAppStore((s) => s.userName)
  const logs = useWorkoutStore((s) => s.logs)
  const plans = useBuilderStore((s) => s.plans)
  const startSession = useWorkoutStore((s) => s.startSession)
  const navigate = useNavigate()

  const streak = useMemo(() => computeStreak(logs), [logs])
  const { prefix, name } = greeting(userName)
  const today = format(new Date(), 'EEEE, d MMM')

  const [detailProgram, setDetailProgram] = useState<Program | null>(null)

  // Stats: this week's workouts, total volume (last 7d), total sessions
  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    const weekLogs = logs.filter((l) => new Date(l.date) >= weekAgo)
    const weeklyVolume = weekLogs.reduce((sum, l) => sum + (l.totalVolume ?? 0), 0)
    return {
      thisWeek: weekLogs.length,
      volumeKg: Math.round(weeklyVolume),
      totalSessions: logs.length,
    }
  }, [logs])

  const recentLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
  }, [logs])

  function lastPerformed(programId: string): string | undefined {
    return logs.find((l) => l.planId === programId)?.date
  }

  function startCustomPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    startSession(planId, plan.name, plan.items.map((item) => {
      const warmupSets = buildWarmupSets(item.weightKg, item.exerciseId)
      return {
        exerciseId: item.exerciseId,
        targetSets: item.sets,
        targetReps: String(item.reps),
        currentWeight: item.weightKg,
        sets: [],
        warmupSets: warmupSets.length > 0 ? warmupSets : undefined,
      }
    }))
    navigate('/active')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0C0C0C' }}>
      <div className="scroll-y" style={{ flex: 1, paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ padding: 'max(44px, env(safe-area-inset-top)) 24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '1.5px', color: '#8A8680',
                fontFamily: '"Outfit", system-ui, sans-serif', marginBottom: 10,
              }}>
                {today}
              </p>
              <h1 style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 40, color: '#F0EDE8', lineHeight: 1.1, letterSpacing: '-0.5px',
              }}>
                <em style={{ fontStyle: 'italic', color: '#8A8680', fontSize: 26, display: 'block', lineHeight: 1.3, marginBottom: 2 }}>
                  {prefix},
                </em>
                {name}.
              </h1>
            </div>

            {streak > 0 && (
              <div style={{ marginTop: 42 }}>
                <StreakChip streak={streak} />
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, padding: '0 24px', marginBottom: 28 }}>
          {[
            { label: 'this week', value: stats.thisWeek, unit: 'workouts' },
            { label: 'volume', value: stats.volumeKg, unit: 'kg' },
            { label: 'total', value: stats.totalSessions, unit: 'sessions' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '14px 10px',
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 28,
                color: '#F0EDE8',
                lineHeight: 1,
                letterSpacing: '-0.5px',
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 11,
                color: '#C8A96E',
                marginTop: 6,
                fontFamily: '"Outfit", system-ui, sans-serif',
                fontWeight: 500,
              }}>
                {s.unit}
              </div>
              <div style={{
                fontSize: 10,
                color: '#8A8680',
                marginTop: 1,
                fontFamily: '"Outfit", system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick start CTA */}
        <div style={{ padding: '0 24px', marginBottom: 28 }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/builder')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(200,169,110,0.18) 0%, rgba(200,169,110,0.08) 100%)',
              border: '1px solid rgba(200,169,110,0.25)',
              borderRadius: 20,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 20,
                color: '#F0EDE8',
                lineHeight: 1.2,
              }}>
                Build a routine
              </div>
              <div style={{
                fontSize: 13,
                color: '#8A8680',
                marginTop: 3,
                fontFamily: '"Outfit", system-ui, sans-serif',
              }}>
                Pick exercises, set reps, save it
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              background: '#C8A96E',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#0C0C0C" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </motion.button>
        </div>

        {/* Programmes */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ padding: '0 24px', marginBottom: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                Programmes
              </p>
              <em style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(138,134,128,0.5)' }}>
                featured
              </em>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(138,134,128,0.6)', fontFamily: '"Outfit", system-ui, sans-serif' }}>
              {featuredPrograms.length} plans
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 24px' }}>
            {featuredPrograms.map((p) => (
              <WorkoutCard
                key={p.id}
                program={p}
                lastDate={lastPerformed(p.id)}
                onOpen={() => setDetailProgram(p)}
              />
            ))}
          </div>
        </div>

        {/* My Plans */}
        <div style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif', marginBottom: 14 }}>
            My Plans
          </p>

          {plans.length === 0 ? (
            <div style={{ padding: '24px 20px', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#8A8680', fontFamily: '"Outfit", system-ui, sans-serif', lineHeight: 1.6 }}>
                Build your first custom plan in the Builder tab
              </p>
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible" variants={listVariants}>
              {plans.map((plan) => (
                <motion.div key={plan.id} variants={itemVariants}>
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={() => startCustomPlan(plan.id)}
                    style={{
                      background: '#161616', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 16, padding: '16px 18px', marginBottom: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, background: '#C8A96E', borderRadius: '0 2px 2px 0', opacity: 0.7 }} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', fontFamily: '"Outfit", system-ui, sans-serif' }}>
                        {plan.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#8A8680', marginTop: 3, fontFamily: '"Outfit", system-ui, sans-serif' }}>
                        {plan.items.length} exercise{plan.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 4l13 8-13 8V4z" fill="#C8A96E" />
                    </svg>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <div style={{ padding: '0 24px', marginTop: 32 }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#8A8680',
              fontFamily: '"Outfit", system-ui, sans-serif',
              marginBottom: 14,
            }}>
              Recent Activity
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: '#161616',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#F0EDE8',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                    }}>
                      {log.planName}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#8A8680',
                      marginTop: 2,
                      fontFamily: '"Outfit", system-ui, sans-serif',
                    }}>
                      {format(new Date(log.date), 'EEE, d MMM')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 13,
                      color: '#C8A96E',
                      fontFamily: '"Outfit", system-ui, sans-serif',
                      fontWeight: 600,
                    }}>
                      {Math.round(log.durationSec / 60)} min
                    </div>
                    {log.personalRecords?.length > 0 && (
                      <div style={{
                        fontSize: 10,
                        color: '#34C759',
                        marginTop: 2,
                        fontFamily: '"Outfit", system-ui, sans-serif',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {log.personalRecords.length} PR
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Program detail sheet */}
      <ProgramDetailSheet
        program={detailProgram}
        onClose={() => setDetailProgram(null)}
      />
    </div>
  )
}
