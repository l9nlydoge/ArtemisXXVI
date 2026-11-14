import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import { Loadout } from '../Spacecraft/Loadout'
import { Spacecraft } from '../Spacecraft/Spacecraft'
import type { Week } from '../Weeks/Week'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import type { Contact } from './Contact'
import { CraftState } from './CraftState'
import { Encounter } from './Encounter'
import type { EncounterResult } from './EncounterResult'
import type { EngineOptions } from './EngineOptions'
import { CommandType, type FlightCommand } from './FlightCommand'
import { FlightOutcome, FlightReport, type FlightLoss } from './FlightReport'
import type { FlightSetup } from './FlightSetup'
import { Scanner } from './Scanner'
import { TurnPlan } from './TurnPlan'
import type { TurnOutcome } from './TurnPreview'

export enum FlightPhase {
  Scanning = 'Scanning',
  Encounter = 'Encounter',
  EncounterDone = 'EncounterDone',
  Completed = 'Completed',
  Lost = 'Lost',
}

export class Flight {
  readonly craft: Spacecraft
  readonly state: CraftState
  readonly week: Week
  private readonly scanner: Scanner
  private readonly cooldowns: boolean
  private readonly history: FlightCommand[] = []
  private readonly finished: EncounterResult[] = []
  private currentPhase = FlightPhase.Scanning
  private leg = 0
  private dealt: Contact[] = []
  private active?: Encounter
  private surveyed = false
  private chased = false
  private loss?: FlightLoss
  private last?: TurnOutcome

  readonly setup: FlightSetup

  private constructor(setup: FlightSetup, options: EngineOptions) {
    if (!SeededRandom.isSeed(setup.seed)) throw new Error(`Not a usable seed: ${String(setup.seed)}`)
    this.week = (options.weeks ?? WeekCatalog.shared).get(setup.weekId)
    if (setup.weekSignature !== undefined && setup.weekSignature !== this.week.signature) throw new Error(`Week ${this.week.id} has changed since this flight was saved`)
    if (!Loadout.readsExactly(setup.loadout)) throw new Error('The loadout names a bus or module that does not exist or cannot be fitted')
    const loadout = Loadout.fromJson(setup.loadout)
    const issues = options.owner ? loadout.issues(options.owner) : loadout.structuralIssues
    if (issues.length > 0) throw new Error(`The loadout cannot fly: ${issues.map((issue) => issue.kind).join(', ')}`)
    this.craft = new Spacecraft(loadout)
    this.state = new CraftState(this.craft)
    this.scanner = new Scanner(this.week, setup.seed)
    this.cooldowns = setup.cooldowns === true
    this.setup = { loadout: loadout.toJson(), weekId: this.week.id, seed: setup.seed, cooldowns: this.cooldowns, weekSignature: this.week.signature }
    this.dealt = this.scanner.deal(0)
  }

  static setup(loadout: Loadout, week: Week, seed: number, cooldowns = false): FlightSetup {
    return { loadout: loadout.toJson(), weekId: week.id, seed, cooldowns, weekSignature: week.signature }
  }

  static begin(setup: FlightSetup, options: EngineOptions = {}): Flight {
    return new Flight(setup, options)
  }

  static replay(setup: FlightSetup, log: readonly FlightCommand[], options: EngineOptions = {}): Flight {
    const flight = new Flight(setup, options)
    for (const command of log) flight.apply(command)
    return flight
  }

  get phase(): FlightPhase {
    return this.currentPhase
  }

  get legIndex(): number {
    return this.leg
  }

  get contacts(): readonly Contact[] {
    return this.dealt
  }

  get encounter(): Encounter | undefined {
    return this.active
  }

  get results(): readonly EncounterResult[] {
    return this.finished
  }

  get log(): readonly FlightCommand[] {
    return this.history
  }

  get lastOutcome(): TurnOutcome | undefined {
    return this.last
  }

  get pointsEarned(): number {
    return this.finished.reduce((sum, result) => sum + result.points, 0)
  }

  get isOver(): boolean {
    return this.currentPhase === FlightPhase.Completed || this.currentPhase === FlightPhase.Lost
  }

  get isStormLeg(): boolean {
    return this.week.stormOn(this.leg) !== undefined
  }

  get hasSurveyed(): boolean {
    return this.surveyed
  }

  can(command: FlightCommand): boolean {
    if (typeof command !== 'object' || command === null) return false
    switch (command.type) {
      case CommandType.Survey:
        return this.currentPhase === FlightPhase.Scanning && this.craft.hasRadar && !this.surveyed && this.state.charge >= Rules.surveyCost
      case CommandType.Choose:
        return this.currentPhase === FlightPhase.Scanning && this.isOpen(command.contactIndex)
      case CommandType.Hold:
        return this.currentPhase === FlightPhase.Scanning && !this.isStormLeg
      case CommandType.Commit:
        return this.currentPhase === FlightPhase.Encounter && Flight.areKeys(command.keys) && this.active!.preview(new TurnPlan(command.keys)).valid
      case CommandType.Continue:
        return this.currentPhase === FlightPhase.EncounterDone
      case CommandType.Chase:
        return (
          this.currentPhase === FlightPhase.EncounterDone &&
          !this.chased &&
          this.craft.thrusters !== undefined &&
          this.state.burnsLeft >= 1 &&
          this.state.charge >= Rules.chaseCost &&
          this.isOpen(command.contactIndex)
        )
      default:
        return false
    }
  }

  apply(command: FlightCommand): void {
    if (!this.can(command)) throw new Error(`Cannot ${command.type} during ${this.currentPhase}`)
    switch (command.type) {
      case CommandType.Survey:
        this.survey()
        break
      case CommandType.Choose:
        this.engage(command.contactIndex)
        break
      case CommandType.Hold:
        this.state.charge = this.craft.capacity
        this.advance()
        break
      case CommandType.Commit:
        this.commit(new TurnPlan(command.keys))
        break
      case CommandType.Continue:
        this.advance()
        break
      case CommandType.Chase:
        this.state.burnsLeft -= 1
        this.state.charge -= Rules.chaseCost
        this.chased = true
        this.engage(command.contactIndex)
        break
    }
    this.history.push(Flight.copyOf(command))
  }

  report(): FlightReport {
    if (!this.isOver) throw new Error('The flight is still in progress')
    const outcome = this.currentPhase === FlightPhase.Completed ? FlightOutcome.Completed : FlightOutcome.Lost
    return new FlightReport(outcome, this.finished, Math.max(0, this.state.hull), this.leg + 1, this.loss)
  }

  private static areKeys(keys: unknown): keys is readonly string[] {
    return Array.isArray(keys) && keys.every((key) => typeof key === 'string') && new Set(keys).size === keys.length
  }

  private static copyOf(command: FlightCommand): FlightCommand {
    switch (command.type) {
      case CommandType.Commit:
        return { type: command.type, keys: [...command.keys] }
      case CommandType.Choose:
      case CommandType.Chase:
        return { type: command.type, contactIndex: command.contactIndex }
      default:
        return { type: command.type }
    }
  }

  private isOpen(contactIndex: unknown): boolean {
    if (typeof contactIndex !== 'number' || !Number.isInteger(contactIndex)) return false
    const contact = this.dealt[contactIndex]
    return contact !== undefined && !contact.played
  }

  private survey(): void {
    this.state.charge -= Rules.surveyCost
    this.surveyed = true
    for (const contact of this.dealt) contact.identified = true
    const extra = this.scanner.dealExtra(this.leg)
    if (extra) this.dealt = [...this.dealt, extra]
  }

  private engage(contactIndex: number): void {
    const contact = this.dealt[contactIndex]
    contact.played = true
    contact.identified = true
    this.active = new Encounter(contact, this.leg, this.craft, this.state, this.cooldowns)
    this.last = undefined
    this.currentPhase = FlightPhase.Encounter
  }

  private commit(plan: TurnPlan): void {
    const encounter = this.active!
    const condition = encounter.current
    const outcome = encounter.commit(plan)
    this.last = outcome
    if (!outcome.encounterOver) return
    this.finished.push(encounter.result())
    if (outcome.lost) {
      this.loss = {
        legIndex: this.leg,
        eventId: encounter.event.id,
        radiation: condition.radiation,
        shielding: this.craft.passiveShield,
        hadActiveShield: this.craft.magneticShield !== undefined,
      }
      this.currentPhase = FlightPhase.Lost
      return
    }
    this.currentPhase = FlightPhase.EncounterDone
  }

  private advance(): void {
    this.active = undefined
    this.last = undefined
    if (this.leg + 1 >= Rules.legsPerFlight) {
      this.currentPhase = FlightPhase.Completed
      return
    }
    this.state.charge = Math.min(this.craft.capacity, this.state.charge + Rules.cruiseTurns * this.craft.generation)
    this.leg += 1
    this.surveyed = false
    this.chased = false
    this.dealt = this.scanner.deal(this.leg)
    this.currentPhase = FlightPhase.Scanning
  }
}
