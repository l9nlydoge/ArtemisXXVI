import { Rules } from '../Core/Rules'
import { Rarity } from '../Events/Rarity'
import { Contact } from '../Flight/Contact'
import type { Encounter } from '../Flight/Encounter'
import type { Flight } from '../Flight/Flight'
import { Commands, type FlightCommand } from '../Flight/FlightCommand'
import { ConditionRoller } from '../Flight/TurnCondition'
import { TurnPlan } from '../Flight/TurnPlan'
import { EncounterPlanner, type PlannerResult, type PlannerValues } from './EncounterPlanner'
import { FlightBot } from './FlightBot'

export enum SurveyPolicy {
  Smart = 'Smart',
  Never = 'Never',
  Always = 'Always',
}

export interface PlannerSettings {
  survey: SurveyPolicy
  hold: boolean
  chase: boolean
  beamWidth: number
  chargeValue: number
  stormHullValue: number
  calmHullValue: number
  death: number
}

export interface TurnRecord {
  legIndex: number
  turnIndex: number
  stormLeg: boolean
  charge: number
  usefulCost: number
  powerLimited: boolean
  options: number
  gap: number
  bestValue: number
  keys: string[]
  sameAsLast: boolean
  shieldOn: boolean
  instrumentsOn: number
  wantedBoth: boolean
}

export interface ScanRecord {
  legIndex: number
  choice: 'Survey' | 'Hold' | 'Choose'
  options: number
  gap: number
}

export interface PlannerObserver {
  turn?(record: TurnRecord): void
  scan?(record: ScanRecord): void
}

export class PlannerBot extends FlightBot {
  static readonly defaults: PlannerSettings = {
    survey: SurveyPolicy.Smart,
    hold: true,
    chase: true,
    beamWidth: 40,
    chargeValue: 0.5,
    stormHullValue: 2,
    calmHullValue: 0.1,
    death: 400,
  }

  readonly settings: PlannerSettings
  private lastKeys = ''
  private lastEncounter?: Encounter

  constructor(settings: Partial<PlannerSettings> = {}, private readonly observer: PlannerObserver = {}) {
    super()
    this.settings = { ...PlannerBot.defaults, ...settings }
  }

  protected reserve(): number {
    return 0
  }

  protected shouldSurvey(): boolean {
    return false
  }

  values(flight: Flight): PlannerValues {
    const last = flight.legIndex >= Rules.legsPerFlight - 1
    const stormsAhead = flight.week.legs.some((leg, index) => index > flight.legIndex && leg.storm !== undefined)
    return {
      charge: last ? 0 : this.settings.chargeValue,
      cruise: last ? 0 : Rules.cruiseTurns * flight.craft.generation,
      hull: last ? 0 : stormsAhead ? this.settings.stormHullValue : this.settings.calmHullValue,
      death: this.settings.death,
    }
  }

  private idleValue(flight: Flight, charge: number): number {
    const values = this.values(flight)
    return values.charge * Math.min(flight.craft.capacity, charge + values.cruise) + values.hull * flight.state.hull
  }

  contactValue(flight: Flight, contact: Contact, charge = flight.state.charge, burnsLeft = flight.state.burnsLeft): number {
    const state = { charge, hull: flight.state.hull, burnsLeft, repairUsed: flight.state.repairUsed }
    const values = this.values(flight)
    if (contact.identified) {
      const { planner, start } = EncounterPlanner.fresh(contact, flight.craft, state, values, flight.setup.cooldowns === true, this.settings.beamWidth)
      return planner.plan(start).best.value
    }
    const candidates = flight.week.eligible(flight.legIndex, new Set()).filter((event) => event.rarity >= Rarity.Notable && event.turnCount === contact.turnCount)
    const pool = candidates.length > 0 ? candidates : flight.week.eligible(flight.legIndex, new Set()).filter((event) => event.rarity >= Rarity.Notable)
    if (pool.length === 0) return this.idleValue(flight, charge)
    let total = 0
    for (const event of pool) {
      const conditions = event.turns.map((turn, index) => ({
        signal: turn.signal,
        radiation: turn.radiation + (contact.overlay ? ConditionRoller.weather(contact.overlay, index, event.turnCount) : 0),
        inShadow: false,
        anomaly: false,
      }))
      const hypothetical = new Contact(event, true, conditions, contact.overlay)
      const { planner, start } = EncounterPlanner.fresh(hypothetical, flight.craft, state, values, flight.setup.cooldowns === true, this.settings.beamWidth)
      total += planner.plan(start).best.value
    }
    return total / pool.length
  }

  protected override scan(flight: Flight): FlightCommand {
    const ranked = flight.contacts
      .map((contact, index) => ({ index, contact }))
      .filter((entry) => !entry.contact.played)
      .map((entry) => ({ command: Commands.choose(entry.index), value: this.contactValue(flight, entry.contact), label: 'Choose' as const }))
    if (this.settings.hold && flight.can(Commands.hold)) ranked.push({ command: Commands.hold, value: this.idleValue(flight, flight.craft.capacity), label: 'Hold' as unknown as 'Choose' })
    ranked.sort((a, b) => b.value - a.value)
    if (flight.can(Commands.survey) && this.wantsSurvey(flight)) {
      this.observer.scan?.({ legIndex: flight.legIndex, choice: 'Survey', options: ranked.length, gap: ranked.length > 1 ? ranked[0].value - ranked[1].value : Number.POSITIVE_INFINITY })
      return Commands.survey
    }
    const best = ranked[0]
    if (!best) return Commands.hold
    this.observer.scan?.({ legIndex: flight.legIndex, choice: best.label === ('Hold' as unknown) ? 'Hold' : 'Choose', options: ranked.length, gap: ranked.length > 1 ? best.value - ranked[1].value : Number.POSITIVE_INFINITY })
    return best.command
  }

  private wantsSurvey(flight: Flight): boolean {
    if (this.settings.survey === SurveyPolicy.Never) return false
    if (this.settings.survey === SurveyPolicy.Always) return true
    const unknown = flight.contacts.some((contact) => !contact.identified && !contact.played)
    if (flight.isStormLeg) return unknown && flight.state.charge >= flight.craft.capacity * 0.75
    return unknown || flight.state.charge - Rules.surveyCost >= flight.craft.capacity * 0.6
  }

  protected override afterEncounter(flight: Flight): FlightCommand {
    if (!this.settings.chase) return Commands.proceed
    const stay = this.idleValue(flight, flight.state.charge)
    let best: { index: number; value: number } | undefined
    flight.contacts.forEach((contact, index) => {
      if (!flight.can(Commands.chase(index))) return
      const value = this.contactValue(flight, contact, flight.state.charge - Rules.chaseCost, flight.state.burnsLeft - 1)
      if (!best || value > best.value) best = { index, value }
    })
    if (best && best.value > stay + 1) return Commands.chase(best.index)
    return Commands.proceed
  }

  protected override plan(flight: Flight, encounter: Encounter): TurnPlan {
    const { planner, start } = EncounterPlanner.forEncounter(encounter, flight.craft, flight.state, this.values(flight), flight.setup.cooldowns === true, this.settings.beamWidth)
    const result = planner.plan(start)
    this.record(flight, encounter, result)
    return new TurnPlan(result.best.keys)
  }

  private record(flight: Flight, encounter: Encounter, result: PlannerResult): void {
    if (!this.observer.turn) return
    const craft = flight.craft
    let usefulCost = 0
    let wantedInstruments = 0
    for (const module of craft.instruments) {
      if ((encounter.yieldOf(module.key)?.gain ?? 0) > 0) {
        usefulCost += module.card.powerCost
        wantedInstruments += 1
      }
    }
    const exposed = encounter.preview(TurnPlan.empty).incoming
    const shield = craft.magneticShield
    const shieldWanted = shield !== undefined && exposed > 0
    if (shieldWanted) usefulCost += shield.card.powerCost
    const keys = [...result.best.keys].sort().join(',')
    const fresh = this.lastEncounter !== encounter
    this.lastEncounter = encounter
    const sameAsLast = !fresh && keys === this.lastKeys
    this.lastKeys = keys
    const second = result.choices[1]
    this.observer.turn({
      legIndex: flight.legIndex,
      turnIndex: encounter.turnIndex,
      stormLeg: flight.isStormLeg,
      charge: flight.state.charge,
      usefulCost,
      powerLimited: usefulCost > flight.state.charge,
      options: result.choices.length,
      gap: second ? result.best.value - second.value : Number.POSITIVE_INFINITY,
      bestValue: result.best.value,
      keys: result.best.keys,
      sameAsLast,
      shieldOn: shield !== undefined && result.best.keys.includes(shield.key),
      instrumentsOn: result.best.keys.filter((key) => craft.instruments.some((module) => module.key === key)).length,
      wantedBoth: shieldWanted && wantedInstruments > 0 && usefulCost > flight.state.charge,
    })
  }
}
