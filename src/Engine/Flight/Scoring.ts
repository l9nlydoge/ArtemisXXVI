import { Numbers } from '../Core/Numbers'
import { Rules } from '../Core/Rules'
import type { Channel } from '../Events/Channel'
import type { SpaceEvent } from '../Events/SpaceEvent'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import type { Mark } from '../Modules/MarkSpec'
import type { Spacecraft } from '../Spacecraft/Spacecraft'

export interface MissedChannel {
  channel: Channel
  moduleId: string
  neededMark: Mark
  points: number
}

export interface Potential {
  reachable: number
  total: number
}

export class Scoring {
  static points(event: SpaceEvent, recorded: ReadonlyMap<Channel, number>, multiplier = 1): number {
    const rarity = event.rarity
    let base = 0
    let full = 0
    for (const [channel, spec] of event.channels) {
      const amount = Math.min(spec.capacity, recorded.get(channel) ?? 0)
      base += amount * rarity
      if (amount >= spec.capacity) full += 1
    }
    const bonus = full * Rules.channelBonus * rarity + (full === event.channels.size ? Rules.fullBonus * rarity : 0)
    return Numbers.roundHalfUp((base + bonus) * multiplier)
  }

  static isComplete(event: SpaceEvent, recorded: ReadonlyMap<Channel, number>): boolean {
    return [...event.channels].every(([channel, spec]) => (recorded.get(channel) ?? 0) >= spec.capacity)
  }

  static potential(event: SpaceEvent, craft: Spacecraft): Potential {
    const everything = new Map([...event.channels].map(([channel, spec]) => [channel, spec.capacity]))
    const reachable = new Map([...event.channels].filter(([channel, spec]) => craft.canRecord(channel, spec.minMark)).map(([channel, spec]) => [channel, spec.capacity]))
    return {
      reachable: Scoring.points(event, reachable, craft.pointsMultiplier),
      total: Scoring.points(event, everything, craft.pointsMultiplier),
    }
  }

  static missed(event: SpaceEvent, craft: Spacecraft, catalog: ModuleCatalog = ModuleCatalog.shared): MissedChannel[] {
    return [...event.channels]
      .filter(([channel, spec]) => !craft.canRecord(channel, spec.minMark))
      .map(([channel, spec]) => ({
        channel,
        moduleId: catalog.instrumentFor(channel)?.id ?? channel,
        neededMark: spec.minMark,
        points: (spec.capacity + Rules.channelBonus) * event.rarity,
      }))
  }
}
