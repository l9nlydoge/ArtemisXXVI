import { useEffect, useMemo, useRef } from 'react'
import { Rules } from '../../Engine/Core/Rules'
import { EventKind } from '../../Engine/Events/SpaceEvent'
import type { Contact } from '../../Engine/Flight/Contact'
import type { Encounter } from '../../Engine/Flight/Encounter'
import { FlightPhase, type Flight } from '../../Engine/Flight/Flight'
import { Commands } from '../../Engine/Flight/FlightCommand'
import { Scoring } from '../../Engine/Flight/Scoring'
import type { TurnCondition } from '../../Engine/Flight/TurnCondition'
import type { TurnPreview } from '../../Engine/Flight/TurnPreview'
import { Instrument } from '../../Engine/Modules/Instrument'
import type { InstalledModule } from '../../Engine/Spacecraft/InstalledModule'
import { LearnedSources } from '../../Data/Curated/LearnedSources'
import { useWording, type Wording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { ChannelBars } from '../Cards/ChannelBars'
import { EventPhoto } from '../Cards/EventPhoto'
import { ModuleDrawing } from '../Cards/ModuleDrawing'
import { Meter } from '../Meters/Meter'
import { SceneMode } from '../Scene/FlightScene'
import { useSceneStage } from '../Scene/SceneStage'
import { useEncounterScene } from '../Scene/UseEncounterScene'
import { TurnClock, useTurnTimer } from '../Scene/TurnClock'
import { useTravelBeat, type Travel } from '../Scene/UseTravelBeat'

function signalText(signal: number): string {
  return Number(signal.toFixed(2)).toString()
}

function FlightTrack({ flight }: { flight: Flight }) {
  const wording = useWording()
  return (
    <ol className="FlightTrack" aria-label={wording.t('Flight.Leg', { leg: flight.legIndex + 1, count: Rules.legsPerFlight })}>
      {flight.week.legs.map((leg, index) => {
        const state = index < flight.legIndex ? 'IsDone' : index === flight.legIndex ? 'IsNow' : ''
        return (
          <li key={index} className={`TrackLeg ${state} ${leg.storm ? `IsStorm Is${leg.storm.band}` : ''}`}>
            <span className="TrackDot" />
            <span className="TrackDate">{wording.dayRange(leg.window.startUtc, leg.window.endUtc)}</span>
            {leg.storm && <span className="TrackStorm">{wording.t('Flight.StormLeg', { band: wording.t(`Band.${leg.storm.band}`) })}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function StatusMeters({ flight, preview }: { flight: Flight; preview?: TurnPreview }) {
  const wording = useWording()
  const { craft, state } = flight
  const hullAfter = preview ? preview.hullAfter : state.hull
  const chargeAfter = preview ? preview.chargeAfter : state.charge
  return (
    <div className="StatusMeters">
      <Meter label={wording.t('Flight.Hull')} value={hullAfter} ghost={state.hull} max={craft.maxHull} text={`${hullAfter} / ${craft.maxHull}`} tone={hullAfter < state.hull ? 'Danger' : 'Good'} />
      <Meter
        label={wording.t('Flight.Power')}
        value={chargeAfter}
        ghost={state.charge}
        max={craft.capacity}
        text={`${chargeAfter} / ${craft.capacity}`}
        tone="Foil"
        note={[wording.t('Flight.PowerNext', { gain: craft.generation }), craft.burns > 0 ? wording.t('Flight.Burns', { burns: state.burnsLeft }) : ''].filter(Boolean).join(' · ')}
      />
    </div>
  )
}

function ContactCard({ flight, contact, index }: { flight: Flight; contact: Contact; index: number }) {
  const wording = useWording()
  const send = useGameStore((state) => state.send)
  const { event } = contact
  const isStorm = event.kind === EventKind.Storm
  const showBand = contact.showsBandTo(flight.craft)
  const band = showBand ? <p className={`ContactBand Is${contact.band}`}>{wording.t('Contact.Radiation', { band: wording.t(`Band.${contact.band}`) })}</p> : null

  if (!contact.identified) {
    return (
      <li className="ContactCard Panel IsUnknown">
        <div className="UnknownField" aria-hidden="true" />
        <div className="ContactBody">
          <h2>{wording.t('Contact.Unknown')}</h2>
          <p className="Muted">{wording.t('Contact.UnknownAbout')}</p>
          <p className="ContactMeta">{wording.t('Contact.Turns', { turns: contact.turnCount })}</p>
          {band}
        </div>
        <div className="ContactAction">
          <button type="button" className="Primary" disabled={contact.played} onClick={() => send(Commands.choose(index))}>{wording.t('Contact.Choose')}</button>
        </div>
      </li>
    )
  }

  const potential = Scoring.potential(event, flight.craft)
  return (
    <li className={`ContactCard Panel ${contact.played ? 'IsPlayed' : ''}`}>
      <EventPhoto imageId={event.imageId} compact />
      <div className="ContactBody">
        <h2>{wording.text(event.label)}</h2>
        <ul className="FactList">
          {event.facts.slice(0, 2).map((fact, at) => <li key={at}>{wording.text(fact)}</li>)}
        </ul>
        <p className="ContactMeta">
          {wording.t('Contact.Turns', { turns: contact.turnCount })} · {wording.t('Contact.PeakSignal', { signal: signalText(contact.peakSignal) })}
        </p>
        {band}
        <ChannelBars event={event} craft={flight.craft} />
        <p className="ContactPoints">
          <strong>{wording.t('Contact.PointsYours', { points: potential.reachable })}</strong>
          {potential.total > potential.reachable && <span className="Muted ContactPointsAll">{wording.t('Contact.PointsAll', { points: potential.total })}</span>}
        </p>
      </div>
      <div className="ContactAction">
        <button type="button" className="Primary" disabled={contact.played} onClick={() => send(Commands.choose(index))}>
          {contact.played ? wording.t('Contact.Played') : isStorm ? wording.t('Contact.StormRide') : wording.t('Contact.Choose')}
        </button>
      </div>
    </li>
  )
}

function ScannerView({ flight }: { flight: Flight }) {
  const wording = useWording()
  const send = useGameStore((state) => state.send)
  return (
    <>
      <section className="ScannerView">
        <h1 className="ViewTitle">{wording.t('Flight.ScanTitle')}</h1>
        {flight.contacts.length === 0 && <p className="Panel EmptyNote">{wording.t('Flight.NoContacts')}</p>}
        <ul className="ContactRow" data-count={flight.contacts.length}>
          {flight.contacts.map((contact, index) => <ContactCard key={contact.event.id} flight={flight} contact={contact} index={index} />)}
        </ul>
      </section>
      <footer className="FlightFoot Panel">
        <StatusMeters flight={flight} />
        <p className="FootHint">{flight.isStormLeg ? wording.t('Flight.ScanHintStorm') : wording.t('Flight.ScanHint')}</p>
        <div className="FootActions">
          {flight.craft.hasRadar && (
            <button type="button" disabled={!flight.can(Commands.survey)} onClick={() => send(Commands.survey)}>{wording.t('Flight.Survey', { cost: Rules.surveyCost })}</button>
          )}
          <button type="button" disabled={!flight.can(Commands.hold)} title={flight.isStormLeg ? wording.t('Flight.HoldStorm') : undefined} onClick={() => send(Commands.hold)}>
            {flight.isStormLeg ? wording.t('Flight.HoldStorm') : wording.t('Flight.Hold')}
          </button>
        </div>
      </footer>
    </>
  )
}

function TravelView({ flight, travel }: { flight: Flight; travel: Travel }) {
  const wording = useWording()
  return (
    <>
      <section className="TravelView" aria-live="polite">
        <p className="TravelLine Panel">
          <strong>{wording.t('Flight.Cruise')}</strong>
          <span>{travel.gain > 0 ? wording.t('Flight.CruisePower', { gain: travel.gain }) : wording.t('Flight.CruiseFull')}</span>
          <span className="Muted">{wording.t('Flight.CruiseSkip')}</span>
        </p>
      </section>
      <footer className="FlightFoot Panel IsTravel">
        <StatusMeters flight={flight} />
      </footer>
    </>
  )
}

function effectText(module: InstalledModule, encounter: Encounter, flight: Flight, boosted: boolean, wording: Wording): { text: string; idle: boolean } {
  const { craft } = flight
  if (module.card instanceof Instrument) {
    const result = encounter.yieldOf(module.key, boosted)!
    if (result.waste) return { text: wording.t(`Waste.${result.waste}`, { mark: wording.t(`Mark.${result.neededMark ?? 1}`) }), idle: true }
    return { text: wording.t('Use.Records', { gain: result.gain, channel: wording.t(`Channel.${result.channel}`) }), idle: false }
  }
  if (module === craft.magneticShield) {
    const exposed = Math.max(0, encounter.current.radiation - craft.passiveShield)
    return { text: wording.t('Use.Blocks', { amount: Math.min(exposed, module.value) }), idle: exposed === 0 }
  }
  if (module === craft.thrusters) {
    const idle = encounter.contact.peakSignal <= encounter.current.signal
    return { text: wording.t('Use.Burn', { signal: signalText(encounter.contact.peakSignal) }), idle }
  }
  const heal = Math.min(module.value, craft.maxHull - flight.state.hull)
  return { text: wording.t('Use.Heals', { amount: heal }), idle: heal === 0 }
}

function conditionText(condition: TurnCondition, wording: Wording): string {
  return [
    wording.t('Encounter.BriefSignal', { signal: signalText(condition.signal) }),
    wording.t(condition.inShadow ? 'Encounter.BriefShadow' : 'Encounter.BriefSun'),
    condition.radiation > 0 ? wording.t('Encounter.BriefRadiation', { amount: condition.radiation }) : wording.t('Encounter.BriefQuiet'),
  ].join(', ')
}

function EncounterView({ flight, encounter, paused }: { flight: Flight; encounter: Encounter; paused: boolean }) {
  const wording = useWording()
  const plan = useGameStore((state) => state.plan)
  const togglePlan = useGameStore((state) => state.togglePlan)
  const clearPlan = useGameStore((state) => state.clearPlan)
  const send = useGameStore((state) => state.send)
  const { craft } = flight
  const { event } = encounter
  const over = encounter.isOver
  const preview = useMemo(() => encounter.preview(plan), [encounter, plan, encounter.turnIndex, over])
  const boosted = craft.thrusters !== undefined && plan.has(craft.thrusters.key)
  const visible = encounter.visible
  const recording = [...preview.gains.values()].reduce((sum, gain) => sum + gain, 0)
  const result = over ? encounter.result() : undefined
  const timer = useTurnTimer(`${flight.legIndex}:${encounter.event.id}:${encounter.turnIndex}`, paused || over, () => {
    const current = useGameStore.getState().plan
    send(Commands.commit(encounter.preview(current).valid ? current.list : []))
  })
  const openContacts = flight.contacts.map((contact, index) => ({ contact, index })).filter(({ index }) => flight.can(Commands.chase(index)))

  useEffect(() => {
    const onKey = (pressed: KeyboardEvent) => {
      if (pressed.target instanceof HTMLButtonElement && pressed.key === 'Enter') return
      if (over) {
        if (pressed.key === 'Enter' && flight.can(Commands.proceed)) send(Commands.proceed)
        return
      }
      const slot = Number(pressed.key)
      if (Number.isInteger(slot) && slot >= 1 && slot <= craft.actives.length) togglePlan(craft.actives[slot - 1].key)
      if (pressed.key === 'Escape') clearPlan()
      if (pressed.key === 'Enter' && preview.valid) send(Commands.commit(plan.list))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [over, flight, craft, plan, preview, send, togglePlan, clearPlan])

  return (
    <>
      <section className="EncounterView">
        <article className="EventCard Panel">
          <EventPhoto imageId={event.imageId} />
          <div className="EventBody">
            <h1>{wording.text(event.label)}</h1>
            <ul className="FactList IsScrolling">
              {event.facts.map((fact, at) => <li key={at}>{wording.text(fact)}</li>)}
            </ul>
            <ChannelBars event={event} craft={craft} recorded={encounter.recorded} pending={over ? undefined : preview.gains} />
          </div>
        </article>

        <div className="EncounterStage" role="img" aria-label={wording.t('Hangar.Spacecraft')} />

        <ol className="TurnTrack Panel" aria-label={wording.t('Turn.Label', { turn: encounter.turnIndex + 1 })}>
          {visible.map((condition, index) => {
            const state = index < encounter.turnsPlayed ? 'IsPast' : index === encounter.turnIndex && !over ? 'IsNow' : ''
            return (
              <li key={index} className={`TurnCell ${state} ${condition ? '' : 'IsHidden'}`}>
                <span className="TurnNumber">{wording.t('Turn.Label', { turn: index + 1 })}</span>
                {condition ? (
                  <>
                    <span className="TurnSignal">{wording.t('Turn.Signal', { signal: signalText(condition.signal) })}</span>
                    <span className={condition.inShadow ? 'TurnShadow' : 'TurnSun'}>{wording.t(condition.inShadow ? 'Turn.Shadow' : 'Turn.Sun')}</span>
                    <span className={condition.radiation > 0 ? 'TurnRadiation' : 'TurnQuiet'}>{condition.radiation > 0 ? wording.t('Turn.Radiation', { amount: condition.radiation }) : wording.t('Turn.Quiet')}</span>
                  </>
                ) : (
                  <span className="TurnUnknown">{wording.t('Turn.Hidden')}</span>
                )}
              </li>
            )
          })}
          {craft.lookahead === 0 && visible.some((condition) => !condition) && <li className="TurnHint">{wording.t('Turn.HiddenHint')}</li>}
        </ol>
      </section>

      <footer className="FlightFoot Panel IsEncounter">
        <StatusMeters flight={flight} preview={over ? undefined : preview} />
        {result ? (
          <div className="ResultStrip">
            <p className="ResultPoints">{wording.t('Result.Points', { points: result.points })}</p>
            <p className="ResultState">
              {result.complete
                ? wording.t('Result.Complete')
                : result.anyRecorded
                  ? wording.t('Result.Partial', { full: [...event.channels].filter(([channel, spec]) => (result.recorded.get(channel) ?? 0) >= spec.capacity).length, total: event.channels.size })
                  : wording.t('Result.Nothing')}
            </p>
            {result.anyRecorded && (
              <p className="ResultLearned">
                {wording.text(event.learned)} <a href={LearnedSources.linkFor(event)} target="_blank" rel="noreferrer">{wording.t('Result.Source')}</a>
              </p>
            )}
            <div className="ResultActions">
              {openContacts.map(({ contact, index }) => (
                <button key={index} type="button" onClick={() => send(Commands.chase(index))}>
                  {wording.t('Result.Chase', { cost: Rules.chaseCost })}: {contact.identified ? wording.text(contact.event.label) : wording.t('Contact.Unknown')}
                </button>
              ))}
              {flight.phase === FlightPhase.EncounterDone && <button type="button" className="Primary IsLarge" onClick={() => send(Commands.proceed)}>{wording.t('Result.Continue')}</button>}
            </div>
          </div>
        ) : (
          <>
            <div className="TurnPlanArea">
              <p className="TurnBrief">
                <strong>{wording.t('Encounter.Brief', { turn: encounter.turnIndex + 1, count: encounter.turnCount })}</strong>{' '}
                {conditionText(encounter.current, wording)}. <span className="Muted">{wording.t('Encounter.Instruction')}</span>
              </p>
              <ul className="ActionRow">
                {craft.actives.map((module, index) => {
                  const selected = plan.has(module.key)
                  const problem = encounter.problemWith(module.key, plan)
                  const use = effectText(module, encounter, flight, boosted, wording)
                  return (
                    <li key={module.key}>
                      <button type="button" className={`ActionCard ${selected ? 'IsOn' : ''} ${use.idle ? 'IsIdle' : ''}`} aria-pressed={selected} aria-keyshortcuts={String(index + 1)} disabled={!selected && problem !== undefined} onClick={() => togglePlan(module.key)}>
                        <span className="ActionTop">
                          <ModuleDrawing moduleId={module.card.id} />
                          <kbd className="ActionKey" aria-hidden="true">{index + 1}</kbd>
                        </span>
                        <span className="ActionName">{wording.t(`Module.${module.card.id}.Name`)}</span>
                        <span className="ActionCost">{wording.t(`Mark.${module.mark}`)} · {wording.t('Stat.Power', { power: module.card.powerCost })}</span>
                        <span className="ActionUse">{!selected && problem ? wording.t(`Problem.${problem}`) : use.text}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="TurnCommit">
              <ul className="PreviewLine" aria-live="polite">
                <li className={preview.powerCost > craft.generation ? 'IsOverGeneration' : ''}>{wording.t('Encounter.UsesMakes', { power: preview.powerCost, gain: craft.generation })}</li>
                <li>{wording.t('Encounter.Records', { data: recording })}</li>
                <li className={preview.incoming > 0 ? 'IsDamage' : ''}>{preview.incoming > 0 ? wording.t('Encounter.Damage', { damage: preview.incoming }) : wording.t('Encounter.NoDamage')}</li>
              </ul>
              {preview.lost && <p className="LethalLine">{wording.t('Encounter.Lethal')}</p>}
              <TurnClock timer={timer} paused={paused} />
              <button type="button" className="Primary IsLarge" disabled={!preview.valid} onClick={() => send(Commands.commit(plan.list))}>{wording.t('Encounter.EndTurn')}</button>
            </div>
          </>
        )}
      </footer>
    </>
  )
}

export function FlightScreen() {
  const wording = useWording()
  const flight = useGameStore((state) => state.flight)
  useGameStore((state) => state.flightTick)
  const finishFlight = useGameStore((state) => state.finishFlight)
  const tick = useGameStore((state) => state.flightTick)
  const plan = useGameStore((state) => state.plan)
  const loadout = useGameStore((state) => state.loadout)
  const root = useRef<HTMLElement>(null)
  const encounter = flight?.encounter
  const travel = useTravelBeat(flight)
  const mode = encounter ? SceneMode.Encounter : travel ? SceneMode.Travel : SceneMode.Scanner
  useSceneStage(root, mode, loadout, encounter && !encounter.isOver ? plan.keys : undefined, `${flight?.legIndex}:${flight?.contacts.length}:${mode}`)
  const endShown = useEncounterScene(flight, plan, tick)
  if (!flight) return null
  const hit = flight.lastOutcome?.incoming ?? 0

  return (
    <main ref={root} className={`FlightScreen ${flight.isStormLeg ? 'IsStormLeg' : ''}`}>
      {hit > 0 && <div key={tick} className={`RadiationHit ${hit >= 6 ? 'IsHeavy' : ''}`} aria-hidden="true" />}
      <header className="FlightHead">
        <p className="LegLabel">{wording.t('Flight.Leg', { leg: flight.legIndex + 1, count: Rules.legsPerFlight })}</p>
        <FlightTrack flight={flight} />
        <p className="FlightPoints">{wording.t('Flight.Points', { points: flight.pointsEarned })}</p>
      </header>
      {encounter ? <EncounterView flight={flight} encounter={encounter} paused={flight.isOver} /> : flight.isOver ? <div /> : travel ? <TravelView flight={flight} travel={travel} /> : <ScannerView flight={flight} />}
      {flight.isOver && endShown && (
        <div className={`FlightEnd Panel ${flight.phase === FlightPhase.Lost ? 'IsLost' : ''}`} role="dialog" aria-label={wording.t(flight.phase === FlightPhase.Lost ? 'Flight.Lost' : 'Flight.Complete')}>
          <h2>{wording.t(flight.phase === FlightPhase.Lost ? 'Flight.Lost' : 'Flight.Complete')}</h2>
          <p>{wording.t('Flight.Points', { points: flight.pointsEarned })}</p>
          <button type="button" className="Primary IsLarge" autoFocus onClick={finishFlight}>{wording.t('Flight.ToDebrief')}</button>
        </div>
      )}
    </main>
  )
}
