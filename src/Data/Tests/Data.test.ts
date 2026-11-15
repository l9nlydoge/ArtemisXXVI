import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { CautiousBot } from '../../Engine/Bots/CautiousBot'
import { GreedyBot } from '../../Engine/Bots/GreedyBot'
import { Rules } from '../../Engine/Core/Rules'
import { SeededRandom } from '../../Engine/Core/SeededRandom'
import type { TextRef } from '../../Engine/Core/TextRef'
import { AsteroidFlyby, ObservationHistory } from '../../Engine/Events/AsteroidFlyby'
import { Channel } from '../../Engine/Events/Channel'
import { Rarity } from '../../Engine/Events/Rarity'
import { EventKind } from '../../Engine/Events/SpaceEvent'
import { Flight } from '../../Engine/Flight/Flight'
import { Profile } from '../../Engine/Progress/Profile'
import { Rank } from '../../Engine/Progress/Rank'
import { Loadout } from '../../Engine/Spacecraft/Loadout'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import English from '../../I18n/StringsEn.json'
import PlanetList from '../Curated/ExoplanetList.json'
import { ImageKind, Images } from '../Curated/Images'
import { LearnedSources } from '../Curated/LearnedSources'
import { RareEvents } from '../Curated/RareEvents'
import { GameData } from '../GameData'
import AsteroidFile from '../Snapshot/Asteroids.json'
import ExoplanetFile from '../Snapshot/Exoplanets.json'
import WeatherFile from '../Snapshot/SpaceWeather.json'

const strings: Record<string, string> = English
const weeks = GameData.weeks
const everyEvent = weeks.all.flatMap((week) => week.everything.map((event) => ({ week, event })))
const placeholders = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
const options = { weeks }

function checkText(ref: TextRef, where: string): void {
  const template = strings[ref.key]
  expect(template, `${ref.key} used by ${where}`).toBeDefined()
  for (const name of placeholders(template)) expect(ref.params[name], `${ref.key} needs {${name}} for ${where}`).toBeDefined()
}

describe('Snapshots', () => {
  const files = [AsteroidFile, ExoplanetFile, WeatherFile]

  test('say exactly where and when they came from', () => {
    expect(files.map((file) => file.source)).toEqual([
      'NASA/JPL Center for Near-Earth Object Studies: SBDB Close-Approach Data API and Small-Body Database API',
      'NASA Exoplanet Archive, Planetary Systems Composite Parameters',
      'NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
    ])
    const hosts = ['https://ssd-api.jpl.nasa.gov/', 'https://exoplanetarchive.ipac.caltech.edu/', 'https://ccmc.gsfc.nasa.gov/DONKI/']
    files.forEach((file, index) => {
      expect(file.requests.length).toBeGreaterThan(0)
      for (const request of file.requests) expect(request.startsWith(hosts[index]), request).toBe(true)
      const when = Date.parse(file.retrievedAt)
      expect(when).toBeGreaterThan(Date.parse('2026-11-14T00:00:00Z'))
      expect(when).toBeLessThan(Date.now() + 60000)
      expect(Date.parse(file.firstRetrievedAt)).toBeLessThanOrEqual(when)
    })
  })

  test('hold no key anywhere', () => {
    for (const file of files) expect(JSON.stringify(file)).not.toMatch(/api_key|DEMO_KEY/i)
  })

  test('space weather has been downloaded from NASA', () => {
    expect(GameData.weatherPending).toBe(false)
    expect(WeatherFile.flaresAvailable).toBe(true)
    expect(WeatherFile.requests).toHaveLength(9)
  })

  test('every asteroid record is well formed and belongs to a leg of its week', () => {
    for (const record of GameData.asteroids) {
      const week = weeks.get(record.weekId)
      expect(week.legs.filter((leg) => leg.window.contains(record.dateUtc)), record.name).toHaveLength(1)
      expect(record.id).toBe(record.name.replace(/\s+/g, ''))
      expect(record.name).toMatch(/^\d{4} [A-Z]{2}\d*$/)
      expect(record.speedKmS).toBeGreaterThan(0.3)
      expect(record.speedKmS).toBeLessThan(45)
      expect(record.missLunar).toBeGreaterThan(0)
      expect(record.missLunar).toBeLessThanOrEqual(Rules.asteroidMaxLunar)
      expect(Math.abs(record.missKm / record.missLunar - 384400)).toBeLessThan(400)
      expect(record.diameterMinM).toBeGreaterThan(1)
      expect(record.diameterMaxM).toBeLessThan(2000)
      expect(record.diameterMeasured ? record.diameterMaxM === record.diameterMinM : record.diameterMaxM / record.diameterMinM).toBeCloseTo(record.diameterMeasured ? 1 : Math.sqrt(5), 1)
      for (const day of [record.firstObserved, record.lastObserved]) expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(record.firstObserved <= record.lastObserved).toBe(true)
      expect(record.url).toBe(`https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(record.name)}`)
    }
    expect(new Set(GameData.asteroids.map((record) => `${record.weekId}:${record.id}`)).size).toBe(GameData.asteroids.length)
  })

  test('each leg keeps at most six asteroids, and the counts are the ones downloaded', () => {
    const perLeg = weeks.all.map((week) => week.legs.map((leg) => GameData.asteroids.filter((record) => record.weekId === week.id && leg.window.contains(record.dateUtc)).length))
    expect(perLeg).toEqual([[1, 1, 2, 2, 4, 3], [6, 6, 6, 6, 6, 6], [6, 6, 6, 3, 3, 4]])
  })

  test('known passes carry the numbers NASA/JPL publishes', () => {
    const pass = (name: string) => GameData.asteroids.find((record) => record.name === name)!
    expect(pass('2019 OK')).toMatchObject({ dateUtc: '2019-07-25T01:21:00Z', speedKmS: 24.535, missLunar: 0.1856, missKm: 71355, diameterMinM: 58.2, diameterMaxM: 130, firstObserved: '2017-02-21', lastObserved: '2019-07-25', hazardous: false })
    expect(pass('2019 OD')).toMatchObject({ dateUtc: '2019-07-24T13:30:00Z', speedKmS: 19.193, missKm: 357785, hazardous: false })
    expect(pass('2024 JT3')).toMatchObject({ weekId: 'MayTwentyFour', missLunar: 0.067 })
    expect(GameData.asteroids.filter((record) => record.hazardous).map((record) => record.name)).toEqual(['2019 OT'])
    expect([...GameData.asteroids].sort((a, b) => a.missLunar - b.missLunar)[0].name).toBe('2024 JT3')
  })

  test('every planet on the curated list came back from the archive, and only those', () => {    expect(GameData.exoplanets.map((record) => record.name).sort()).toEqual(PlanetList.map((entry) => entry.name).sort())
    expect(GameData.exoplanets).toHaveLength(11)
    for (const record of GameData.exoplanets) {
      expect(['Transit', 'Radial Velocity', 'Imaging']).toContain(record.method)
      expect(record.year).toBeGreaterThan(1990)
      expect(record.year).toBeLessThan(2027)
      expect(typeof record.transits).toBe('boolean')
      expect(record.url).toBe(`https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(record.name)}`)
    }
  })

  test('planets carry what the archive says about them', () => {
    const planet = (name: string) => GameData.exoplanets.find((record) => record.name === name)!
    expect(planet('51 Peg b')).toMatchObject({ method: 'Radial Velocity', year: 1995, transits: false, radiusEstimated: true })
    expect(planet('HD 209458 b')).toMatchObject({ method: 'Radial Velocity', transits: true })
    expect(planet('HR 8799 b')).toMatchObject({ method: 'Imaging', transits: false })
    expect(planet('TRAPPIST-1 e')).toMatchObject({ method: 'Transit', year: 2017, transits: true, radiusEarth: 0.92 })
    expect(planet('WASP-39 b').starVmag).toBeGreaterThan(12)
  })

  test('the curated flags reach the events', () => {
    const event = (name: string) => GameData.planets.find((each) => each.label.params.text === name)!
    expect(event('WASP-39 b').rarity).toBe(Rarity.Notable)
    expect(event('WASP-39 b').channels.has(Channel.Spectrum)).toBe(true)
    expect(event('HD 209458 b').capacity(Channel.Visible)).toBe(14)
    expect(event('HD 209458 b').capacity(Channel.Spectrum)).toBe(10)
    expect(event('51 Peg b').capacity(Channel.Spectrum)).toBe(14)
    expect(event('51 Peg b').channels.has(Channel.Visible)).toBe(false)
    expect(event('HR 8799 b').channels.get(Channel.Visible)).toEqual({ capacity: 20, minMark: 2 })
    expect(event('Kepler-452 b').rarity).toBe(Rarity.Common)
    expect(GameData.planets.filter((each) => each.rarity === Rarity.Notable)).toHaveLength(PlanetList.filter((entry) => entry.famous).length)
  })
})

describe('Space weather as downloaded', () => {
  const file = WeatherFile

  test('the storms are the three DONKI lists for these weeks', () => {
    expect(file.storms.map((storm) => [storm.id, storm.weekId, storm.kpReadings.length])).toEqual([
      ['2022-09-27T00:00:00-GST-001', 'AutumnTwentyTwo', 1],
      ['2024-05-10T15:00:00-GST-001', 'MayTwentyFour', 13],
      ['2024-05-12T21:00:00-GST-001', 'MayTwentyFour', 3],
    ])
    expect(file.storms[0].kpReadings[0]).toMatchObject({ timeUtc: '2022-09-27T03:00:00Z', kp: 6 })
    expect(Math.max(...file.storms[1].kpReadings.map((reading) => reading.kp))).toBe(9)
    for (const storm of file.storms) expect(storm.url).toMatch(/^https:\/\/ccmc\.gsfc\.nasa\.gov\/DONKI\/view\/GST\/\d+\/-1$/)
  })

  test('particle events and flares are ones detected near Earth, never model forecasts', () => {
    expect(file.particleEvents.length).toBeGreaterThan(0)
    for (const event of [...file.particleEvents, ...file.flares]) {
      expect(event.detectedBy.length).toBeGreaterThan(0)
      for (const instrument of event.detectedBy) expect(instrument).toMatch(/^(GOES|SOHO|ACE)/)
      expect(weeks.has(event.weekId)).toBe(true)
    }
    for (const flare of file.flares) expect(flare.classType).toMatch(/^[MX]\d/)
  })

  test('the storm legs are July none, autumn one, May four', () => {
    const legs = (weekId: string) => weeks.get(weekId).legs.map((leg) => leg.storm?.reading.kp ?? 0)
    expect(legs('JulyNineteen')).toEqual([0, 0, 0, 0, 0, 0])
    expect(legs('AutumnTwentyTwo')).toEqual([0, 6, 0, 0, 0, 0])
    expect(legs('MayTwentyFour')).toEqual([0, 0, 9, 9, 7, 6])
    expect(weeks.get('AutumnTwentyTwo').stormOn(1)?.id).toBe('Storm.2022-09-27')
  })

  test('the great storm of May 2024 follows observed class X flares and particle events', () => {
    const peak = weeks.get('MayTwentyFour').stormOn(3)!
    expect(peak.reading).toMatchObject({ kp: 9, particles: true, flareClass: 'X', flareObserved: true })
    expect(peak.peak).toBe(12)
    expect(peak.turns.map((turn) => turn.radiation)).toEqual([4, 8, 12, 8, 4])
    expect(peak.facts.map((fact) => fact.key)).toEqual(['Fact.Kp', 'Fact.ParticlesYes', 'Fact.FlareObserved'])
    expect(peak.sourceUrl).toBe('https://ccmc.gsfc.nasa.gov/DONKI/view/GST/30693/-1')
  })
})

describe('Weeks built from real data', () => {
  test('there are three, unlocking at ranks 1, 2 and 4', () => {
    expect(weeks.all.map((week) => [week.id, week.minRank])).toEqual([['JulyNineteen', 1], ['AutumnTwentyTwo', 2], ['MayTwentyFour', 4]])
    expect(weeks.availableAt(1).map((week) => week.id)).toEqual(['JulyNineteen'])
    expect(Rank.unlocksAt(2, weeks).some((unlock) => unlock.id === 'AutumnTwentyTwo')).toBe(true)
  })

  test('each has at least eight events and every leg has something to offer', () => {
    for (const week of weeks.all) {
      expect(week.events.length, week.id).toBeGreaterThanOrEqual(Rules.minEventsPerWeek)
      week.legs.forEach((_, index) => expect(week.eligible(index, new Set()).length, `${week.id} leg ${index + 1}`).toBeGreaterThanOrEqual(2))
    }
  })

  test('2019 OK is the pinned headline of 25 July 2019, with the numbers in the spec', () => {
    const week = weeks.get('JulyNineteen')
    const event = week.event('Asteroid.2019OK')!
    expect(week.pinnedOn(5)).toEqual([event])
    expect(event.rarity).toBe(Rarity.Headline)
    expect(event.dateUtc).toBe('2019-07-25T01:21:00Z')
    expect(event.turns.map((turn) => turn.signal)).toEqual([1, 2, 1])
    expect([event.capacity(Channel.Visible), event.capacity(Channel.Spectrum), event.capacity(Channel.Radar)]).toEqual([9, 6, 11])
    expect(event.facts[1].params).toEqual({ km: 71355, lunar: 0.19 })
  })

  test('the DART impact and the gamma-ray burst are pinned in autumn 2022 and nowhere else', () => {
    const week = weeks.get('AutumnTwentyTwo')
    expect(week.pinnedOn(1).map((event) => event.id)).toEqual(['Rare.DartImpact'])
    expect(week.pinnedOn(4).map((event) => event.id)).toEqual(['Rare.Grb221009A'])
    for (const other of ['JulyNineteen', 'MayTwentyFour']) {
      for (const rare of RareEvents.all) expect(weeks.get(other).event(rare.id)).toBeUndefined()
    }
  })

  test('each asteroid card says truthfully when the asteroid was observed', () => {
    const histories = new Map<string, number>()
    for (const { week, event } of everyEvent) {
      if (!(event instanceof AsteroidFlyby)) continue
      const { record } = event
      const passDay = record.dateUtc.slice(0, 10)
      histories.set(event.history, (histories.get(event.history) ?? 0) + 1)
      if (event.history === ObservationHistory.FirstSeenAfter) expect(record.firstObserved > passDay, record.name).toBe(true)
      if (event.history === ObservationHistory.LastSeenBefore) expect(record.lastObserved < passDay, record.name).toBe(true)
      if (event.history === ObservationHistory.SeenBeforeAndAfter) expect(record.firstObserved <= passDay && record.lastObserved >= passDay, record.name).toBe(true)
      expect(event.facts.some((fact) => fact.key === `Fact.Observed.${event.history}`)).toBe(true)
      if (!week.legs.some((leg) => leg.pinnedEventIds.includes(event.id))) expect(event.learned.key).toBe(`Learned.Asteroid.${event.history}`)
    }
    expect(histories.size).toBe(3)
    const ok1 = weeks.get('JulyNineteen').event('Asteroid.2019OK1') as AsteroidFlyby
    expect(ok1.history).toBe(ObservationHistory.FirstSeenAfter)
    expect(ok1.record.firstObserved).toBe('2019-07-26')
  })

  test('no pass is included that NASA/JPL knows only roughly', () => {
    const leftOut = AsteroidFile.leftOut.map((line) => line.split(':')[0])
    expect(leftOut).toEqual(expect.arrayContaining(['2021 JG9', '2026 GY', '2025 SU7', '2023 HG3']))
    for (const name of leftOut) expect(GameData.asteroids.some((record) => record.name === name), name).toBe(false)
  })

  test('every planet is offered in every week', () => {
    for (const week of weeks.all) expect(week.events.filter((event) => event.kind === EventKind.Exoplanet)).toHaveLength(11)
  })

  test('installing the data makes it the shared catalog', () => {
    const before = WeekCatalog.shared
    GameData.install()
    expect(WeekCatalog.shared).toBe(weeks)
    WeekCatalog.shared = before
  })
})

describe('Every event is complete', () => {
  test('has a NASA source link', () => {
    for (const { event } of everyEvent) expect(event.sourceUrl, event.id).toMatch(/^https:\/\/([a-z-]+\.)*(nasa\.gov|caltech\.edu)\//)
  })

  test('has a credited image on disk', () => {
    for (const { event } of everyEvent) {
      const image = Images.get(event.imageId)
      expect(image, `${event.id} wants image ${event.imageId}`).toBeDefined()
      const file = join(process.cwd(), 'public', image!.file)
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(5000)
      expect(statSync(file).size).toBeLessThan(700000)
      expect(image!.credit.length).toBeGreaterThan(3)
      expect(image!.pageUrl).toMatch(/^https:\/\/(images\.nasa\.gov\/details\/|www\.nasa\.gov\/universe\/).{5,}/)
      expect(strings[image!.captionKey], image!.captionKey).toBeDefined()
    }
  })

  test('no image is listed that no event uses, and none is on disk without a credit', () => {
    const used = new Set(everyEvent.map(({ event }) => event.imageId))
    used.add('Storm').add('StormSevere')
    for (const image of Images.all) expect(used.has(image.id), image.id).toBe(true)
    const onDisk = readdirSync(join(process.cwd(), 'public/Images/Events')).map((name) => name.replace(/\.jpg$/, '')).sort()
    expect(onDisk).toEqual(Images.all.map((image) => image.id).sort())
  })

  test('has English text for its name, facts and what was learned', () => {
    for (const { event } of everyEvent) {
      checkText(event.label, event.id)
      event.facts.forEach((fact) => checkText(fact, event.id))
      checkText(event.learned, event.id)
    }
  })

  test('a rare event is dated inside the leg it is pinned to', () => {
    for (const week of weeks.all) {
      week.legs.forEach((leg) => {
        for (const id of leg.pinnedEventIds) expect(leg.window.contains(week.event(id)!.dateUtc!), id).toBe(true)
      })
    }
  })

  test('captions say when an image stands in for the real thing', () => {
    for (const image of Images.all) {
      expect(Object.values(ImageKind)).toContain(image.kind)
      expect(image.nasaId.length).toBeGreaterThan(5)
      expect(/^Representative (image|illustration)/.test(strings[image.captionKey]), image.id).toBe(image.representative)
      if (image.kind === ImageKind.Illustration) expect(strings[image.captionKey]).toMatch(/[Ii]llustration/)
    }
  })

  test('the hand-written lines are the ones that were checked against their sources', () => {
    const lines = Object.keys(strings).filter((key) => /^(Learned\.|Fact\.(Dart|Grb)\.|Image\.|Event\.Rare\.)/.test(key)).sort().map((key) => `${key}=${strings[key]}`)
    const credits = Images.all.map((image) => [image.id, image.nasaId, image.title, image.credit, image.kind, image.representative, image.pageUrl].join('|'))
    const sources = LearnedSources.all.map((source) => `${source.eventId}|${source.url}|${source.checkedOn}`)
    const flags = PlanetList.map((entry) => `${entry.name}|${entry.famous}|${entry.atmosphere}`)
    const rare = RareEvents.all.map((event) => `${event.id}|${event.dateUtc}|${event.sourceUrl}`)
    const checked = [...lines, ...credits, ...sources, ...flags, ...rare].join('\n')
    expect(SeededRandom.hashText(checked), 'A checked line, credit, source or flag changed. Verify it against its source again, then update this number.').toBe(3850285133)
  })

  test('a hand-written line names the NASA page it was checked against', () => {
    const specific = everyEvent.filter(({ event }) => event.learned.key === `Learned.${event.id}`)
    expect(new Set(specific.map(({ event }) => event.id)).size).toBe(LearnedSources.all.length)
    for (const { event } of specific) {
      const source = LearnedSources.for(event.id)
      expect(source, event.id).toBeDefined()
      expect(source!.url).toMatch(/^https:\/\/([a-z-]+\.)*nasa\.gov\/.{12,}/)
      expect(source!.checkedOn).toMatch(/^2026-11-\d{2}$/)
    }
  })
})

describe('Flying the real weeks', () => {
  const seeds = Array.from({ length: 200 }, (_, index) => index + 1)
  const starter = Loadout.starter()

  test('the starter spacecraft completes July 2019 and earns enough for an unlock', () => {
    const week = weeks.get('JulyNineteen')
    const reports = seeds.map((seed) => new GreedyBot().fly(Flight.setup(starter, week, seed), { ...options, owner: Profile.starter() }).report)
    const mean = reports.reduce((sum, report) => sum + report.pointsBanked, 0) / reports.length
    expect(reports.filter((report) => report.survived).length / reports.length).toBeGreaterThanOrEqual(0.95)
    expect(mean).toBeGreaterThan(60)
    expect(mean).toBeLessThan(170)
  })

  test('both bots finish every real week, and each flight replays from its log', () => {
    const kit = Loadout.fromJson({ busId: 'Explorer', modules: [['SolarArray', 2], ['Battery', 2], ['Camera', 1], ['Radar', 1], ['ParticleDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1]].map(([id, mark]) => ({ id, mark, copy: 1 })) })
    for (const week of weeks.all) {
      for (const bot of [new GreedyBot(), new CautiousBot()]) {
        for (const seed of seeds.slice(0, 40)) {
          const setup = Flight.setup(kit, week, seed)
          const { flight, report } = bot.fly(setup, options)
          expect(flight.isOver).toBe(true)
          const replayed = Flight.replay(JSON.parse(JSON.stringify(setup)), JSON.parse(JSON.stringify(flight.log)), options)
          expect(replayed.report().pointsBanked).toBe(report.pointsBanked)
        }
      }
    }
  })
})
