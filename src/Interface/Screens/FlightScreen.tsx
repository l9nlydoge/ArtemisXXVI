import { useEffect, useState } from 'react'
import { OrbitClass } from '../../Engine/Catalog/OrbitClass'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { CameraView } from '../../World/CameraView'
import { GraphicsSupport } from '../../World/GraphicsSupport'
import { OrbitDiagram } from '../Diagrams/OrbitDiagram'
import { RocketSilhouette } from '../Diagrams/RocketSilhouette'

const AscentMs = 2200
const FullFlightMs = 11000
const ShortestFlightMs = 4200
const FinaleMs = 3400
const TickMs = 80

export function FlightScreen() {
  const translator = useTranslator()
  const { result, finishFlight, reportFlight } = useGameStore()
  const [ascending, setAscending] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [chosenView, setChosenView] = useState<CameraView>()

  useEffect(() => {
    const done = window.setTimeout(() => setAscending(false), AscentMs)
    return () => window.clearTimeout(done)
  }, [])

  useEffect(() => {
    if (ascending) return
    const started = performance.now()
    const clock = window.setInterval(() => setElapsed(performance.now() - started), TickMs)
    return () => window.clearInterval(clock)
  }, [ascending])

  const life = result?.lifeYears ?? 0
  const horizon = Math.max(1, result?.design.designLifeYears ?? 1)
  const duration = life > 0 ? Math.max(ShortestFlightMs, FullFlightMs * (life / horizon)) : 1800
  const landed = elapsed >= duration + FinaleMs
  const flown = Math.min(1, elapsed / duration)
  const year = life * flown
  const closeOrbit = result?.design.orbit.orbitClass === OrbitClass.Leo || result?.design.orbit.orbitClass === OrbitClass.Sso
  const visible = (result?.events ?? []).filter((event) => event.year <= year + 1e-6 && (event.year < life || flown >= 1 || !event.isFatal))
  const lost = visible.some((event) => event.isFatal)
  const goal = result?.design.scenario.spec.requiredScience ?? 1
  const coverage = Math.min(1, (result?.score ?? 0) / goal) * flown
  const scripted = closeOrbit && elapsed > 1300 && flown < 0.62 ? CameraView.Chase : CameraView.Wide
  const view = chosenView ?? scripted

  useEffect(() => {
    if (landed) finishFlight()
  }, [landed, finishFlight])

  useEffect(() => {
    reportFlight({ coverage, lost, view })
  }, [coverage, lost, view, reportFlight])

  if (!result) return null
  const design = result.design
  const progress = Math.min(1, year / horizon)

  return (
    <main className="FlightScreen">
      {ascending && (
        <div className="Ascent" aria-hidden="true">
          <RocketSilhouette vehicleId={design.vehicle.id} />
        </div>
      )}
      <header className="FlightHeader">
        <h1>{design.scenario.name}</h1>
        <p className="MissionClock">{translator.t('Flight.Clock', { year: Numbers.round(year, 1) })}</p>
        <p className="CoverageReadout">{translator.t('Flight.Coverage', { percent: Numbers.percent(coverage) })}</p>
      </header>

      {!GraphicsSupport.webgl && (
        <div className="FlightStill Window">
          <OrbitDiagram orbit={design.orbit} copies={design.copies} stations={design.groundStations} label={design.orbit.name} flying lost={lost} />
        </div>
      )}

      <section className="FlightLog Panel">
        <div className="Timeline" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="TimelineFill" style={{ width: `${progress * 100}%` }} />
          {visible.map((event, index) => (
            <span key={index} className={`TimelineTick ${event.isFatal ? 'IsFatal' : ''}`} style={{ left: `${Math.min(100, (event.year / horizon) * 100)}%` }} />
          ))}
        </div>
        <ol className="EventLog" aria-live="polite">
          {visible.slice(-4).map((event, index) => (
            <li key={`${event.year}-${event.kind}-${index}`} className={event.isFatal ? 'IsFatal' : ''}>
              <span className="EventYear">{translator.t('Event.Year', { year: Numbers.round(event.year, 1) })}</span>
              <span>{translator.t(`Event.${event.kind}`, event.params)}</span>
            </li>
          ))}
        </ol>
        <div className="Actions">
          {GraphicsSupport.webgl && closeOrbit && (
            <button type="button" onClick={() => setChosenView(view === CameraView.Chase ? CameraView.Wide : CameraView.Chase)}>
              {translator.t(view === CameraView.Chase ? 'Flight.ViewWide' : 'Flight.ViewChase')}
            </button>
          )}
          <button type="button" className="Quiet" onClick={finishFlight}>{translator.t('Flight.Skip')}</button>
        </div>
      </section>
    </main>
  )
}
