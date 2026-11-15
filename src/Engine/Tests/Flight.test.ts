import { describe, expect, test } from 'vitest'
import { GreedyBot } from '../Bots/GreedyBot'
import { Flight, FlightPhase } from '../Flight/Flight'
import { Commands } from '../Flight/FlightCommand'
import { FlightOutcome } from '../Flight/FlightReport'
import type { Mark } from '../Modules/MarkSpec'
import { Loadout } from '../Spacecraft/Loadout'
import { Week } from '../Weeks/Week'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const starter = Loadout.starter()
const begin = (loadout: Loadout, weekId = 'Calm', seed = 7) => Flight.begin(Fixtures.setup(loadout, weekId, seed), options)
const withRadar = Fixtures.loadout('Flagship', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['Radar', 1]])
const playOut = (flight: Flight) => {
  while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit([]))
}

describe('Starting a flight', () => {
  test('begins scanning on leg one with a full battery and hull', () => {
    const flight = begin(starter)
    expect(flight.phase).toBe(FlightPhase.Scanning)
    expect(flight.legIndex).toBe(0)
    expect(flight.state).toMatchObject({ charge: 12, hull: 16, burnsLeft: 0, repairUsed: false })
    expect(flight.contacts).toHaveLength(2)
    expect(flight.pointsEarned).toBe(0)
    expect(flight.isOver).toBe(false)
  })

  test('an unknown week fails loudly', () => {
    expect(() => begin(starter, 'Nowhere')).toThrow()
  })
})

describe('Commands', () => {
  test('commands that do not fit the phase are refused and leave the flight unchanged', () => {
    const flight = begin(starter)
    for (const command of [Commands.commit([]), Commands.proceed, Commands.chase(0), Commands.choose(9), Commands.choose(-1), Commands.survey]) {
      expect(flight.can(command)).toBe(false)
      expect(() => flight.apply(command)).toThrow()
    }
    expect(flight.log).toEqual([])
    expect(flight.phase).toBe(FlightPhase.Scanning)
    flight.apply(Commands.choose(0))
    for (const command of [Commands.choose(1), Commands.hold, Commands.proceed, Commands.survey]) expect(flight.can(command)).toBe(false)
  })

  test('choosing a contact starts its encounter and identifies it', () => {
    const flight = begin(starter)
    flight.apply(Commands.choose(1))
    expect(flight.phase).toBe(FlightPhase.Encounter)
    expect(flight.encounter?.contact).toBe(flight.contacts[1])
    expect(flight.contacts[1].played).toBe(true)
    expect(flight.contacts[1].identified).toBe(true)
  })

  test('a plan the battery cannot pay for is refused', () => {
    const flight = begin(starter)
    flight.apply(Commands.choose(0))
    flight.state.charge = 1
    expect(flight.can(Commands.commit(['Camera#1']))).toBe(false)
    expect(flight.can(Commands.commit(['ParticleDetector#1']))).toBe(true)
  })

  test('after the last turn the encounter is done and its result is kept', () => {
    const flight = begin(starter)
    flight.apply(Commands.choose(0))
    playOut(flight)
    expect(flight.phase).toBe(FlightPhase.EncounterDone)
    expect(flight.results).toHaveLength(1)
    expect(flight.results[0].legIndex).toBe(0)
    expect(flight.encounter?.isOver).toBe(true)
    expect(flight.lastOutcome?.encounterOver).toBe(true)
  })
})

describe('Hold and cruise', () => {
  test('holding fills the battery and moves to the next leg', () => {
    const flight = begin(starter)
    flight.state.charge = 1
    flight.apply(Commands.hold)
    expect(flight.legIndex).toBe(1)
    expect(flight.state.charge).toBe(12)
    expect(flight.phase).toBe(FlightPhase.Scanning)
  })

  test('cruising between legs adds two turns of generation, up to capacity', () => {
    const flight = begin(starter)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.state.charge = 1
    flight.apply(Commands.proceed)
    expect(flight.state.charge).toBe(7)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.state.charge = 10
    flight.apply(Commands.proceed)
    expect(flight.state.charge).toBe(12)
  })

  test('six held legs complete the flight with nothing earned', () => {
    const flight = begin(starter)
    for (let leg = 0; leg < 6; leg++) flight.apply(Commands.hold)
    expect(flight.phase).toBe(FlightPhase.Completed)
    expect(flight.isOver).toBe(true)
    expect(flight.can(Commands.hold)).toBe(false)
    const report = flight.report()
    expect(report.outcome).toBe(FlightOutcome.Completed)
    expect(report.pointsBanked).toBe(0)
    expect(report.legsFlown).toBe(6)
    expect(report.hullLeft).toBe(16)
  })

  test('a report cannot be made while the flight is in progress', () => {
    expect(() => begin(starter).report()).toThrow()
  })
})

describe('Survey', () => {
  test('needs a radar', () => {
    expect(begin(starter).can(Commands.survey)).toBe(false)
    expect(begin(withRadar).can(Commands.survey)).toBe(true)
  })

  test('costs 3 charge, identifies every contact and adds one, once per leg', () => {
    const flight = begin(withRadar, 'Calm', 5)
    flight.apply(Commands.hold)
    flight.apply(Commands.hold)
    expect(flight.contacts.some((contact) => !contact.identified)).toBe(true)
    const charge = flight.state.charge
    flight.apply(Commands.survey)
    expect(flight.state.charge).toBe(charge - 3)
    expect(flight.contacts).toHaveLength(3)
    expect(flight.contacts.every((contact) => contact.identified)).toBe(true)
    expect(flight.hasSurveyed).toBe(true)
    expect(flight.can(Commands.survey)).toBe(false)
    flight.apply(Commands.hold)
    expect(flight.can(Commands.survey)).toBe(true)
  })

  test('needs 3 charge', () => {
    const flight = begin(withRadar)
    flight.state.charge = 2
    expect(flight.can(Commands.survey)).toBe(false)
  })
})

describe('Storm legs', () => {
  const tough = Fixtures.loadout('Flagship', [['SolarArray', 3], ['Battery', 3], ['ParticleDetector', 1], ['RadiationShielding', 3], ['MagneticShield', 3]])

  test('holding is not allowed and the storm is offered first', () => {
    const flight = begin(tough, 'Storm')
    flight.apply(Commands.hold)
    flight.apply(Commands.hold)
    expect(flight.isStormLeg).toBe(true)
    expect(flight.can(Commands.hold)).toBe(false)
    expect(flight.contacts[0].event.id).toBe('Storm.2024-05-10')
    expect(flight.contacts).toHaveLength(3)
  })

  test('an unshielded spacecraft is lost in the storm and banks half', () => {
    const flight = begin(starter, 'Storm')
    flight.apply(Commands.hold)
    flight.apply(Commands.hold)
    const rideOut = () => {
      flight.apply(Commands.choose(0))
      while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit(['ParticleDetector#1']))
      return flight.phase
    }
    if (rideOut() === FlightPhase.EncounterDone) {
      flight.apply(Commands.proceed)
      rideOut()
    }
    expect(flight.phase).toBe(FlightPhase.Lost)
    expect(flight.isOver).toBe(true)
    const report = flight.report()
    expect(report.outcome).toBe(FlightOutcome.Lost)
    expect(report.survived).toBe(false)
    expect(report.pointsEarned).toBeGreaterThan(0)
    expect(report.pointsBanked).toBe(Math.floor(report.pointsEarned / 2))
    expect(report.hullLeft).toBe(0)
    expect(report.loss).toMatchObject({ shielding: 1, hadActiveShield: false })
    expect(report.loss!.radiation).toBeGreaterThan(1)
    expect(report.encounters.at(-1)?.eventId).toBe(report.loss!.eventId)
  })
})

describe('Empty skies', () => {
  const empty = new WeekCatalog([new Week('Empty', 1, Fixtures.calmWeek.legs.map((leg) => ({ window: leg.window, pinnedEventIds: [] })), [])])
  const bare = new WeekCatalog([new Week('Bare', 1, Fixtures.stormWeek.legs, [])])

  test('a leg with nothing to see can only be held', () => {
    const flight = Flight.begin(Fixtures.setup(withRadar, 'Empty', 1), { weeks: empty })
    expect(flight.contacts).toEqual([])
    expect(flight.can(Commands.choose(0))).toBe(false)
    expect(flight.can(Commands.hold)).toBe(true)
  })

  test('a survey with nothing left to find still costs power and adds nothing', () => {
    const flight = Flight.begin(Fixtures.setup(withRadar, 'Empty', 1), { weeks: empty })
    flight.apply(Commands.survey)
    expect(flight.contacts).toEqual([])
    expect(flight.state.charge).toBe(flight.craft.capacity - 3)
  })

  test('a bot finishes a week with nothing in it', () => {
    const { report } = new GreedyBot().fly(Fixtures.setup(starter, 'Empty', 1), { weeks: empty })
    expect(report.survived).toBe(true)
    expect(report.encounters).toEqual([])
  })

  test('on a storm leg with nothing else in view the storm is the only choice', () => {
    const flight = Flight.begin(Fixtures.setup(starter, 'Bare', 1), { weeks: bare })
    flight.apply(Commands.hold)
    flight.apply(Commands.hold)
    expect(flight.contacts.map((contact) => contact.event.id)).toEqual(['Storm.2024-05-10'])
    expect(flight.can(Commands.hold)).toBe(false)
    expect(flight.can(Commands.choose(0))).toBe(true)
  })
})

describe('Chase', () => {
  const chaser = Fixtures.loadout('Flagship', [['SolarArray', 2], ['Battery', 2], ['Camera', 1], ['Thrusters', 1]])

  test('needs thrusters', () => {
    const flight = begin(starter)
    flight.apply(Commands.choose(0))
    playOut(flight)
    expect(flight.can(Commands.chase(1))).toBe(false)
  })

  test('spends a burn and 2 charge to play a second contact, once per leg', () => {
    const flight = begin(chaser)
    flight.apply(Commands.choose(0))
    playOut(flight)
    expect(flight.can(Commands.chase(0))).toBe(false)
    const { charge, burnsLeft } = flight.state
    flight.apply(Commands.chase(1))
    expect(flight.phase).toBe(FlightPhase.Encounter)
    expect(flight.state.burnsLeft).toBe(burnsLeft - 1)
    expect(flight.state.charge).toBe(Math.min(flight.craft.capacity, charge - 2 + flight.craft.generation))
    playOut(flight)
    expect(flight.results).toHaveLength(2)
    expect(flight.can(Commands.chase(0))).toBe(false)
    expect(flight.can(Commands.proceed)).toBe(true)
  })
})

describe('Determinism and reports', () => {
  const bot = new GreedyBot()
  const setup = Fixtures.setup(withRadar, 'Calm', 2026)

  test('the same setup and commands give the same flight', () => {
    const { flight, report } = bot.fly(setup, options)
    const replayed = Flight.replay(setup, flight.log, options)
    expect(replayed.phase).toBe(flight.phase)
    expect({ ...replayed.state }).toEqual({ ...flight.state })
    expect(replayed.report().pointsBanked).toBe(report.pointsBanked)
    expect(replayed.results.map((result) => [result.eventId, result.points])).toEqual(flight.results.map((result) => [result.eventId, result.points]))
  })

  test('a log survives being saved as JSON', () => {
    const { flight } = bot.fly(setup, options)
    const restored = Flight.replay(JSON.parse(JSON.stringify(setup)), JSON.parse(JSON.stringify(flight.log)), options)
    expect(restored.pointsEarned).toBe(flight.pointsEarned)
  })

  test('a partly flown flight can be resumed from its log', () => {
    const flight = begin(starter, 'Calm', 99)
    flight.apply(Commands.choose(0))
    flight.apply(Commands.commit(['Camera#1']))
    const resumed = Flight.replay(flight.setup, flight.log, options)
    expect(resumed.phase).toBe(FlightPhase.Encounter)
    expect(resumed.encounter?.turnIndex).toBe(1)
    expect({ ...resumed.state }).toEqual({ ...flight.state })
    expect([...resumed.encounter!.recorded]).toEqual([...flight.encounter!.recorded])
  })

  test('different seeds give different flights', () => {
    const points = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => bot.fly(Fixtures.setup(withRadar, 'Calm', seed), options).report.pointsEarned))
    expect(points.size).toBeGreaterThan(3)
  })

  test('the report totals points and groups what was missed by module', () => {
    const { report } = bot.fly(Fixtures.setup(starter, 'Calm', 4), options)
    expect(report.pointsEarned).toBe(report.encounters.reduce((sum, encounter) => sum + encounter.points, 0))
    expect(report.pointsBanked).toBe(report.pointsEarned)
    const expected = new Map<string, number>()
    for (const encounter of report.encounters) for (const missed of encounter.missed) expected.set(missed.moduleId, (expected.get(missed.moduleId) ?? 0) + missed.points)
    expect(new Map(report.misses.map((miss) => [miss.moduleId, miss.points]))).toEqual(expected)
    expect(report.misses.map((miss) => miss.points)).toEqual([...report.misses.map((miss) => miss.points)].sort((a, b) => b - a))
    expect(report.biggestMiss).toEqual(report.misses[0])
    expect(report.misses.every((miss) => !['Camera', 'ParticleDetector'].includes(miss.moduleId))).toBe(true)
    expect(report.pointsMissed).toBeGreaterThan(0)
  })

  test('a loadout that records every channel misses nothing', () => {
    const everything: [string, Mark][] = [['SolarArray', 3], ['Battery', 2], ['Camera', 2], ['Spectrometer', 2], ['Radar', 2], ['ParticleDetector', 1], ['HighEnergyDetector', 2]]
    const { report } = bot.fly(Fixtures.setup(Fixtures.loadout('Flagship', everything), 'Calm', 4), options)
    expect(report.misses).toEqual([])
    expect(report.biggestMiss).toBeUndefined()
  })
})
