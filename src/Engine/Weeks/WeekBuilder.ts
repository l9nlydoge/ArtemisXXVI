import { Rules } from '../Core/Rules'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { DateWindow } from '../Events/DateWindow'
import type { AsteroidRecord, SpaceWeather } from '../Events/Records'
import { SolarStorm } from '../Events/SolarStorm'
import type { SpaceEvent } from '../Events/SpaceEvent'
import { Week, type Leg } from './Week'
import type { WeekDefinition } from './WeekDefinition'

export interface WeekSources {
  asteroids: readonly AsteroidRecord[]
  weather: SpaceWeather
  undated: readonly SpaceEvent[]
  rare: readonly SpaceEvent[]
}

export class WeekBuilder {
  constructor(private readonly sources: WeekSources) {}

  build(definition: WeekDefinition): Week {
    const windows = definition.legs.map((leg) => new DateWindow(leg.startUtc, leg.endUtc))
    const pinned = new Set(definition.legs.flatMap((leg) => leg.pinned ?? []))
    const asteroids = windows.flatMap((window) => this.asteroidsIn(window, pinned))
    const rare = this.sources.rare.filter((event) => event.dateUtc !== undefined && windows.some((window) => window.contains(event.dateUtc!)))
    const legs: Leg[] = definition.legs.map((leg, index) => ({
      window: windows[index],
      pinnedEventIds: leg.pinned ?? [],
      storm: SolarStorm.forWindow(windows[index], this.sources.weather),
    }))
    return new Week(definition.id, definition.minRank, legs, [...asteroids, ...rare, ...this.sources.undated])
  }

  private asteroidsIn(window: DateWindow, pinned: ReadonlySet<string>): AsteroidFlyby[] {
    const inWindow = this.sources.asteroids.filter((record) => window.contains(record.dateUtc))
    const isPinned = (record: AsteroidRecord) => pinned.has(AsteroidFlyby.idFor(record.id))
    const kept = inWindow.filter(isPinned)
    const others = inWindow
      .filter((record) => !isPinned(record) && record.missLunar <= Rules.asteroidMaxLunar)
      .sort((a, b) => a.missLunar - b.missLunar)
      .slice(0, Math.max(0, Rules.asteroidsPerLeg - kept.length))
    return [...kept, ...others].map((record) => AsteroidFlyby.fromRecord(record, isPinned(record)))
  }
}
