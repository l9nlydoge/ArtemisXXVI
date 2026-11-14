import { ExoplanetTransit } from '../Engine/Events/ExoplanetTransit'
import type { AsteroidRecord, ExoplanetRecord, FlareRecord, ParticleEventRecord, SpaceWeather, StormRecord } from '../Engine/Events/Records'
import type { SpaceEvent } from '../Engine/Events/SpaceEvent'
import { WeekBuilder } from '../Engine/Weeks/WeekBuilder'
import { WeekCatalog } from '../Engine/Weeks/WeekCatalog'
import type { WeekDefinition } from '../Engine/Weeks/WeekDefinition'
import PlanetList from './Curated/ExoplanetList.json'
import { RareEvents } from './Curated/RareEvents'
import Definitions from './Curated/WeekDefinitions.json'
import AsteroidFile from './Snapshot/Asteroids.json'
import ExoplanetFile from './Snapshot/Exoplanets.json'
import WeatherFile from './Snapshot/SpaceWeather.json'

export interface DataSource {
  id: string
  name: string
  retrievedAt: string | null
  requests: readonly string[]
  homeUrl: string
}

interface WeatherSnapshot {
  retrievedAt: string | null
  pending: boolean
  source: string
  requests: string[]
  storms: StormRecord[]
  particleEvents: ParticleEventRecord[]
  flares: FlareRecord[]
  flaresAvailable: boolean
}

export class GameData {
  static readonly definitions = Definitions as WeekDefinition[]
  static readonly asteroids = AsteroidFile.records as AsteroidRecord[]
  static readonly exoplanets = ExoplanetFile.records as ExoplanetRecord[]
  private static readonly weatherFile = WeatherFile as unknown as WeatherSnapshot
  static readonly weatherPending = GameData.weatherFile.pending
  static readonly planets: readonly SpaceEvent[] = GameData.exoplanets.map((record) => {
    const note = PlanetList.find((entry) => entry.name === record.name)
    return ExoplanetTransit.fromRecord(record, { famous: note?.famous ?? false, atmosphere: note?.atmosphere ?? false })
  })
  static readonly weeks = new WeekCatalog(GameData.definitions.map((definition) => GameData.builderFor(definition.id).build(definition)))

  static readonly sources: readonly DataSource[] = [
    { id: 'Asteroids', name: AsteroidFile.source, retrievedAt: AsteroidFile.retrievedAt, requests: AsteroidFile.requests, homeUrl: 'https://ssd-api.jpl.nasa.gov/doc/cad.html' },
    { id: 'SpaceWeather', name: GameData.weatherFile.source, retrievedAt: GameData.weatherFile.retrievedAt, requests: GameData.weatherFile.requests, homeUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
    { id: 'Exoplanets', name: ExoplanetFile.source, retrievedAt: ExoplanetFile.retrievedAt, requests: ExoplanetFile.requests, homeUrl: 'https://exoplanetarchive.ipac.caltech.edu/' },
    { id: 'Images', name: 'NASA Image and Video Library', retrievedAt: AsteroidFile.retrievedAt, requests: [], homeUrl: 'https://images.nasa.gov/' },
  ]

  static install(): void {
    WeekCatalog.shared = GameData.weeks
  }

  static weatherFor(weekId: string): SpaceWeather {
    const file = GameData.weatherFile
    return {
      storms: file.storms.filter((storm) => storm.weekId === weekId),
      particleEvents: file.particleEvents.filter((event) => event.weekId === weekId),
      flares: file.flares.filter((flare) => flare.weekId === weekId),
      flaresAvailable: file.flaresAvailable,
    }
  }

  private static builderFor(weekId: string): WeekBuilder {
    return new WeekBuilder({
      asteroids: GameData.asteroids.filter((record) => record.weekId === weekId),
      weather: GameData.weatherFor(weekId),
      undated: GameData.planets,
      rare: RareEvents.all,
    })
  }
}
