import type { TextRef } from '../Core/TextRef'
import type { Mark } from '../Modules/MarkSpec'
import type { Channel } from './Channel'
import { RadiationBands, type RadiationBand } from './RadiationBand'
import type { Rarity } from './Rarity'

export enum EventKind {
  Asteroid = 'Asteroid',
  Storm = 'Storm',
  Exoplanet = 'Exoplanet',
  Rare = 'Rare',
}

export interface ChannelSpec {
  capacity: number
  minMark: Mark
}

export interface EventTurn {
  signal: number
  radiation: number
}

export interface EventDetails {
  id: string
  label: TextRef
  dateUtc?: string
  rarity: Rarity
  channels: ReadonlyMap<Channel, ChannelSpec>
  turns: readonly EventTurn[]
  facts: readonly TextRef[]
  learned: TextRef
  sourceUrl: string
  imageId: string
}

export abstract class SpaceEvent {
  abstract readonly kind: EventKind
  readonly id: string
  readonly label: TextRef
  readonly dateUtc?: string
  readonly rarity: Rarity
  readonly channels: ReadonlyMap<Channel, ChannelSpec>
  readonly turns: readonly EventTurn[]
  readonly facts: readonly TextRef[]
  readonly learned: TextRef
  readonly sourceUrl: string
  readonly imageId: string

  constructor(details: EventDetails) {
    if (details.turns.length === 0) throw new Error(`Event ${details.id} has no turns`)
    if (details.channels.size === 0) throw new Error(`Event ${details.id} has no channels`)
    this.id = details.id
    this.label = details.label
    this.dateUtc = details.dateUtc
    this.rarity = details.rarity
    this.channels = details.channels
    this.turns = details.turns
    this.facts = details.facts
    this.learned = details.learned
    this.sourceUrl = details.sourceUrl
    this.imageId = details.imageId
  }

  get isDated(): boolean {
    return this.dateUtc !== undefined
  }

  get startsUnidentified(): boolean {
    return false
  }

  get turnCount(): number {
    return this.turns.length
  }

  get peakSignal(): number {
    return Math.max(...this.turns.map((turn) => turn.signal))
  }

  get peakRadiation(): number {
    return Math.max(...this.turns.map((turn) => turn.radiation))
  }

  get band(): RadiationBand {
    return RadiationBands.of(this.peakRadiation)
  }

  get totalCapacity(): number {
    return [...this.channels.values()].reduce((sum, channel) => sum + channel.capacity, 0)
  }

  capacity(channel: Channel): number {
    return this.channels.get(channel)?.capacity ?? 0
  }
}
