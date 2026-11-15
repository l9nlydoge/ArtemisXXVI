import { useRef } from 'react'
interface MeterProps {
  label: string
  value: number
  max: number
  text: string
  tone?: 'Plain' | 'Foil' | 'Danger' | 'Good'
  ghost?: number
  note?: string
}

const MaxCells = 30
const CellStepMs = 45

export function Meter({ label, value, max, text, tone = 'Plain', ghost, note }: MeterProps) {
  const share = (amount: number) => `${Math.max(0, Math.min(100, max <= 0 ? 0 : (amount / max) * 100))}%`
  const cells = Number.isInteger(max) && max > 0 && max <= MaxCells
  const before = useRef(value)
  const filledFrom = useRef(value)
  if (value !== before.current) {
    filledFrom.current = value > before.current ? before.current : value
    before.current = value
  }
  const cellDelay = (at: number) => (at >= filledFrom.current && at < value ? { transitionDelay: `${(at - filledFrom.current) * CellStepMs}ms` } : undefined)
  const cellState = (at: number) => (at < value ? 'IsFull' : ghost !== undefined && at < ghost ? 'IsGhost' : '')
  return (
    <div className={`Meter Is${tone}`}>
      <div className="MeterHead">
        <span className="MeterLabel">{label}</span>
        <span className="MeterText">{text}</span>
      </div>
      <div className={`MeterTrack ${cells ? 'IsCells' : ''}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, Math.min(max, value))} aria-valuetext={text}>
        {cells
          ? Array.from({ length: max }, (_, at) => <div key={at} className={`MeterCell ${cellState(at)}`} style={cellDelay(at)} />)
          : (
            <>
              {ghost !== undefined && <div className="MeterGhost" style={{ width: share(ghost) }} />}
              <div className="MeterFill" style={{ width: share(value) }} />
            </>
          )}
      </div>
      {note && <p className="MeterNote">{note}</p>}
    </div>
  )
}
