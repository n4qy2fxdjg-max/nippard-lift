import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import Sheet from './Sheet'
import { ACTIVITY_TYPES, type ActivityType } from '../data/activities'
import { useActivityStore } from '../store/useActivityStore'
import { useToastStore } from '../store/useToastStore'
import type { ActivityIntensity } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LogActivitySheet({ open, onClose }: Props) {
  const addActivity = useActivityStore((s) => s.addActivity)
  const showToast = useToastStore((s) => s.show)

  const [selected, setSelected] = useState<ActivityType | null>(null)
  const [customName, setCustomName] = useState('')
  const [min, setMin] = useState('')
  const [sec, setSec] = useState('')
  const [distance, setDistance] = useState('')
  const [intensity, setIntensity] = useState<ActivityIntensity | undefined>(undefined)
  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  function reset() {
    setSelected(null); setCustomName(''); setMin(''); setSec(''); setDistance('')
    setIntensity(undefined); setCalories(''); setNote(''); setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  function handleClose() {
    onClose()
    setTimeout(reset, 320) // after the sheet's exit animation
  }

  const durationSec = (parseInt(min) || 0) * 60 + (parseInt(sec) || 0)
  const distNum = parseFloat(distance)
  const showDistance = selected?.distance ?? false
  const hasDistance = showDistance && distNum > 0
  const canSave = !!selected && durationSec > 0 && (selected.id !== 'other' || customName.trim().length > 0)

  // Pace, M:SS per km
  let paceLabel: string | null = null
  if (hasDistance) {
    const secPerKm = durationSec / distNum
    const pm = Math.floor(secPerKm / 60)
    const ps = Math.round(secPerKm % 60)
    paceLabel = `${pm}:${String(ps).padStart(2, '0')} /km`
  }

  function save() {
    if (!selected || !canSave) return
    const distanceKm = hasDistance ? parseFloat(distNum.toFixed(3)) : undefined
    const name = selected.id === 'other' ? customName.trim() : selected.name
    addActivity({
      id: nanoid(),
      type: selected.id,
      name,
      date,
      durationSec,
      distanceKm,
      intensity,
      calories: parseInt(calories) || undefined,
      note: note.trim() || undefined,
      updatedAt: Date.now(),
    })
    showToast({ message: `${name} logged` })
    handleClose()
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, padding: '0 20px 14px' }}>

        {!selected ? (
          /* ── Activity picker ── */
          <>
            <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 26, color: '#F0EDE8', marginBottom: 16, lineHeight: 1, flexShrink: 0 }}>
              Log a session
            </h3>
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {ACTIVITY_TYPES.map((a) => (
                  <motion.button
                    key={a.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(a)}
                    style={{
                      background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 16, padding: '16px 8px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{a.emoji}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: '#F0EDE8', fontFamily: '"Outfit", system-ui, sans-serif', textAlign: 'center', lineHeight: 1.15 }}>
                      {a.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Detail form (compact, fits one screen) ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
              <button onClick={() => setSelected(null)} aria-label="Back"
                style={{ background: 'none', border: 'none', color: '#A8A49E', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <span style={{ fontSize: 22 }}>{selected.emoji}</span>
              <h3 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 23, color: '#F0EDE8', lineHeight: 1 }}>
                {selected.id === 'other' ? 'Activity' : selected.name}
              </h3>
            </div>

            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 13, paddingBottom: 4 }}>
              {selected.id === 'other' && (
                <Field label="Name">
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Padel" maxLength={28} style={inputStyle} />
                </Field>
              )}

              <Field label="Duration">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <NumInput value={min} onChange={setMin} placeholder="0" suffix="min" width={108} />
                  <NumInput value={sec} onChange={(v) => setSec(v.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="00" suffix="sec" width={108} />
                </div>
              </Field>

              {showDistance && (
                <Field label="Distance">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NumInput value={distance} onChange={setDistance} placeholder="0.0" suffix="km" decimal />
                    {paceLabel && (
                      <span style={{ fontSize: 13, color: '#C8A96E', fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 600 }}>
                        {paceLabel}
                      </span>
                    )}
                  </div>
                </Field>
              )}

              <Field label="Intensity">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['easy', 'moderate', 'hard'] as const).map((lvl) => {
                    const sel = intensity === lvl
                    return (
                      <button key={lvl} onClick={() => setIntensity(sel ? undefined : lvl)}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 12,
                          background: sel ? 'rgba(200,169,110,0.15)' : '#1A1A1A',
                          border: sel ? '1px solid rgba(200,169,110,0.5)' : '1px solid rgba(255,255,255,0.07)',
                          color: sel ? '#C8A96E' : '#A8A49E', fontSize: 13, fontWeight: sel ? 700 : 400,
                          textTransform: 'capitalize', cursor: 'pointer',
                          fontFamily: '"Outfit", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent',
                        }}>
                        {lvl}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Calories">
                    <NumInput value={calories} onChange={(v) => setCalories(v.replace(/[^0-9]/g, '').slice(0, 5))} placeholder="—" suffix="kcal" />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Date">
                    <input type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, padding: '10px 12px' }} />
                  </Field>
                </div>
              </div>

              <Field label="Note">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={120} style={inputStyle} />
              </Field>
            </div>

            <motion.button
              whileTap={canSave ? { scale: 0.97 } : undefined}
              onClick={save}
              disabled={!canSave}
              style={{
                flexShrink: 0, marginTop: 10, width: '100%', height: 50, borderRadius: 16,
                background: canSave ? '#C8A96E' : '#1A1A1A',
                color: canSave ? '#0C0C0C' : '#A8A49E',
                border: canSave ? 'none' : '1px solid rgba(255,255,255,0.07)',
                fontSize: 16, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: '"Outfit", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Log session
            </motion.button>
          </>
        )}
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#A8A49E', marginBottom: 6, fontFamily: '"Outfit", system-ui, sans-serif' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, placeholder, suffix, decimal, width }: {
  value: string; onChange: (v: string) => void; placeholder: string; suffix: string; decimal?: boolean; width?: number
}) {
  return (
    <div style={{
      ...(width ? { width, flexShrink: 0 } : { flex: 1, minWidth: 0 }),
      display: 'flex', alignItems: 'center', background: '#161616',
      border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '0 14px',
    }}>
      <input
        value={value}
        onChange={(e) => {
          const cleaned = decimal ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value.replace(/[^0-9]/g, '')
          onChange(cleaned)
        }}
        placeholder={placeholder}
        inputMode={decimal ? 'decimal' : 'numeric'}
        size={1}
        style={{ flex: 1, minWidth: 0, width: '100%', background: 'none', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: 18, fontWeight: 600, fontFamily: '"Outfit", system-ui, sans-serif', padding: '11px 0', WebkitAppearance: 'none' }}
      />
      <span style={{ fontSize: 12, color: '#A8A49E', fontFamily: '"Outfit", system-ui, sans-serif', flexShrink: 0 }}>{suffix}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14, padding: '11px 14px', fontSize: 16, color: '#F0EDE8',
  fontFamily: '"Outfit", system-ui, sans-serif', outline: 'none', boxSizing: 'border-box',
  WebkitAppearance: 'none',
}
