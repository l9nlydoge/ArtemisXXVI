import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import type { DateWindow } from '../Events/DateWindow'
import type { SolarStorm } from '../Events/SolarStorm'
import type { SpaceEvent } from '../Events/SpaceEvent'
import { Forecast } from './Forecast'

export interface Leg {
  window: DateWindow
  pinnedEventIds: readonly string[]
  storm?: SolarStorm
}

export class Week {
  readonly forecast: Forecast
  private readonly byId: ReadonlyMap<string, SpaceEvent>

  constructor(
    readonly id: string,
    readonly minRank: number,
    readonly legs: readonly Leg[],
    readonly events: readonly SpaceEvent[],
  ) {
    if (legs.length !== Rules.legsPerFlight) throw new Error(`Week ${id} needs ${Rules.legsPerFlight} legs, got ${legs.length}`)
    this.byId = new Map([...events, ...this.storms].map((event) => [event.id, event]))
    for (const leg of legs) {
      for (const pinned of leg.pinnedEventIds) {
        if (!this.byId.has(pinned)) throw new Error(`Week ${id} pins ${pinned}, which is not in its events`)
      }
    }
    this.forecast = new Forecast(events, this.storms)
  }

  get storms(): SolarStorm[] {
    return this.legs.flatMap((leg) => (leg.storm ? [leg.storm] : []))
  }

  get everything(): SpaceEvent[] {
    return [...this.events, ...this.storms]
  }

  get signature(): string {
    const parts = this.legs.flatMap((leg, index) => [`L${index}`, leg.window.startUtc, leg.window.endUtc, ...leg.pinnedEventIds, leg.storm?.id ?? '-'])
    for (const event of this.everything) {
      parts.push(event.id, String(event.rarity), event.dateUtc ?? '-')
      for (const [channel, spec] of event.channels) parts.push(channel, String(spec.capacity), String(spec.minMark))
      for (const turn of event.turns) parts.push(turn.signal.toFixed(4), String(turn.radiation))
    }
    return SeededRandom.hashText(parts.join('|')).toString(36)
  }

  get startUtc(): string {
    return this.legs[0].window.startUtc
  }

  get endUtc(): string {
    return this.legs[this.legs.length - 1].window.endUtc
  }

  event(id: string): SpaceEvent | undefined {
    return this.byId.get(id)
  }

  stormOn(legIndex: number): SolarStorm | undefined {
    return this.legs[legIndex]?.storm
  }

  pinnedOn(legIndex: number): SpaceEvent[] {
    return this.legs[legIndex].pinnedEventIds.map((id) => this.byId.get(id)!)
  }

  eligible(legIndex: number, alreadyDealt: ReadonlySet<string>): SpaceEvent[] {
    const window = this.legs[legIndex].window
    const pinnedElsewhere = new Set(this.legs.flatMap((leg, index) => (index === legIndex ? [] : leg.pinnedEventIds)))
    return this.events.filter((event) => {
      if (alreadyDealt.has(event.id) || pinnedElsewhere.has(event.id)) return false
      return event.dateUtc === undefined || window.contains(event.dateUtc)
    })
  }
}
