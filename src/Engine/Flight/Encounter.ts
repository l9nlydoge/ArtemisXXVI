import { Numbers } from '../Core/Numbers'
import type { Channel } from '../Events/Channel'
import type { SpaceEvent } from '../Events/SpaceEvent'
import { Instrument } from '../Modules/Instrument'
import type { InstalledModule } from '../Spacecraft/InstalledModule'
import type { Spacecraft } from '../Spacecraft/Spacecraft'
import type { Contact } from './Contact'
import type { CraftState } from './CraftState'
import type { EncounterResult } from './EncounterResult'
import { Scoring } from './Scoring'
import type { TurnCondition } from './TurnCondition'
import type { TurnPlan } from './TurnPlan'
import { PlanProblem, WasteReason, type InstrumentYield, type TurnOutcome, type TurnPreview } from './TurnPreview'

export class Encounter {
  private turn = 0
  private played = 0
  private finished = false
  private readonly outcomes: TurnOutcome[] = []
  private damage = 0
  private lastKeys: ReadonlySet<string> = new Set()
  private readonly tally = new Map<Channel, number>()

  constructor(
    readonly contact: Contact,
    readonly legIndex: number,
    private readonly craft: Spacecraft,
    private readonly state: CraftState,
    private readonly cooldowns = false,
  ) {
    for (const channel of this.event.channels.keys()) this.tally.set(channel, 0)
    this.beginTurn()
  }

  get event(): SpaceEvent {
    return this.contact.event
  }

  get turnIndex(): number {
    return this.turn
  }

  get turnCount(): number {
    return this.contact.turnCount
  }

  get turnsPlayed(): number {
    return this.played
  }

  get history(): readonly TurnOutcome[] {
    return this.outcomes
  }

  get isOver(): boolean {
    return this.finished
  }

  get recorded(): ReadonlyMap<Channel, number> {
    return this.tally
  }

  get current(): TurnCondition {
    return this.contact.conditions[this.turn]
  }

  get visible(): (TurnCondition | undefined)[] {
    return this.contact.conditions.map((condition, index) => (index <= this.turn + this.craft.lookahead ? condition : undefined))
  }

  isCooling(key: string): boolean {
    return this.cooldowns && this.lastKeys.has(key)
  }

  problemWith(key: string, plan: TurnPlan): PlanProblem | undefined {
    if (plan.has(key)) return undefined
    return this.preview(plan.with(key)).problem
  }

  yieldOf(key: string, boosted = false): InstrumentYield | undefined {
    const module = this.craft.active(key)
    if (!module || !(module.card instanceof Instrument)) return undefined
    return this.yieldFor(module, this.signal(boosted), this.tally)
  }

  preview(plan: TurnPlan): TurnPreview {
    const modules = plan.list.map((key) => this.craft.active(key))
    const known = modules.filter((module): module is InstalledModule => module !== undefined)
    const powerCost = known.reduce((sum, module) => sum + module.card.powerCost, 0)
    const thrusters = this.craft.thrusters
    const drone = this.craft.repairDrone
    const shield = this.craft.magneticShield
    const burning = thrusters !== undefined && plan.has(thrusters.key)
    const repairing = drone !== undefined && plan.has(drone.key)
    const shielding = shield !== undefined && plan.has(shield.key)
    const condition = this.current

    const checks: [boolean, PlanProblem][] = [
      [this.finished, PlanProblem.EncounterOver],
      [known.length !== modules.length, PlanProblem.UnknownModule],
      [known.some((module) => this.isCooling(module.key)), PlanProblem.CoolingDown],
      [burning && this.state.burnsLeft < 1, PlanProblem.NoBurnsLeft],
      [repairing && this.state.repairUsed, PlanProblem.RepairUsed],
      [powerCost > this.state.charge, PlanProblem.NotEnoughCharge],
    ]
    const problem = checks.find(([failed]) => failed)?.[1]

    const signal = this.signal(burning)
    const running = new Map(this.tally)
    const gains = new Map<Channel, number>()
    const wasted: string[] = []
    for (const module of known) {
      if (!(module.card instanceof Instrument)) continue
      const result = this.yieldFor(module, signal, running)
      if (result.gain === 0) {
        wasted.push(module.key)
        continue
      }
      running.set(result.channel, (running.get(result.channel) ?? 0) + result.gain)
      gains.set(result.channel, (gains.get(result.channel) ?? 0) + result.gain)
    }

    const repaired = repairing ? Math.min(drone.value, this.craft.maxHull - this.state.hull) : 0
    const afterPassive = Math.max(0, condition.radiation - this.craft.passiveShield)
    const blocked = shielding ? Math.min(afterPassive, shield.value) : 0
    const incoming = afterPassive - blocked
    const hullAfter = Math.max(0, this.state.hull + repaired - incoming)

    return {
      valid: problem === undefined,
      problem,
      powerCost,
      chargeAfter: this.state.charge - powerCost,
      signal,
      gains,
      wasted,
      repaired,
      blocked,
      incoming,
      hullAfter,
      lost: hullAfter <= 0,
    }
  }

  commit(plan: TurnPlan): TurnOutcome {
    const preview = this.preview(plan)
    if (!preview.valid) throw new Error(`Plan is not valid: ${preview.problem}`)

    this.state.charge = preview.chargeAfter
    if (this.craft.repairDrone && plan.has(this.craft.repairDrone.key)) this.state.repairUsed = true
    if (this.craft.thrusters && plan.has(this.craft.thrusters.key)) this.state.burnsLeft -= 1
    for (const [channel, gain] of preview.gains) this.tally.set(channel, (this.tally.get(channel) ?? 0) + gain)
    this.state.hull = preview.hullAfter
    this.damage += preview.incoming
    this.lastKeys = plan.keys

    this.played += 1
    this.finished = preview.lost || this.played >= this.turnCount
    const outcome = { ...preview, encounterOver: this.finished }
    this.outcomes.push(outcome)
    if (!this.finished) {
      this.turn += 1
      this.beginTurn()
    }
    return outcome
  }

  result(): EncounterResult {
    return {
      legIndex: this.legIndex,
      eventId: this.event.id,
      recorded: new Map(this.tally),
      points: Scoring.points(this.event, this.tally, this.craft.pointsMultiplier),
      complete: Scoring.isComplete(this.event, this.tally),
      anyRecorded: [...this.tally.values()].some((amount) => amount > 0),
      missed: Scoring.missed(this.event, this.craft),
      turnsPlayed: this.played,
      damageTaken: this.damage,
    }
  }

  private beginTurn(): void {
    if (!this.current.inShadow) this.state.charge = Math.min(this.craft.capacity, this.state.charge + this.craft.generation)
  }

  private signal(boosted: boolean): number {
    return boosted ? Math.max(this.current.signal, this.contact.peakSignal) : this.current.signal
  }

  private yieldFor(module: InstalledModule, signal: number, recorded: ReadonlyMap<Channel, number>): InstrumentYield {
    const channel = (module.card as Instrument).channel
    const spec = this.event.channels.get(channel)
    if (!spec) return { channel, gain: 0, waste: WasteReason.NoChannel }
    if (module.mark < spec.minMark) return { channel, gain: 0, waste: WasteReason.NeedsMark, neededMark: spec.minMark }
    const room = spec.capacity - (recorded.get(channel) ?? 0)
    if (room <= 0) return { channel, gain: 0, waste: WasteReason.ChannelFull }
    return { channel, gain: Math.min(room, Math.max(1, Numbers.roundHalfUp(module.value * signal))) }
  }
}
