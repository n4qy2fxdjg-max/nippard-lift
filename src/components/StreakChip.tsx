interface Props { streak: number }

export default function StreakChip({ streak }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      borderRadius: 999,
      background: 'rgba(200,169,110,0.12)',
      border: '1px solid rgba(200,169,110,0.22)',
    }}>
      <svg width="16" height="18" viewBox="0 0 13 15" fill="none">
        <path
          d="M6.5 0.5C6.5 0.5 3 4.5 3 8.5a3.5 3.5 0 007 0c0-1.8-.8-3.3-1.7-4.5L6.5.5z"
          fill="#C8A96E"
        />
        <path
          d="M4.5 10c0-1.2.8-2 2-2.5C6 8.8 5.8 9.8 6 10.5"
          stroke="rgba(240,237,232,0.6)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#C8A96E',
        fontFamily: '"Outfit", system-ui, sans-serif',
        letterSpacing: '0.2px',
      }}>
        {streak > 0 ? `${streak}w streak` : 'Start a streak'}
      </span>
    </div>
  )
}
