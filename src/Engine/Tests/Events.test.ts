import { describe, expect, test } from 'vitest'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { Channel } from '../Events/Channel'
import { DateWindow } from '../Events/DateWindow'
import { ExoplanetTransit } from '../Events/ExoplanetTransit'
import { RadiationBand, RadiationBands } from '../Events/RadiationBand'
import { Rarity } from '../Events/Rarity'
import type { AsteroidRecord, SpaceWeather } from '../Events/Records'
import { FlareClass, SolarStorm } from '../Events/SolarStorm'
import { EventKind } from '../Events/SpaceEvent'
import { Fixtures } from './Fixtures'

const [ok, od, ok1] = Fixtures.realAsteroids
const day = (date: number) => new DateWindow(`2024-05-${String(date).padStart(2, '0')}T00:00:00Z`, `2024-05-${String(date + 1).padStart(2, '0')}T00:00:00Z`)
const signals = (event: { turns: readonly { signal: number }[] }) => event.turns.map((turn) => turn.signal)
const radiation = (event: { turns: readonly { radiation: number }[] }) => event.turns.map((turn) => turn.radiation)
const channels = (event: { channels: ReadonlyMap<Channel, { capacity: number }> }) => Object.fromEntries([...event.channels].map(([channel, spec]) => [channel, spec.capacity]))

describe('Asteroid flyby', () => {
  test('2019 OK, pinned, plays as in the spec', () => {
    const event = AsteroidFlyby.fromRecord(ok, true)
    expect(event.kind).toBe(EventKind.Asteroid)
    expect(event.id).toBe('Asteroid.3843336')
    expect(signals(event)).toEqual([1, 2, 1])
    expect(channels(event)).toEqual({ Visible: 9, Spectrum: 6, Radar: 11 })
    expect(event.rarity).toBe(Rarity.Headline)
    expect(event.startsUnidentified).toBe(true)
    expect(event.peakRadiation).toBe(0)
    expect(event.dateUtc).toBe('2019-07-25T01:22:00Z')
    expect(event.learned.key).toBe('Learned.Asteroid.3843336')
  })

  test('2019 OD is a four-turn close pass and notable', () => {
    const event = AsteroidFlyby.fromRecord(od)
    expect(signals(event)).toEqual([0.5, 1, 2, 1])
    expect(channels(event)).toEqual({ Visible: 9, Spectrum: 6, Radar: 11 })
    expect(event.rarity).toBe(Rarity.Notable)
    expect(event.startsUnidentified).toBe(false)
    expect(event.learned.key).toBe('Learned.Asteroid')
  })

  test('2019 OK1 is slow, distant, common and out of radar range', () => {
    const event = AsteroidFlyby.fromRecord(ok1)
    expect(signals(event)).toEqual([0.5, 1, 1, 1, 0.5])
    expect(channels(event)).toEqual({ Visible: 9, Spectrum: 6 })
    expect(event.rarity).toBe(Rarity.Common)
  })

  test('speed sets the number of turns at the 10 and 20 km/s boundaries', () => {
    const turns = (speedKmS: number) => AsteroidFlyby.fromRecord({ ...ok1, speedKmS }).turnCount
    expect([9.99, 10, 19.99, 20].map(turns)).toEqual([5, 4, 4, 3])
  })

  test('distance sets the peak signal at the 1 and 5 lunar distance boundaries', () => {
    const peak = (missLunar: number) => AsteroidFlyby.fromRecord({ ...ok1, missLunar }).peakSignal
    expect([0.99, 1, 4.99, 5].map(peak)).toEqual([2, 1.5, 1.5, 1])
  })

  test('size sets capacity at the 30, 140 and 1000 metre boundaries', () => {
    const visible = (diameter: number) => AsteroidFlyby.fromRecord({ ...ok, diameterMinM: diameter, diameterMaxM: diameter }).capacity(Channel.Visible)
    expect([29, 30, 139, 140, 999, 1000].map(visible)).toEqual([6, 9, 9, 12, 12, 15])
    expect(AsteroidFlyby.fromRecord({ ...ok, diameterMinM: 1000, diameterMaxM: 1000 }).capacity(Channel.Radar)).toBe(17)
  })

  test('a hazardous or large asteroid is notable even when distant', () => {
    const far: AsteroidRecord = { ...ok1, missLunar: 15 }
    expect(AsteroidFlyby.fromRecord(far).rarity).toBe(Rarity.Common)
    expect(AsteroidFlyby.fromRecord({ ...far, hazardous: true }).rarity).toBe(Rarity.Notable)
    expect(AsteroidFlyby.fromRecord({ ...far, diameterMinM: 140, diameterMaxM: 140 }).rarity).toBe(Rarity.Notable)
  })

  test('the facts carry the real numbers', () => {
    const event = AsteroidFlyby.fromRecord(ok)
    expect(event.facts.map((fact) => [fact.key, fact.params])).toEqual([
      ['Fact.Speed', { speed: 24.5 }],
      ['Fact.MissDistance', { km: 71355, lunar: 0.19 }],
      ['Fact.Diameter', { min: 58, max: 130 }],
    ])
    expect(event.sourceUrl).toContain('ssd.jpl.nasa.gov')
  })
})

describe('Solar storm', () => {
  const weather = Fixtures.mayWeather

  test('11 May 2024 is the Kp 9 storm of the spec', () => {
    const storm = SolarStorm.forWindow(day(11), weather)!
    expect(storm.reading.kp).toBe(9)
    expect(storm.reading.particles).toBe(true)
    expect(storm.peak).toBe(12)
    expect(radiation(storm)).toEqual([4, 8, 12, 8, 4])
    expect(channels(storm)).toEqual({ Particles: 36, HighEnergy: 12 })
    expect(storm.rarity).toBe(Rarity.Headline)
    expect(storm.band).toBe(RadiationBand.Severe)
    expect(storm.startsUnidentified).toBe(false)
    expect(storm.peakSignal).toBe(2)
    expect(signals(storm)[0]).toBeCloseTo(2 / 3)
    expect(storm.id).toBe('Storm.2024-05-11')
  })

  test('10 May 2024 rounds Kp 8.67 down to 8', () => {
    const storm = SolarStorm.forWindow(day(10), weather)!
    expect(storm.reading.kp).toBe(8)
    expect(storm.peak).toBe(10)
    expect(radiation(storm)).toEqual([3, 7, 10, 7, 3])
  })

  test('13 May 2024 is a short moderate storm with no particle event', () => {
    const storm = SolarStorm.forWindow(day(13), weather)!
    expect(storm.reading.kp).toBe(6)
    expect(storm.reading.particles).toBe(false)
    expect(storm.peak).toBe(4)
    expect(radiation(storm)).toEqual([2, 4, 3, 2])
    expect(channels(storm)).toEqual({ Particles: 12, HighEnergy: 8 })
    expect(storm.rarity).toBe(Rarity.Common)
    expect(storm.band).toBe(RadiationBand.High)
  })

  test('days with no reading of Kp 5 or more have no storm', () => {
    expect([8, 9, 12].map((date) => SolarStorm.forWindow(day(date), weather))).toEqual([undefined, undefined, undefined])
    const mild: SpaceWeather = { ...Fixtures.quietWeather, storms: [{ ...weather.storms[0], kpReadings: [{ timeUtc: '2024-05-11T00:00:00Z', kp: 4.67 }] }] }
    expect(SolarStorm.forWindow(day(11), mild)).toBeUndefined()
  })

  test('each Kp level gives the peak in the table', () => {
    const peak = (kp: number) => SolarStorm.forWindow(day(11), { ...Fixtures.quietWeather, storms: [{ ...weather.storms[0], kpReadings: [{ timeUtc: '2024-05-11T06:00:00Z', kp }] }] })!.peak
    expect([5, 6, 7, 8, 9].map(peak)).toEqual([3, 4, 6, 8, 10])
    expect(peak(9.33)).toBe(10)
  })

  test('a particle event counts from 24 hours before the window and no earlier', () => {
    const at = (timeUtc: string) => SolarStorm.forWindow(day(11), { ...weather, particleEvents: [{ ...weather.particleEvents[0], timeUtc }] })!.reading.particles
    expect(at('2024-05-10T00:00:00Z')).toBe(true)
    expect(at('2024-05-09T23:59:00Z')).toBe(false)
    expect(at('2024-05-11T23:59:00Z')).toBe(true)
    expect(at('2024-05-12T00:00:00Z')).toBe(false)
  })

  test('when flare data exists the strongest flare in the 72 hours before decides the channel', () => {
    const withFlares = (classes: string[], peakUtc = '2024-05-09T09:00:00Z') =>
      SolarStorm.forWindow(day(11), { ...weather, flaresAvailable: true, flares: classes.map((classType, index) => ({ id: `F${index}`, weekId: 'Storm', peakUtc, classType, url: '' })) })!
    expect(withFlares(['M1.2', 'X2.2', 'C9']).reading.flareClass).toBe(FlareClass.X)
    expect(withFlares(['M1.2', 'X2.2']).capacity(Channel.HighEnergy)).toBe(12)
    expect(withFlares(['M5.0']).capacity(Channel.HighEnergy)).toBe(8)
    expect(withFlares([]).channels.has(Channel.HighEnergy)).toBe(false)
    expect(withFlares(['X5'], '2024-05-07T23:00:00Z').reading.flareClass).toBe(FlareClass.None)
    expect(withFlares(['X5'], '2024-05-08T00:00:00Z').reading.flareClass).toBe(FlareClass.X)
    expect(withFlares(['X5'], '2024-05-08T12:00:00Z').reading.flareClass).toBe(FlareClass.X)
    expect(withFlares(['C3']).reading.flareClass).toBe(FlareClass.C)
    expect(withFlares(['C3']).channels.has(Channel.HighEnergy)).toBe(false)
    expect(withFlares(['X5']).reading.flareObserved).toBe(true)
    expect(withFlares(['X5']).facts[2].key).toBe('Fact.FlareObserved')
    expect(withFlares([]).facts[2].key).toBe('Fact.FlareNone')
    expect(SolarStorm.forWindow(day(11), weather)!.facts[2].key).toBe('Fact.FlareAssumed')
  })

  test('without flare data the class is inferred from strength', () => {
    expect(SolarStorm.forWindow(day(11), weather)!.reading.flareClass).toBe(FlareClass.X)
    expect(SolarStorm.forWindow(day(13), weather)!.reading.flareClass).toBe(FlareClass.M)
    expect(SolarStorm.forWindow(day(13), weather)!.reading.flareObserved).toBe(false)
  })
})

describe('Planet crossing its star', () => {
  const [trappist, radial, imaged, lens, odd] = Fixtures.exoplanets

  test('a transit around a faint star is a camera target with a quarter more to record', () => {
    const event = ExoplanetTransit.fromRecord(trappist)
    expect(event.kind).toBe(EventKind.Exoplanet)
    expect(channels(event)).toEqual({ Visible: 18 })
    expect(signals(event)).toEqual([1, 1, 1, 1, 1])
    expect(event.isDated).toBe(false)
    expect(event.rarity).toBe(Rarity.Common)
    expect(event.learned.key).toBe('Learned.Method.Transit')
  })

  test('a wobble detection is a spectrometer target', () => {
    const event = ExoplanetTransit.fromRecord(radial)
    expect(channels(event)).toEqual({ Spectrum: 14 })
    expect(event.learned.key).toBe('Learned.Method.RadialVelocity')
  })

  test('a directly imaged planet needs a Mk II camera', () => {
    const event = ExoplanetTransit.fromRecord(imaged)
    expect(event.channels.get(Channel.Visible)).toEqual({ capacity: 20, minMark: 2 })
  })

  test('a microlensing event is three turns with a spike', () => {
    const event = ExoplanetTransit.fromRecord(lens)
    expect(signals(event)).toEqual([0.5, 3, 0.5])
    expect(channels(event)).toEqual({ Visible: 10 })
  })

  test('an unlisted method falls back to a camera target', () => {
    const event = ExoplanetTransit.fromRecord(odd)
    expect(channels(event)).toEqual({ Visible: 14 })
    expect(event.learned.key).toBe('Learned.Method.Transit')
  })

  test('a measured atmosphere adds a spectrum channel, or deepens an existing one', () => {
    expect(channels(ExoplanetTransit.fromRecord(odd, { famous: false, atmosphere: true }))).toEqual({ Visible: 14, Spectrum: 10 })
    expect(channels(ExoplanetTransit.fromRecord(radial, { famous: false, atmosphere: true }))).toEqual({ Spectrum: 24 })
    expect(channels(ExoplanetTransit.fromRecord(trappist, { famous: false, atmosphere: true }))).toEqual({ Visible: 18, Spectrum: 13 })
  })

  test('a famous planet is notable and has its own line', () => {
    const event = ExoplanetTransit.fromRecord(trappist, { famous: true, atmosphere: false })
    expect(event.rarity).toBe(Rarity.Notable)
    expect(event.id).toBe('Exoplanet.TRAPPIST1b')
    expect(event.learned.key).toBe('Learned.Exoplanet.TRAPPIST1b')
  })

  test('facts skip numbers the archive does not have', () => {
    expect(ExoplanetTransit.fromRecord(trappist).facts.map((fact) => fact.key)).toEqual(['Fact.Method', 'Fact.Discovered', 'Fact.Distance', 'Fact.Radius'])
    expect(ExoplanetTransit.fromRecord(lens).facts.map((fact) => fact.key)).toEqual(['Fact.Method', 'Fact.Discovered'])
    expect(ExoplanetTransit.fromRecord(trappist).facts[2].params).toEqual({ lightYears: 41 })
  })
})

describe('Radiation bands and date windows', () => {
  test('bands follow the spec', () => {
    expect([0, 1, 3, 4, 7, 8, 12].map((amount) => RadiationBands.of(amount))).toEqual(['None', 'Low', 'Low', 'High', 'High', 'Severe', 'Severe'])
    expect(RadiationBands.worst([RadiationBand.Low, RadiationBand.Severe, RadiationBand.High])).toBe(RadiationBand.Severe)
    expect(RadiationBands.worst([])).toBe(RadiationBand.None)
  })

  test('a window includes its start and excludes its end', () => {
    const window = day(11)
    expect(window.contains('2024-05-11T00:00:00Z')).toBe(true)
    expect(window.contains('2024-05-11T23:59:59Z')).toBe(true)
    expect(window.contains('2024-05-12T00:00:00Z')).toBe(false)
    expect(window.days).toBe(1)
    expect(() => new DateWindow('2024-05-12T00:00:00Z', '2024-05-11T00:00:00Z')).toThrow()
  })
})
