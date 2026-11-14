import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { CautiousBot } from '../../Engine/Bots/CautiousBot'
import { GreedyBot } from '../../Engine/Bots/GreedyBot'
import { Rules } from '../../Engine/Core/Rules'
import type { TextRef } from '../../Engine/Core/TextRef'
import { UtcDate } from '../../Engine/Core/UtcDate'
import { Channel } from '../../Engine/Events/Channel'
import { Rarity } from '../../Engine/Events/Rarity'
import { EventKind } from '../../Engine/Events/SpaceEvent'
import { Flight } from '../../Engine/Flight/Flight'
import { Profile } from '../../Engine/Progress/Profile'
import { Rank } from '../../Engine/Progress/Rank'
import { Loadout } from '../../Engine/Spacecraft/Loadout'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import English from '../../I18n/StringsEn.json'
import { Images } from '../Curated/Images'
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
  test('say where and when they came from, and never hold a key', () => {
    for (const file of [AsteroidFile, ExoplanetFile]) {
      expect(file.source.length).toBeGreaterThan(10)
      expect(Number.isNaN(Date.parse(file.retrievedAt))).toBe(false)
      expect(file.requests.length).toBeGreaterThan(0)
    }
    expect(JSON.stringify([AsteroidFile.requests, ExoplanetFile.requests, WeatherFile.requests])).not.toMatch(/api_key/i)
  })

  test('space weather has been downloaded from NASA', () => {
    expect(GameData.weatherPending, 'run node Tools/FetchNasaData.mjs once the API key allows it').toBe(false)
    expect(WeatherFile.requests.length).toBeGreaterThan(0)
  })

  test('every asteroid record has usable numbers and a strict UTC date', () => {
    expect(GameData.asteroids.length).toBeGreaterThan(40)
    for (const record of GameData.asteroids) {
      expect(() => UtcDate.parse(record.dateUtc)).not.toThrow()
      expect(record.speedKmS).toBeGreaterThan(0)
      expect(record.missLunar).toBeGreaterThan(0)
      expect(record.missKm / record.missLunar).toBeCloseTo(384400, -3)
      expect(record.diameterMaxM).toBeGreaterThanOrEqual(record.diameterMinM)
      expect(record.diameterMinM).toBeGreaterThan(0)
      expect(record.url).toMatch(/^https:\/\/ssd\.jpl\.nasa\.gov\//)
    }
    expect(new Set(GameData.asteroids.map((record) => `${record.weekId}:${record.id}`)).size).toBe(GameData.asteroids.length)
  })

  test('all twelve planets came back from the archive', () => {
    expect(GameData.exoplanets).toHaveLength(12)
    for (const record of GameData.exoplanets) {
      expect(record.method.length).toBeGreaterThan(3)
      expect(record.year).toBeGreaterThan(1990)
    }
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
    expect(event.dateUtc).toBe('2019-07-25T01:22:00Z')
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

  test('an asteroid discovered after it passed says so', () => {
    const late = everyEvent.filter(({ event }) => event.learned.key === 'Learned.AsteroidUnseen')
    expect(late.length).toBeGreaterThan(0)
    for (const { week, event } of late) {
      const found = Number(event.learned.params.year)
      expect(found).toBeGreaterThan(new Date(week.startUtc).getUTCFullYear())
      expect(event.facts.some((fact) => fact.key === 'Fact.FoundLater')).toBe(true)
    }
  })

  test('every planet is offered in every week', () => {
    for (const week of weeks.all) expect(week.events.filter((event) => event.kind === EventKind.Exoplanet)).toHaveLength(12)
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
      expect(image!.pageUrl).toMatch(/^https:\/\/images\.nasa\.gov\/details\//)
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

  test('a hand-written line names the NASA page it was checked against', () => {
    const specific = everyEvent.filter(({ event }) => event.learned.key === `Learned.${event.id}`)
    expect(new Set(specific.map(({ event }) => event.id)).size).toBe(LearnedSources.all.length)
    for (const { event } of specific) {
      const source = LearnedSources.for(event.id)
      expect(source, event.id).toBeDefined()
      expect(source!.url).toMatch(/^https:\/\/([a-z-]+\.)*nasa\.gov\//)
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
