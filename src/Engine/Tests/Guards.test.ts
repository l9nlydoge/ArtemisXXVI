import { describe, expect, test } from 'vitest'
import { Channel } from '../Events/Channel'
import { DateWindow } from '../Events/DateWindow'
import { RareEvent } from '../Events/RareEvent'
import { Rarity } from '../Events/Rarity'
import { SolarStorm } from '../Events/SolarStorm'
import { Flight, FlightPhase } from '../Flight/Flight'
import { Commands } from '../Flight/FlightCommand'
import { FlightOutcome, FlightReport } from '../Flight/FlightReport'
import { Lab } from '../Progress/Lab'
import { Profile } from '../Progress/Profile'
import { Loadout } from '../Spacecraft/Loadout'
import { Week, type Leg } from '../Weeks/Week'
import { WeekBuilder } from '../Weeks/WeekBuilder'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import English from '../../I18n/StringsEn.json'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const starter = Loadout.starter()
const calm = Fixtures.calmWeek
const plainLegs = (legs: readonly Leg[]): Leg[] => legs.map((leg) => ({ window: leg.window, pinnedEventIds: [] }))
const playOut = (flight: Flight) => {
  while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit([]))
}

describe('Week data that would break dealing is refused', () => {
  test('the same event twice', () => {
    const twice = [...Fixtures.asteroids, Fixtures.asteroids[3]]
    expect(() => new WeekBuilder({ asteroids: twice, weather: Fixtures.quietWeather, undated: Fixtures.planets, rare: [Fixtures.rareSample] }).build(Fixtures.calmDefinition)).toThrow('more than once')
    expect(() => new Week('Twice', 1, plainLegs(calm.legs), [Fixtures.planets[0], Fixtures.planets[0]])).toThrow('more than once')
  })

  test('legs that overlap or run backwards', () => {
    const legs = plainLegs(calm.legs)
    const overlapping = legs.map((leg, index) => (index === 1 ? { ...leg, window: new DateWindow('2019-07-20T12:00:00Z', '2019-07-22T00:00:00Z') } : leg))
    expect(() => new Week('Overlap', 1, overlapping, [])).toThrow('starts before')
    expect(() => new Week('Backwards', 1, [...legs].reverse(), [])).toThrow('starts before')
    expect(() => new Week('Fine', 1, legs, [])).not.toThrow()
  })

  test('a pin on a storm, or the same pin twice', () => {
    const storm = Fixtures.stormWeek
    const pinStorm = storm.legs.map((leg, index) => ({ ...leg, pinnedEventIds: index === 3 ? ['Storm.2024-05-11'] : [] }))
    expect(() => new Week('PinStorm', 1, pinStorm, storm.events)).toThrow('not one of its events')
    const pinTwice = plainLegs(calm.legs).map((leg, index) => ({ ...leg, pinnedEventIds: index < 2 ? [Fixtures.planets[0].id] : [] }))
    expect(() => new Week('PinTwice', 1, pinTwice, calm.events)).toThrow('more than once')
  })
})

describe('Week signature', () => {
  const base = () => Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z')
  const sign = (events: RareEvent[], legs = plainLegs(calm.legs)) => new Week('Sig', 1, legs, events).signature
  const original = sign([base()])

  test('changes with anything that changes play', () => {
    const variants: RareEvent[] = [
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2.00001, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 2 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 2, radiation: 1 }, { signal: 1, radiation: 0 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 10], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9, 2], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Spectrum, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Notable, '2019-07-21T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-22T05:00:00Z'),
      Fixtures.event('Sig', [[Channel.Visible, 9], [Channel.Radar, 5]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common),
    ]
    const signatures = variants.map((event) => sign([event]))
    for (const signature of signatures) expect(signature).not.toBe(original)
    expect(new Set(signatures).size).toBe(variants.length)
  })

  test('changes with the legs, the pins and the storms', () => {
    const legs = plainLegs(calm.legs)
    const widened = legs.map((leg, index) => (index === 5 ? { ...leg, window: new DateWindow(leg.window.startUtc, '2019-07-27T00:00:00Z') } : leg))
    const pinned = legs.map((leg, index) => (index === 1 ? { ...leg, pinnedEventIds: ['Sig'] } : leg))
    const stormy = legs.map((leg, index) => (index === 0 ? { ...leg, storm: Fixtures.stormWeek.stormOn(5) } : leg))
    expect(new Set([original, sign([base()], widened), sign([base()], pinned), sign([base()], stormy)]).size).toBe(4)
  })

  test('changes with the kind of event, which decides how it arrives', () => {
    class Plain extends RareEvent {
      override get startsUnidentified(): boolean {
        return false
      }
    }
    const details = { id: 'Sig', label: base().label, rarity: Rarity.Common, channels: base().channels, turns: base().turns, facts: [], learned: base().learned, sourceUrl: '', imageId: '', dateUtc: '2019-07-21T05:00:00Z' }
    expect(new Week('Sig', 1, plainLegs(calm.legs), [new Plain(details)]).signature).not.toBe(original)
  })

  test('does not change with the order events or channels are listed in', () => {
    const other = Fixtures.event('Other', [[Channel.Spectrum, 4]], [{ signal: 1, radiation: 0 }])
    const swapped = Fixtures.event('Sig', [[Channel.Radar, 5], [Channel.Visible, 9]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 1 }], Rarity.Common, '2019-07-21T05:00:00Z')
    expect(sign([other, swapped])).toBe(sign([base(), other]))
  })
})

describe('Phase rules the first tests left open', () => {
  const kit = Fixtures.loadout('Flagship', [['SolarArray', 1], ['Battery', 3], ['Camera', 1], ['Radar', 1], ['Thrusters', 1]])

  test('once an encounter is done, only continuing or chasing is allowed', () => {
    const flight = Flight.begin(Fixtures.setup(kit, 'Calm', 2), options)
    flight.apply(Commands.choose(0))
    playOut(flight)
    expect(flight.phase).toBe(FlightPhase.EncounterDone)
    for (const command of [Commands.hold, Commands.survey, Commands.choose(1), Commands.commit([])]) {
      expect(flight.can(command)).toBe(false)
      expect(() => flight.apply(command)).toThrow()
    }
    expect(flight.can(Commands.proceed)).toBe(true)
    expect(flight.can(Commands.chase(1))).toBe(true)
  })

  test('a chase costs exactly one burn and 2 charge', () => {
    const flight = Flight.begin(Fixtures.setup(kit, 'Calm', 2), options)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.state.charge = 5
    flight.apply(Commands.chase(1))
    expect(flight.craft.capacity).toBe(26)
    expect(flight.state.charge).toBe(5 - 2 + flight.craft.generation)
    expect(flight.state.burnsLeft).toBe(1)
  })

  test('only one chase per leg, even with a third contact still open', () => {
    const flight = Flight.begin(Fixtures.setup(kit, 'Calm', 2), options)
    flight.apply(Commands.survey)
    expect(flight.contacts).toHaveLength(3)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.apply(Commands.chase(1))
    playOut(flight)
    expect(flight.contacts[2].played).toBe(false)
    expect(flight.state.burnsLeft).toBe(1)
    expect(flight.state.charge).toBeGreaterThanOrEqual(2)
    expect(flight.can(Commands.chase(2))).toBe(false)
  })

  test('no chase without a burn left', () => {
    const flight = Flight.begin(Fixtures.setup(kit, 'Calm', 2), options)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.state.burnsLeft = 0
    expect(flight.can(Commands.chase(1))).toBe(false)
  })

  test('a leg with exactly one contact offers that contact or a hold', () => {
    const lone = new WeekCatalog([new Week('Lone', 1, plainLegs(calm.legs), [Fixtures.planets[0]])])
    const flight = Flight.begin(Fixtures.setup(starter, 'Lone', 1), { weeks: lone })
    expect(flight.contacts).toHaveLength(1)
    expect(flight.can(Commands.choose(0))).toBe(true)
    expect(flight.can(Commands.choose(1))).toBe(false)
    expect(flight.can(Commands.hold)).toBe(true)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.apply(Commands.proceed)
    expect(flight.contacts).toEqual([])
  })
})

describe('Progress rules the first tests left open', () => {
  test('a lost flight still writes what it recorded into the logbook', () => {
    const recorded = { legIndex: 0, eventId: 'E1', recorded: new Map([[Channel.Visible, 4]]), points: 9, complete: true, anyRecorded: true, turnsPlayed: 3, damageTaken: 20, missed: [] }
    const profile = Profile.starter().afterFlight(new FlightReport(FlightOutcome.Lost, [recorded], 0, 1), starter)
    expect(profile.logged('E1')).toEqual({ recorded: true, complete: true, bestPoints: 9 })
    expect(profile.points).toBe(4)
    expect(profile.flights).toBe(1)
  })

  test('an unlock is refused when points are short', () => {
    expect(() => Profile.starter().afterUnlock('Spectrometer', 1, 60)).toThrow()
    expect(() => new Lab().buy(Profile.starter(), 'Spectrometer')).toThrow()
  })

  test('names that collide with built-in object properties are not mistaken for saved entries', () => {
    const profile = Profile.fromJson({ ...Profile.starter().toJson(), logbook: JSON.parse('{"__proto__": {"recorded": true, "complete": true, "bestPoints": 5}}') })
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'recorded']) {
      expect(profile.logged(name)).toEqual({ recorded: false, complete: false, bestPoints: 0 })
      expect(profile.ownedMark(name)).toBe(0)
      expect(profile.owns(name, 1)).toBe(false)
    }
  })
})

describe('Flare facts', () => {
  const window = new DateWindow('2024-05-11T00:00:00Z', '2024-05-12T00:00:00Z')
  const withFlares = (classes: string[]) => SolarStorm.forWindow(window, { ...Fixtures.mayWeather, flaresAvailable: true, flares: classes.map((classType, index) => ({ id: `F${index}`, weekId: 'Storm', peakUtc: '2024-05-09T09:00:00Z', classType, url: '' })) })!
  const strings: Record<string, string> = English

  test('a flare weaker than class C is not reported as an observed flare', () => {
    for (const weak of ['B9.9', 'A1', '', '?']) {
      const storm = withFlares([weak])
      expect(storm.reading.flareClass).toBe('None')
      expect(storm.facts[2].key).toBe('Fact.FlareNone')
    }
  })

  test('each flare fact has its English line', () => {
    for (const storm of [withFlares(['X2']), withFlares([]), SolarStorm.forWindow(window, Fixtures.mayWeather)!]) {
      for (const fact of storm.facts) expect(strings[fact.key], fact.key).toBeDefined()
    }
  })
})
