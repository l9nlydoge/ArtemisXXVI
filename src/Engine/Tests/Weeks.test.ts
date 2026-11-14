import { describe, expect, test } from 'vitest'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { Channel } from '../Events/Channel'
import { RadiationBand } from '../Events/RadiationBand'
import { Rarity } from '../Events/Rarity'
import { EventKind } from '../Events/SpaceEvent'
import { Week } from '../Weeks/Week'
import { WeekBuilder } from '../Weeks/WeekBuilder'
import { Fixtures } from './Fixtures'

const calm = Fixtures.calmWeek
const storm = Fixtures.stormWeek
const okId = AsteroidFlyby.idFor(Fixtures.okId)

describe('Week builder', () => {
  test('a quiet week has six legs and no storms', () => {
    expect(calm.legs).toHaveLength(6)
    expect(calm.storms).toEqual([])
    expect(calm.startUtc).toBe('2019-07-20T00:00:00Z')
    expect(calm.endUtc).toBe('2019-07-26T00:00:00Z')
  })

  test('asteroids beyond 20 lunar distances are dropped', () => {
    const asteroids = calm.events.filter((event) => event.kind === EventKind.Asteroid)
    expect(asteroids).toHaveLength(21)
    expect(asteroids.some((event) => event.label.params.text === 'Sample 20D')).toBe(false)
  })

  test('a pinned asteroid becomes a headline event', () => {
    expect(calm.event(okId)?.rarity).toBe(Rarity.Headline)
    expect(calm.pinnedOn(5).map((event) => event.id)).toEqual([okId])
    expect(calm.pinnedOn(2).map((event) => event.id)).toEqual(['Rare.Sample'])
    expect(calm.pinnedOn(0)).toEqual([])
  })

  test('each leg keeps at most six asteroids, the closest first, and always its pinned one', () => {
    const crowd = Array.from({ length: 10 }, (_, index) => ({ ...Fixtures.sampleAsteroids[0], id: `C${index}`, name: `Crowd ${index}`, missLunar: 19 - index }))
    const pinnedFar = { ...Fixtures.sampleAsteroids[0], id: 'Far', name: 'Far', missLunar: 45 }
    const week = new WeekBuilder({ asteroids: [...crowd, pinnedFar], weather: Fixtures.quietWeather, undated: [], rare: [] }).build({
      ...Fixtures.calmDefinition,
      legs: Fixtures.calmDefinition.legs.map((leg, index) => ({ ...leg, pinned: index === 0 ? [AsteroidFlyby.idFor('Far')] : [] })),
    })
    const kept = week.events.map((event) => event.label.params.text)
    expect(kept).toEqual(['Far', 'Crowd 9', 'Crowd 8', 'Crowd 7', 'Crowd 6', 'Crowd 5'])
  })

  test('storm legs come from the Kp readings on their dates', () => {
    expect(storm.legs.map((leg) => leg.storm?.reading.kp)).toEqual([undefined, undefined, 8, 9, undefined, 6])
    expect(storm.stormOn(3)?.peak).toBe(12)
    expect(storm.stormOn(0)).toBeUndefined()
  })

  test('rare events are included only when their date falls in the week', () => {
    expect(calm.event('Rare.Sample')).toBeDefined()
    const elsewhere = new WeekBuilder({ asteroids: [], weather: Fixtures.mayWeather, undated: Fixtures.planets, rare: [Fixtures.rareSample] }).build(Fixtures.stormDefinition)
    expect(elsewhere.event('Rare.Sample')).toBeUndefined()
  })

  test('a week needs exactly six legs and can only pin events it has', () => {
    expect(() => new Week('Short', 1, calm.legs.slice(0, 5), [])).toThrow()
    expect(() => new WeekBuilder({ asteroids: [], weather: Fixtures.quietWeather, undated: [], rare: [] }).build(Fixtures.calmDefinition)).toThrow()
  })
})

describe('Eligibility', () => {
  test('dated events are offered only on their own leg, undated ones on every leg', () => {
    const first = calm.eligible(0, new Set())
    const dated = first.filter((event) => event.isDated)
    expect(dated.map((event) => event.label.params.text).sort()).toEqual(['Sample 20A', 'Sample 20B', 'Sample 20C'])
    expect(first.filter((event) => !event.isDated)).toHaveLength(5)
  })

  test('events already dealt are not offered again', () => {
    const first = calm.eligible(0, new Set())
    const dealt = new Set(first.slice(0, 2).map((event) => event.id))
    expect(calm.eligible(0, dealt)).toHaveLength(first.length - 2)
  })

  test('an event pinned to another leg is held back for it', () => {
    const laterLegPin = { ...Fixtures.calmDefinition, legs: Fixtures.calmDefinition.legs.map((leg, index) => ({ ...leg, pinned: index === 5 ? [Fixtures.planets[0].id] : [] })) }
    const week = new WeekBuilder({ asteroids: Fixtures.asteroids, weather: Fixtures.quietWeather, undated: Fixtures.planets, rare: [] }).build(laterLegPin)
    expect(week.eligible(0, new Set()).some((event) => event.id === Fixtures.planets[0].id)).toBe(false)
    expect(week.eligible(5, new Set()).some((event) => event.id === Fixtures.planets[0].id)).toBe(true)
  })
})

describe('Forecast', () => {
  test('counts what the quiet week holds', () => {
    const forecast = calm.forecast
    expect(forecast.stormLegs).toBe(0)
    expect(forecast.worstBand).toBe(RadiationBand.None)
    expect(forecast.asteroidCount).toBe(21)
    expect(forecast.radarTargets).toBe(10)
    expect(forecast.planetCount).toBe(5)
    expect(forecast.unknownsExpected).toBe(true)
    expect(forecast.channelDemand(Channel.Particles)).toBe(0)
    expect(forecast.channelsByDemand[0]).toBe(Channel.Visible)
  })

  test('counts storms and what they ask for', () => {
    const forecast = storm.forecast
    expect(forecast.stormLegs).toBe(3)
    expect(forecast.worstBand).toBe(RadiationBand.Severe)
    expect(forecast.unknownsExpected).toBe(false)
    expect(forecast.channelDemand(Channel.Particles)).toBe(30 * 3 + 36 * 3 + 12 * 1)
    expect(forecast.channelDemand(Channel.HighEnergy)).toBe(12 * 3 + 12 * 3 + 8 * 1)
    const shares = [Channel.Visible, Channel.Spectrum, Channel.Radar, Channel.Particles, Channel.HighEnergy].reduce((sum, channel) => sum + forecast.demandShare(channel), 0)
    expect(shares).toBeCloseTo(1)
  })
})
