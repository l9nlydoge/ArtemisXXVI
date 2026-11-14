import { TextRef } from '../Core/TextRef'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { Channel } from '../Events/Channel'
import { ExoplanetTransit } from '../Events/ExoplanetTransit'
import { RareEvent } from '../Events/RareEvent'
import { Rarity } from '../Events/Rarity'
import type { AsteroidRecord, ExoplanetRecord, SpaceWeather } from '../Events/Records'
import type { ChannelSpec, EventTurn, SpaceEvent } from '../Events/SpaceEvent'
import { Contact } from '../Flight/Contact'
import type { FlightSetup } from '../Flight/FlightSetup'
import type { TurnCondition } from '../Flight/TurnCondition'
import type { Mark } from '../Modules/MarkSpec'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import { Loadout } from '../Spacecraft/Loadout'
import type { Ownership } from '../Spacecraft/LoadoutIssue'
import { WeekBuilder } from '../Weeks/WeekBuilder'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import type { WeekDefinition } from '../Weeks/WeekDefinition'

const asteroid = (id: string, name: string, dateUtc: string, speedKmS: number, missLunar: number, diameterMinM: number, diameterMaxM: number, hazardous = false): AsteroidRecord => ({
  id,
  name,
  dateUtc,
  speedKmS,
  missLunar,
  missKm: missLunar * 384400,
  diameterMinM,
  diameterMaxM,
  hazardous,
  url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${id}`,
  weekId: 'Calm',
})

const sampleDays = [20, 21, 22, 23, 24, 25]

export class Fixtures {
  static readonly okId = '3843336'

  static readonly realAsteroids: readonly AsteroidRecord[] = [
    { ...asteroid(Fixtures.okId, '2019 OK', '2019-07-25T01:22:00Z', 24.5347, 0.1855, 58, 130), missKm: 71354.98 },
    { ...asteroid('3843328', '2019 OD', '2019-07-24T13:31:00Z', 19.192, 0.9303, 56, 124), missKm: 357784.86 },
    { ...asteroid('3843361', '2019 OK1', '2019-07-22T12:00:00Z', 6.1762, 10.0, 38, 86), missKm: 3845781.2 },
  ]

  static readonly sampleAsteroids: readonly AsteroidRecord[] = sampleDays.flatMap((day, index) => [
    asteroid(`S${day}A`, `Sample ${day}A`, `2019-07-${day}T04:00:00Z`, 8 + index, 3 + index, 20, 40),
    asteroid(`S${day}B`, `Sample ${day}B`, `2019-07-${day}T09:00:00Z`, 14 + index, 6 + index * 2, 90, 200, index % 2 === 0),
    asteroid(`S${day}C`, `Sample ${day}C`, `2019-07-${day}T17:00:00Z`, 21, 12 + index, 300, 700),
    asteroid(`S${day}D`, `Sample ${day}D`, `2019-07-${day}T21:00:00Z`, 11, 30 + index, 10, 20),
  ])

  static readonly asteroids: readonly AsteroidRecord[] = [...Fixtures.realAsteroids, ...Fixtures.sampleAsteroids]

  static readonly exoplanets: readonly ExoplanetRecord[] = [
    { name: 'TRAPPIST-1 b', host: 'TRAPPIST-1', method: 'Transit', year: 2016, facility: 'La Silla Observatory', radiusEarth: 1.116, periodDays: 1.510826, distanceParsec: 12.42988881, starVmag: 17.02, url: 'https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1%20b' },
    { name: 'Sample RV b', host: 'Sample RV', method: 'Radial Velocity', year: 1995, facility: 'Sample Observatory', radiusEarth: null, periodDays: 4.23, distanceParsec: 15.5, starVmag: 5.5, url: 'https://exoplanetarchive.ipac.caltech.edu/' },
    { name: 'Sample Imaged b', host: 'Sample Imaged', method: 'Imaging', year: 2008, facility: 'Sample Observatory', radiusEarth: 13, periodDays: null, distanceParsec: 41, starVmag: 5.96, url: 'https://exoplanetarchive.ipac.caltech.edu/' },
    { name: 'Sample Lens b', host: 'Sample Lens', method: 'Microlensing', year: 2005, facility: 'Sample Observatory', radiusEarth: null, periodDays: null, distanceParsec: null, starVmag: null, url: 'https://exoplanetarchive.ipac.caltech.edu/' },
    { name: 'Sample Odd b', host: 'Sample Odd', method: 'Astrometry', year: 2013, facility: 'Sample Observatory', radiusEarth: null, periodDays: null, distanceParsec: 6, starVmag: 9, url: 'https://exoplanetarchive.ipac.caltech.edu/' },
  ]

  static readonly mayWeather: SpaceWeather = {
    storms: [
      {
        id: '2024-05-10T15:00:00-GST-001',
        weekId: 'Storm',
        startUtc: '2024-05-10T15:00:00Z',
        kpReadings: [
          { timeUtc: '2024-05-10T18:00:00Z', kp: 7.67 },
          { timeUtc: '2024-05-10T21:00:00Z', kp: 8.67 },
          { timeUtc: '2024-05-11T00:00:00Z', kp: 9.0 },
          { timeUtc: '2024-05-11T03:00:00Z', kp: 9.0 },
        ],
        url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/GST/30693/-1',
      },
      {
        id: '2024-05-12T21:00:00-GST-001',
        weekId: 'Storm',
        startUtc: '2024-05-12T21:00:00Z',
        kpReadings: [
          { timeUtc: '2024-05-13T00:00:00Z', kp: 6.33 },
          { timeUtc: '2024-05-13T03:00:00Z', kp: 5.67 },
          { timeUtc: '2024-05-13T06:00:00Z', kp: 6.0 },
        ],
        url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/GST/30798/-1',
      },
    ],
    particleEvents: [
      { id: '2024-05-09T13:59:00-SEP-001', weekId: 'Storm', timeUtc: '2024-05-09T13:59:00Z', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1' },
      { id: '2024-05-09T14:25:00-SEP-001', weekId: 'Storm', timeUtc: '2024-05-09T14:25:00Z', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30610/-1' },
      { id: '2024-05-10T12:59:00-SEP-001', weekId: 'Storm', timeUtc: '2024-05-10T12:59:00Z', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30675/-1' },
    ],
    flares: [],
    flaresAvailable: false,
  }

  static readonly quietWeather: SpaceWeather = { storms: [], particleEvents: [], flares: [], flaresAvailable: false }

  static readonly calmDefinition: WeekDefinition = {
    id: 'Calm',
    minRank: 1,
    legs: sampleDays.map((day, index) => ({
      startUtc: `2019-07-${day}T00:00:00Z`,
      endUtc: `2019-07-${day + 1}T00:00:00Z`,
      pinned: index === 5 ? [AsteroidFlyby.idFor(Fixtures.okId)] : index === 2 ? ['Rare.Sample'] : [],
    })),
  }

  static readonly stormDefinition: WeekDefinition = {
    id: 'Storm',
    minRank: 4,
    legs: [8, 9, 10, 11, 12, 13].map((day) => ({
      startUtc: `2024-05-${String(day).padStart(2, '0')}T00:00:00Z`,
      endUtc: `2024-05-${String(day + 1).padStart(2, '0')}T00:00:00Z`,
    })),
  }

  static event(id: string, channels: [Channel, number, Mark?][], turns: EventTurn[], rarity = Rarity.Common, dateUtc?: string): RareEvent {
    return new RareEvent({
      id,
      label: TextRef.literal(id),
      dateUtc,
      rarity,
      channels: new Map<Channel, ChannelSpec>(channels.map(([channel, capacity, minMark]) => [channel, { capacity, minMark: minMark ?? 1 }])),
      turns,
      facts: [],
      learned: new TextRef(`Learned.${id}`),
      sourceUrl: 'https://science.nasa.gov/',
      imageId: 'Sample',
    })
  }

  static readonly rareSample = Fixtures.event('Rare.Sample', [[Channel.Visible, 12], [Channel.Spectrum, 8]], [{ signal: 1, radiation: 0 }, { signal: 3, radiation: 0 }, { signal: 1, radiation: 0 }], Rarity.Headline, '2019-07-22T23:14:00Z')

  static readonly planets: readonly SpaceEvent[] = Fixtures.exoplanets.map((record, index) => ExoplanetTransit.fromRecord(record, { famous: index === 0, atmosphere: false }))

  static readonly calmWeek = new WeekBuilder({ asteroids: Fixtures.asteroids, weather: Fixtures.quietWeather, undated: Fixtures.planets, rare: [Fixtures.rareSample] }).build(Fixtures.calmDefinition)

  static readonly stormWeek = new WeekBuilder({
    asteroids: Fixtures.sampleAsteroids.map((record) => ({ ...record, dateUtc: record.dateUtc.replace(/^2019-07-(\d\d)/, (_, day: string) => `2024-05-${String(Number(day) - 12).padStart(2, '0')}`) })),
    weather: Fixtures.mayWeather,
    undated: Fixtures.planets,
    rare: [],
  }).build(Fixtures.stormDefinition)

  static readonly weeks = new WeekCatalog([Fixtures.calmWeek, Fixtures.stormWeek])

  static readonly everything: Ownership = { rank: 6, owns: () => true }

  static loadout(busId: string, modules: [string, Mark][]): Loadout {
    return modules.reduce((loadout, [id, mark]) => loadout.install(ModuleCatalog.shared.get(id), mark), new Loadout(BusCatalog.shared.get(busId), []))
  }

  static setup(loadout: Loadout, weekId: string, seed: number): FlightSetup {
    return { loadout: loadout.toJson(), weekId, seed }
  }

  static conditions(rows: [number, number, boolean?][]): TurnCondition[] {
    return rows.map(([signal, radiation, inShadow]) => ({ signal, radiation, inShadow: inShadow ?? false, anomaly: false }))
  }

  static contact(event: SpaceEvent, rows?: [number, number, boolean?][]): Contact {
    return new Contact(event, true, Fixtures.conditions(rows ?? event.turns.map((turn) => [turn.signal, turn.radiation])))
  }
}
