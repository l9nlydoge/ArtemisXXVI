import type { Channel } from '../Events/Channel'
import type { Mark } from '../Modules/MarkSpec'

export enum PlanProblem {
  UnknownModule = 'UnknownModule',
  NotEnoughCharge = 'NotEnoughCharge',
  NoBurnsLeft = 'NoBurnsLeft',
  RepairUsed = 'RepairUsed',
  CoolingDown = 'CoolingDown',
  EncounterOver = 'EncounterOver',
}

export enum WasteReason {
  NoChannel = 'NoChannel',
  ChannelFull = 'ChannelFull',
  NeedsMark = 'NeedsMark',
}

export interface InstrumentYield {
  channel: Channel
  gain: number
  waste?: WasteReason
  neededMark?: Mark
}

export interface TurnPreview {
  valid: boolean
  problem?: PlanProblem
  powerCost: number
  chargeAfter: number
  signal: number
  gains: ReadonlyMap<Channel, number>
  wasted: readonly string[]
  repaired: number
  blocked: number
  incoming: number
  hullAfter: number
  lost: boolean
}

export interface TurnOutcome extends TurnPreview {
  encounterOver: boolean
}
