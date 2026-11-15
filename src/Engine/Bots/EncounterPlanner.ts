import { Numbers } from '../Core/Numbers'
import { Rules } from '../Core/Rules'
import type { Channel } from '../Events/Channel'
import type { SpaceEvent } from '../Events/SpaceEvent'
import type { Contact } from '../Flight/Contact'
import type { CraftState } from '../Flight/CraftState'
import type { Encounter } from '../Flight/Encounter'
import { ConditionRoller } from '../Flight/TurnCondition'
import { Instrument } from '../Modules/Instrument'
import { MagneticShield } from '../Modules/ProtectionModules'
import { RepairDrone, Thrusters } from '../Modules/UtilityModules'
import type { Spacecraft } from '../Spacecraft/Spacecraft'

export interface PlannerTurn {
  signal: number
  radiation: number
  sunlight: number
}

export interface PlannerValues {
  charge: number
  cruise: number
  hull: number
  hullNeed: number
  hullShort: number
  death: number
}

export interface PlannerStart {
  turnIndex: number
  charge: number
  hull: number
  burnsLeft: number
  repairUsed: boolean
  recorded: readonly number[]
  cooling: number
}

export interface PlanChoice {
  mask: number
  keys: string[]
  value: number
}

export interface PlannerResult {
  best: PlanChoice
  choices: PlanChoice[]
  finalCharge: number
  finalHull: number
  points: number
}

enum ActiveKind {
  Instrument,
  Shield,
  Thrusters,
  Drone,
}

interface ActiveSlot {
  key: string
  kind: ActiveKind
  cost: number
  value: number
  channel: number
}

interface Node {
  charge: number
  hull: number
  burns: number
  repairUsed: boolean
  recorded: number[]
  last: number
  first: number
  dead: boolean
}

export class EncounterPlanner {
  static unknownSunlight = 1
  private readonly slots: ActiveSlot[]
  private readonly capacities: number[]

  constructor(
    private readonly event: SpaceEvent,
    private readonly turns: readonly PlannerTurn[],
    private readonly peakSignal: number,
    private readonly craft: Spacecraft,
    private readonly values: PlannerValues,
    private readonly cooldowns = false,
    private readonly beamWidth = 48,
  ) {
    const channels = [...event.channels.keys()]
    this.capacities = channels.map((channel) => event.channels.get(channel)!.capacity)
    this.slots = []
    for (const module of craft.actives) {
      if (module.card instanceof Instrument) {
        const index = channels.indexOf(module.card.channel as Channel)
        const ok = index >= 0 && module.mark >= event.channels.get(module.card.channel)!.minMark
        if (ok) this.slots.push({ key: module.key, kind: ActiveKind.Instrument, cost: module.card.powerCost, value: module.value, channel: index })
      } else if (module.card instanceof MagneticShield) {
        this.slots.push({ key: module.key, kind: ActiveKind.Shield, cost: module.card.powerCost, value: module.value, channel: -1 })
      } else if (module.card instanceof Thrusters) {
        this.slots.push({ key: module.key, kind: ActiveKind.Thrusters, cost: module.card.powerCost, value: module.value, channel: -1 })
      } else if (module.card instanceof RepairDrone) {
        this.slots.push({ key: module.key, kind: ActiveKind.Drone, cost: module.card.powerCost, value: module.value, channel: -1 })
      }
    }
  }

  static expectedTurns(contact: Contact, visibleUpTo: number, known: readonly ({ signal: number; radiation: number; inShadow: boolean } | undefined)[] = []): PlannerTurn[] {
    const event = contact.event
    return event.turns.map((turn, index) => {
      const seen = index <= visibleUpTo ? (known[index] ?? contact.conditions[index]) : undefined
      if (seen) return { signal: seen.signal, radiation: seen.radiation, sunlight: seen.inShadow ? 0 : 1 }
      const weather = contact.overlay ? ConditionRoller.weather(contact.overlay, index, event.turnCount) : 0
      const previousDark = index > 0 && index - 1 <= visibleUpTo && (known[index - 1] ?? contact.conditions[index - 1]).inShadow
      const sunlight = index === 0 || previousDark ? 1 : EncounterPlanner.unknownSunlight
      return { signal: turn.signal, radiation: turn.radiation + weather, sunlight }
    })
  }

  static forEncounter(encounter: Encounter, craft: Spacecraft, state: CraftState, values: PlannerValues, cooldowns: boolean, beamWidth?: number): { planner: EncounterPlanner; start: PlannerStart } {
    const visible = encounter.visible
    const lastVisible = visible.reduce((last, condition, index) => (condition ? index : last), 0)
    const turns = EncounterPlanner.expectedTurns(encounter.contact, lastVisible)
    const planner = new EncounterPlanner(encounter.event, turns, encounter.contact.peakSignal, craft, values, cooldowns, beamWidth)
    const channels = [...encounter.event.channels.keys()]
    let cooling = 0
    if (cooldowns) planner.slots.forEach((slot, index) => (encounter.isCooling(slot.key) ? (cooling |= 1 << index) : undefined))
    return {
      planner,
      start: {
        turnIndex: encounter.turnIndex,
        charge: state.charge,
        hull: state.hull,
        burnsLeft: state.burnsLeft,
        repairUsed: state.repairUsed,
        recorded: channels.map((channel) => encounter.recorded.get(channel) ?? 0),
        cooling,
      },
    }
  }

  static fresh(contact: Contact, craft: Spacecraft, state: { charge: number; hull: number; burnsLeft: number; repairUsed: boolean }, values: PlannerValues, cooldowns: boolean, beamWidth?: number): { planner: EncounterPlanner; start: PlannerStart } {
    const turns = EncounterPlanner.expectedTurns(contact, craft.lookahead >= contact.turnCount ? contact.turnCount : 0)
    const visibleTurns = turns.map((turn, index) => (index === 0 ? { ...turn, sunlight: 1 } : turn))
    const planner = new EncounterPlanner(contact.event, visibleTurns, contact.peakSignal, craft, values, cooldowns, beamWidth)
    const charge = Math.min(craft.capacity, state.charge + craft.generation)
    return {
      planner,
      start: { turnIndex: 0, charge, hull: state.hull, burnsLeft: state.burnsLeft, repairUsed: state.repairUsed, recorded: planner.capacities.map(() => 0), cooling: 0 },
    }
  }

  points(recorded: readonly number[]): number {
    const rarity = this.event.rarity
    let base = 0
    let full = 0
    recorded.forEach((amount, index) => {
      base += Math.min(amount, this.capacities[index]) * rarity
      if (amount >= this.capacities[index]) full += 1
    })
    const bonus = full * Rules.channelBonus * rarity + (full === this.capacities.length ? Rules.fullBonus * rarity : 0)
    return Numbers.roundHalfUp((base + bonus) * this.craft.pointsMultiplier)
  }

  private score(node: Node): number {
    if (node.dead) return this.points(node.recorded) * Rules.lostShare - this.values.death
    return this.points(node.recorded) + this.chargeWorth(node.charge) + this.hullWorth(node.hull)
  }

  hullWorth(hull: number): number {
    return this.values.hullShort * Math.min(hull, this.values.hullNeed) + this.values.hull * Math.max(0, hull - this.values.hullNeed)
  }

  chargeWorth(charge: number): number {
    return this.values.charge * Math.min(this.craft.capacity, charge + this.values.cruise)
  }

  plan(start: PlannerStart): PlannerResult {
    let beam: Node[] = [{ charge: start.charge, hull: start.hull, burns: start.burnsLeft, repairUsed: start.repairUsed, recorded: [...start.recorded], last: start.cooling, first: -1, dead: false }]
    const finals: Node[] = []
    for (let turn = start.turnIndex; turn < this.turns.length; turn++) {
      const condition = this.turns[turn]
      const children = new Map<string, Node>()
      for (const node of beam) {
        if (turn > start.turnIndex) node.charge = Math.min(this.craft.capacity, node.charge + this.craft.generation * condition.sunlight)
        for (const child of this.expand(node, condition, turn === start.turnIndex)) {
          if (child.dead) {
            finals.push(child)
            continue
          }
          const key = `${child.first}|${child.charge.toFixed(2)}|${child.hull}|${child.burns}|${child.repairUsed ? 1 : 0}|${child.recorded.join(',')}|${this.cooldowns ? child.last : 0}`
          const existing = children.get(key)
          if (!existing) children.set(key, child)
        }
      }
      beam = [...children.values()].sort((a, b) => this.score(b) - this.score(a)).slice(0, this.beamWidth)
    }
    finals.push(...beam)
    const byFirst = new Map<number, Node>()
    for (const node of finals) {
      const existing = byFirst.get(node.first)
      if (!existing || this.score(node) > this.score(existing)) byFirst.set(node.first, node)
    }
    const choices = [...byFirst.entries()].map(([mask, node]) => ({ mask, keys: this.keysOf(mask), value: this.score(node) })).sort((a, b) => b.value - a.value || a.keys.length - b.keys.length)
    const bestNode = byFirst.get(choices[0].mask)!
    return { best: choices[0], choices, finalCharge: bestNode.charge, finalHull: bestNode.dead ? 0 : bestNode.hull, points: this.points(bestNode.recorded) }
  }

  keysOf(mask: number): string[] {
    return this.slots.filter((_, index) => (mask & (1 << index)) !== 0).map((slot) => slot.key)
  }

  private expand(node: Node, condition: PlannerTurn, first: boolean): Node[] {
    const useful: number[] = []
    const afterPassive = Math.max(0, condition.radiation - this.craft.passiveShield)
    this.slots.forEach((slot, index) => {
      if (this.cooldowns && (node.last & (1 << index)) !== 0) return
      if (slot.kind === ActiveKind.Instrument && node.recorded[slot.channel] >= this.capacities[slot.channel]) return
      if (slot.kind === ActiveKind.Shield && afterPassive === 0) return
      if (slot.kind === ActiveKind.Thrusters && (node.burns < 1 || condition.signal >= this.peakSignal)) return
      if (slot.kind === ActiveKind.Drone && (node.repairUsed || node.hull >= this.craft.maxHull)) return
      useful.push(index)
    })
    const children: Node[] = []
    const count = 1 << useful.length
    for (let subset = 0; subset < count; subset++) {
      let mask = 0
      let cost = 0
      for (let bit = 0; bit < useful.length; bit++) {
        if ((subset & (1 << bit)) !== 0) {
          mask |= 1 << useful[bit]
          cost += this.slots[useful[bit]].cost
        }
      }
      if (cost > node.charge + 1e-9) continue
      children.push(this.apply(node, mask, cost, condition, afterPassive, first))
    }
    return children
  }

  private apply(node: Node, mask: number, cost: number, condition: PlannerTurn, afterPassive: number, first: boolean): Node {
    const has = (kind: ActiveKind) => this.slots.findIndex((slot, index) => slot.kind === kind && (mask & (1 << index)) !== 0)
    const thrust = has(ActiveKind.Thrusters)
    const shield = has(ActiveKind.Shield)
    const drone = has(ActiveKind.Drone)
    const signal = thrust >= 0 ? Math.max(condition.signal, this.peakSignal) : condition.signal
    const recorded = [...node.recorded]
    this.slots.forEach((slot, index) => {
      if (slot.kind !== ActiveKind.Instrument || (mask & (1 << index)) === 0) return
      const room = this.capacities[slot.channel] - recorded[slot.channel]
      if (room > 0) recorded[slot.channel] += Math.min(room, Math.max(1, Numbers.roundHalfUp(slot.value * signal)))
    })
    const repaired = drone >= 0 ? Math.min(this.slots[drone].value, this.craft.maxHull - node.hull) : 0
    const blocked = shield >= 0 ? Math.min(afterPassive, this.slots[shield].value) : 0
    const hull = Math.max(0, node.hull + repaired - (afterPassive - blocked))
    return {
      charge: node.charge - cost,
      hull,
      burns: node.burns - (thrust >= 0 ? 1 : 0),
      repairUsed: node.repairUsed || drone >= 0,
      recorded,
      last: mask,
      first: first ? mask : node.first,
      dead: hull <= 0,
    }
  }
}
