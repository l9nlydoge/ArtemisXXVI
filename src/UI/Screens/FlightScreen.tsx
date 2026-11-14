import { useEffect, useState } from 'react'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { OrbitDiagram } from '../Visuals/OrbitDiagram'
import { RocketSilhouette } from '../Visuals/RocketSilhouette'
import { SpacecraftDrawing } from '../Visuals/SpacecraftDrawing'

const AscentMs = 2200
const StepMs = 850

export function FlightScreen() {
  const translator = useTranslator()
  const { result, finishFlight } = useGameStore()
  const [ascending, setAscending] = useState(true)
  const [shown, setShown] = useState(0)
  const events = result?.events ?? []
  const horizon = Math.max(1, result?.design.designLifeYears ?? 1)

  useEffect(() => {
    const done = window.setTimeout(() => setAscending(false), AscentMs)
    return () => window.clearTimeout(done)
  }, [])

  useEffect(() => {
    if (ascending) return
    if (shown >= events.length) {
      const done = window.setTimeout(finishFlight, StepMs * 2)
      return () => window.clearTimeout(done)
    }
    const next = window.setTimeout(() => setShown(shown + 1), StepMs)
    return () => window.clearTimeout(next)
  }, [ascending, shown, events.length, finishFlight])

  if (!result) return null
  const design = result.design
  const visible = events.slice(0, shown)
  const latest = visible[visible.length - 1]
  const lost = visible.some((event) => event.isFatal)
  const progress = latest ? Math.min(100, (latest.year / horizon) * 100) : 0

  return (
    <main className="FlightScreen">
      {ascending && (
        <div className="Ascent" aria-hidden="true">
          <RocketSilhouette vehicleId={design.vehicle.id} />
        </div>
      )}
      <div className="FlightLayout">
        <div className="FlightOrbit">
          <OrbitDiagram orbit={design.orbit} copies={design.copies} stations={design.groundStations} label={design.orbit.name} flying lost={lost} />
        </div>
        <div className="FlightSide">
          <h1>{design.scenario.name}</h1>
          <p className="MissionClock">{translator.t('Flight.Clock', { year: Numbers.round(latest?.year ?? 0, 1) })}</p>
          <SpacecraftDrawing design={design} label={translator.t('Stage.Spacecraft')} showScale={false} />
          <div className="Timeline" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="TimelineFill" style={{ width: `${progress}%` }} />
            {visible.map((event, index) => (
              <span key={index} className={`TimelineTick ${event.isFatal ? 'IsFatal' : ''}`} style={{ left: `${Math.min(100, (event.year / horizon) * 100)}%` }} />
            ))}
          </div>
          <ol className="EventLog" aria-live="polite">
            {visible.map((event, index) => (
              <li key={index} className={event.isFatal ? 'IsFatal' : ''}>
                <span className="EventYear">{translator.t('Event.Year', { year: Numbers.round(event.year, 1) })}</span>
                <span>{translator.t(`Event.${event.kind}`, event.params)}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="Quiet" onClick={finishFlight}>{translator.t('Flight.Skip')}</button>
        </div>
      </div>
    </main>
  )
}
