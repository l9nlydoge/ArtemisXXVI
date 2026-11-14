import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import { UtcDate } from '../Core/UtcDate'
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
    legs.forEach((leg, index) => {
      if (index > 0 && UtcDate.parse(leg.window.startUtc) < UtcDate.parse(legs[index - 1].window.endUtc)) throw new Error(`Week ${id}: leg ${index + 1} starts before leg ${index} ends`)
    })
    const everything = [...events, ...this.storms]
    this.byId = new Map(everything.map((event) => [event.id, event]))
    if (this.byId.size !== everything.length) {
      const repeated = everything.find((event, index) => everything.findIndex((other) => other.id === event.id) !== index)
      throw new Error(`Week ${id} holds ${repeated?.id} more than once`)
    }
    const ordinary = new Set(events.map((event) => event.id))
    const pins = legs.flatMap((leg) => leg.pinnedEventIds)
    for (const pinned of pins) {
      if (!ordinary.has(pinned)) throw new Error(`Week ${id} pins ${pinned}, which is not one of its events`)
    }
    if (new Set(pins).size !== pins.length) throw new Error(`Week ${id} pins an event more than once`)
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
    for (const event of [...this.everything].sort((a, b) => a.id.localeCompare(b.id))) {
      parts.push(event.id, event.kind, String(event.startsUnidentified), String(event.rarity), event.dateUtc ?? '-')
      for (const [channel, spec] of [...event.channels].sort(([a], [b]) => a.localeCompare(b))) parts.push(channel, String(spec.capacity), String(spec.minMark))
      for (const turn of event.turns) parts.push(String(turn.signal), String(turn.radiation))
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
