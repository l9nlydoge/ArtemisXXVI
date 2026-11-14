interface MeterProps {
  label: string
  value: number
  max: number
  text: string
  tone?: 'Plain' | 'Foil' | 'Danger' | 'Good'
  ghost?: number
  note?: string
}

export function Meter({ label, value, max, text, tone = 'Plain', ghost, note }: MeterProps) {
  const share = (amount: number) => `${Math.max(0, Math.min(100, max <= 0 ? 0 : (amount / max) * 100))}%`
  return (
    <div className={`Meter Is${tone}`}>
      <div className="MeterHead">
        <span className="MeterLabel">{label}</span>
        <span className="MeterText">{text}</span>
      </div>
      <div className="MeterTrack" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, Math.min(max, value))} aria-valuetext={text}>
        {ghost !== undefined && <div className="MeterGhost" style={{ width: share(ghost) }} />}
        <div className="MeterFill" style={{ width: share(value) }} />
      </div>
      {note && <p className="MeterNote">{note}</p>}
    </div>
  )
}
