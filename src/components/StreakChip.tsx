interface Props { streak: number }

export default function StreakChip({ streak }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'rgba(200,169,110,0.12)',
      border: '1px solid rgba(200,169,110,0.25)',
      borderRadius: 20,
      padding: '4px 10px',
    }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#C8A96E', letterSpacing: '0.2px' }}>
        {streak} week streak
      </span>
    </div>
  )
}
