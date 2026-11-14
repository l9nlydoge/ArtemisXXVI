import { useEffect, useState } from 'react'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

const StepMs = 700

export function FlightScreen() {
  const translator = useTranslator()
  const { result, finishFlight } = useGameStore()
  const [shown, setShown] = useState(0)
  const events = result?.events ?? []
  const horizon = Math.max(1, result?.design.designLifeYears ?? 1)

  useEffect(() => {
    if (shown >= events.length) {
      const done = window.setTimeout(finishFlight, StepMs * 1.5)
      return () => window.clearTimeout(done)
    }
    const next = window.setTimeout(() => setShown(shown + 1), StepMs)
    return () => window.clearTimeout(next)
  }, [shown, events.length, finishFlight])

  if (!result) return null
  const latest = events[Math.max(0, shown - 1)]
  const progress = latest ? Math.min(100, (latest.year / horizon) * 100) : 0

  return (
    <main className="FlightScreen">
      <h1>{translator.t('Flight.Title')}</h1>
      <div className="Timeline" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="TimelineFill" style={{ width: `${progress}%` }} />
        {events.slice(0, shown).map((event, index) => (
          <span key={index} className={`TimelineTick ${event.isFatal ? 'IsFatal' : ''}`} style={{ left: `${Math.min(100, (event.year / horizon) * 100)}%` }} />
        ))}
      </div>
      <ol className="EventLog" aria-live="polite">
        {events.slice(0, shown).map((event, index) => (
          <li key={index} className={event.isFatal ? 'IsFatal' : ''}>
            <span className="Numeric">{translator.t('Event.Year', { year: Numbers.round(event.year, 1) })}</span>
            <span>{translator.t(`Event.${event.kind}`, event.params)}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="SkipButton" onClick={finishFlight}>»</button>
    </main>
  )
}
