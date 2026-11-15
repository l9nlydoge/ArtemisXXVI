import { EventKind, type SpaceEvent } from '../../Engine/Events/SpaceEvent'
import type { Week } from '../../Engine/Weeks/Week'

export class SourceFigures {
  private readonly events = new Map<string, SpaceEvent>()
  readonly weeks: number
  readonly stormLegs: number

  constructor(weeks: readonly Week[]) {
    for (const week of weeks) for (const event of week.everything) this.events.set(event.id, event)
    this.weeks = weeks.length
    this.stormLegs = weeks.reduce((sum, week) => sum + week.legs.filter((leg) => leg.storm).length, 0)
  }

  count(kind: EventKind): number {
    return [...this.events.values()].filter((event) => event.kind === kind).length
  }

  event(id: string): SpaceEvent | undefined {
    return this.events.get(id)
  }

  get params(): Record<string, number> {
    return {
      weeks: this.weeks,
      asteroids: this.count(EventKind.Asteroid),
      storms: this.stormLegs,
      planets: this.count(EventKind.Exoplanet),
      rare: this.count(EventKind.Rare),
    }
  }
}
