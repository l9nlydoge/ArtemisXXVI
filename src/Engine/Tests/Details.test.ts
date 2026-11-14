import { describe, expect, test } from 'vitest'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { Channel } from '../Events/Channel'
import { DateWindow } from '../Events/DateWindow'
import { ExoplanetTransit } from '../Events/ExoplanetTransit'
import { Rarity } from '../Events/Rarity'
import { SolarStorm } from '../Events/SolarStorm'
import { CraftState } from '../Flight/CraftState'
import { Encounter } from '../Flight/Encounter'
import { Flight, FlightPhase } from '../Flight/Flight'
import { Commands } from '../Flight/FlightCommand'
import { FlightOutcome, FlightReport } from '../Flight/FlightReport'
import { Scanner } from '../Flight/Scanner'
import { TurnPlan } from '../Flight/TurnPlan'
import { PlanProblem } from '../Flight/TurnPreview'
import type { Mark } from '../Modules/MarkSpec'
import { Profile } from '../Progress/Profile'
import { Loadout } from '../Spacecraft/Loadout'
import { Spacecraft } from '../Spacecraft/Spacecraft'
import { Week } from '../Weeks/Week'
import { WeekBuilder } from '../Weeks/WeekBuilder'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const seeds = Array.from({ length: 600 }, (_, index) => index + 1)
const starter = Loadout.starter()
const rock = Fixtures.event('Rock', [[Channel.Visible, 9], [Channel.Radar, 11]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 0 }, { signal: 1, radiation: 0 }], Rarity.Notable)
const playOut = (flight: Flight, keys: string[] = []) => {
  while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit(flight.can(Commands.commit(keys)) ? keys : []))
}

function encounterOn(event: typeof rock, modules: [string, Mark][], bus = 'Flagship') {
  const craft = new Spacecraft(Fixtures.loadout(bus, modules))
  const state = new CraftState(craft)
  return { craft, state, encounter: new Encounter(Fixtures.contact(event), 0, craft, state) }
}

describe('Dealing', () => {
  const pool = [Rarity.Common, Rarity.Notable, Rarity.Headline].flatMap((rarity) =>
    Array.from({ length: 12 }, (_, index) => Fixtures.event(`Pool.${rarity}.${index}`, [[Channel.Visible, 5]], [{ signal: 1, radiation: 0 }], rarity)),
  )
  const even = new Week('Even', 1, Fixtures.calmWeek.legs.map((leg) => ({ window: leg.window, pinnedEventIds: [] })), pool)

  test('with equal numbers of each rarity, contacts come out six to three to one', () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    for (const seed of seeds) counts[new Scanner(even, seed).deal(0)[0].event.rarity] += 1
    expect(counts[1] / seeds.length).toBeGreaterThan(0.54)
    expect(counts[1] / seeds.length).toBeLessThan(0.66)
    expect(counts[2] / seeds.length).toBeGreaterThan(0.24)
    expect(counts[2] / seeds.length).toBeLessThan(0.36)
    expect(counts[3] / seeds.length).toBeGreaterThan(0.06)
    expect(counts[3] / seeds.length).toBeLessThan(0.14)
  })

  test('on a leg with a pinned event the other contact may be undated', () => {
    let undated = 0
    for (const seed of seeds) {
      const scanner = new Scanner(Fixtures.calmWeek, seed)
      for (let leg = 0; leg < 5; leg++) scanner.deal(leg)
      const [pinned, other] = scanner.deal(5)
      expect(pinned.event.id).toBe(AsteroidFlyby.idFor(Fixtures.okId))
      if (!other.event.isDated) undated += 1
    }
    expect(undated).toBeGreaterThan(60)
    expect(undated).toBeLessThan(seeds.length)
  })

  test('on a leg without one the second contact may be undated too, and the first never is', () => {
    let undatedSecond = 0
    for (const seed of seeds) {
      const [first, second] = new Scanner(Fixtures.calmWeek, seed).deal(0)
      expect(first.event.isDated).toBe(true)
      if (!second.event.isDated) undatedSecond += 1
    }
    expect(undatedSecond).toBeGreaterThan(60)
  })
})

describe('Boundaries', () => {
  test('an asteroid at exactly 20 lunar distances is kept and one just beyond is dropped', () => {
    const at = (missLunar: number) => new WeekBuilder({ asteroids: [{ ...Fixtures.sampleAsteroids[0], missLunar }], weather: Fixtures.quietWeather, undated: Fixtures.planets, rare: [] }).build({ ...Fixtures.calmDefinition, legs: Fixtures.calmDefinition.legs.map((leg) => ({ ...leg, pinned: [] })) })
    expect(at(20).forecast.asteroidCount).toBe(1)
    expect(at(20.01).forecast.asteroidCount).toBe(0)
  })

  test('a star of magnitude exactly 12 is not faint and one just dimmer is', () => {
    const visible = (starVmag: number) => ExoplanetTransit.fromRecord({ ...Fixtures.exoplanets[0], starVmag }).capacity(Channel.Visible)
    expect(visible(12)).toBe(14)
    expect(visible(12.01)).toBe(18)
  })

  test('a loadout exactly at the budget or exactly filling the bay is valid', () => {
    const atBudget = Fixtures.loadout('SmallSat', [['Camera', 2], ['Spectrometer', 2], ['HighEnergyDetector', 1]])
    expect(atBudget.costMusd).toBe(60)
    expect(atBudget.issues(Fixtures.everything)).toEqual([])
    const fullBay = Fixtures.loadout('SmallSat', [['SolarArray', 1], ['Camera', 1], ['Spectrometer', 1], ['Radar', 1]])
    expect(fullBay.bayUsed).toBe(8)
    expect(fullBay.issues(Fixtures.everything)).toEqual([])
  })

  test('the survey works at exactly 3 charge and not at 2', () => {
    const withRadar = Fixtures.loadout('Flagship', [['Camera', 1], ['Radar', 1]])
    const flight = Flight.begin(Fixtures.setup(withRadar, 'Calm', 1), options)
    flight.state.charge = 2
    expect(flight.can(Commands.survey)).toBe(false)
    flight.state.charge = 3
    expect(flight.can(Commands.survey)).toBe(true)
    flight.apply(Commands.survey)
    expect(flight.state.charge).toBe(0)
  })

  test('a chase works at exactly 2 charge and not at 1, and is offered again on the next leg', () => {
    const chaser = Fixtures.loadout('Flagship', [['Camera', 1], ['Thrusters', 3]])
    const flight = Flight.begin(Fixtures.setup(chaser, 'Calm', 1), options)
    flight.apply(Commands.choose(0))
    playOut(flight)
    flight.state.charge = 1
    expect(flight.can(Commands.chase(1))).toBe(false)
    flight.state.charge = 2
    expect(flight.can(Commands.chase(1))).toBe(true)
    flight.apply(Commands.chase(1))
    playOut(flight)
    expect(flight.can(Commands.chase(0))).toBe(false)
    flight.apply(Commands.proceed)
    flight.apply(Commands.choose(0))
    playOut(flight)
    expect(flight.state.burnsLeft).toBe(3)
    expect(flight.can(Commands.chase(1))).toBe(true)
  })
})

describe('Event rules the first tests left open', () => {
  test('a Kp 7 storm is notable', () => {
    const window = new DateWindow('2024-05-11T00:00:00Z', '2024-05-12T00:00:00Z')
    const storm = SolarStorm.forWindow(window, { ...Fixtures.quietWeather, storms: [{ ...Fixtures.mayWeather.storms[0], kpReadings: [{ timeUtc: '2024-05-11T06:00:00Z', kp: 7.33 }] }] })!
    expect(storm.rarity).toBe(Rarity.Notable)
    expect(storm.turnCount).toBe(4)
  })

  test('size uses the mean of the smallest and largest diameter estimate', () => {
    const visible = (diameterMinM: number, diameterMaxM: number) => AsteroidFlyby.fromRecord({ ...Fixtures.realAsteroids[0], diameterMinM, diameterMaxM }).capacity(Channel.Visible)
    expect(visible(10, 40)).toBe(6)
    expect(visible(20, 60)).toBe(9)
    expect(visible(100, 200)).toBe(12)
  })
})

describe('Scoring in a real encounter', () => {
  test('the antenna multiplies the points of an encounter', () => {
    const plain = encounterOn(rock, [['Camera', 1]])
    const boosted = encounterOn(rock, [['Camera', 1], ['Antenna', 3]])
    for (const { encounter } of [plain, boosted]) {
      encounter.commit(new TurnPlan(['Camera#1']))
      encounter.commit(new TurnPlan(['Camera#1']))
      encounter.commit(TurnPlan.empty)
    }
    expect(plain.encounter.result().points).toBe(24)
    expect(boosted.encounter.result().points).toBe(32)
  })

  test('a channel closed by a low mark counts as missed, with the mark it needs', () => {
    const imaged = Fixtures.event('Imaged', [[Channel.Visible, 20, 2]], [{ signal: 1, radiation: 0 }])
    const { encounter } = encounterOn(imaged, [['Camera', 1]])
    encounter.commit(new TurnPlan(['Camera#1']))
    const result = encounter.result()
    expect(result.anyRecorded).toBe(false)
    expect(result.points).toBe(0)
    expect(result.missed).toEqual([{ channel: Channel.Visible, moduleId: 'Camera', neededMark: 2, points: 23 }])
    expect(encounterOn(imaged, [['Camera', 2]]).encounter.result().missed).toEqual([])
  })

  test('the report counts how many encounters each missing module cost', () => {
    const miss = (points: number) => ({ legIndex: 0, eventId: 'E', recorded: new Map(), points: 0, complete: false, anyRecorded: false, turnsPlayed: 1, damageTaken: 0, missed: [{ channel: Channel.Radar, moduleId: 'Radar', neededMark: 1 as Mark, points }] })
    const both = { ...miss(4), missed: [...miss(4).missed, { channel: Channel.Spectrum, moduleId: 'Spectrometer', neededMark: 1 as Mark, points: 30 }] }
    const report = new FlightReport(FlightOutcome.Completed, [miss(10), miss(20), both], 5, 6)
    expect(report.misses).toEqual([{ moduleId: 'Radar', points: 34, count: 3 }, { moduleId: 'Spectrometer', points: 30, count: 1 }])
    expect(report.biggestMiss?.moduleId).toBe('Radar')
    expect(report.pointsMissed).toBe(64)
  })

  test('a lost flight banks half, rounded down', () => {
    const scored = (points: number) => ({ legIndex: 0, eventId: 'E', recorded: new Map([[Channel.Visible, 1]]), points, complete: false, anyRecorded: true, turnsPlayed: 1, damageTaken: 0, missed: [] })
    expect(new FlightReport(FlightOutcome.Lost, [scored(7)], 0, 1).pointsBanked).toBe(3)
    expect(new FlightReport(FlightOutcome.Lost, [scored(7), scored(6)], 0, 2).pointsBanked).toBe(6)
    expect(new FlightReport(FlightOutcome.Lost, [scored(1)], 0, 1).pointsBanked).toBe(0)
    expect(new FlightReport(FlightOutcome.Completed, [scored(7)], 3, 6).pointsBanked).toBe(7)
    const profile = Profile.starter().afterFlight(new FlightReport(FlightOutcome.Lost, [scored(7)], 0, 1), starter)
    expect(profile.points).toBe(3)
    expect(profile.lifetimePoints).toBe(3)
  })
})

describe('Logbook and identification', () => {
  test('an encounter where nothing was recorded leaves no logbook mark', () => {
    const flight = Flight.begin(Fixtures.setup(starter, 'Calm', 3), options)
    flight.apply(Commands.choose(0))
    playOut(flight)
    for (let leg = 1; leg < 6; leg++) {
      flight.apply(Commands.proceed)
      if (leg < 6 && flight.phase === FlightPhase.Scanning) {
        flight.apply(Commands.choose(0))
        playOut(flight, leg === 1 ? ['Camera#1'] : [])
      }
    }
    flight.apply(Commands.proceed)
    const report = flight.report()
    const profile = Profile.starter().afterFlight(report, starter)
    const silent = report.encounters.filter((encounter) => !encounter.anyRecorded)
    const heard = report.encounters.filter((encounter) => encounter.anyRecorded)
    expect(silent.length).toBeGreaterThan(0)
    expect(heard.length).toBeGreaterThan(0)
    for (const encounter of silent) expect(profile.logged(encounter.eventId)).toEqual({ recorded: false, complete: false, bestPoints: 0 })
    for (const encounter of heard) expect(profile.logged(encounter.eventId).recorded).toBe(true)
  })

  test('approaching an unknown contact identifies it', () => {
    const flight = Flight.begin(Fixtures.setup(starter, 'Calm', 3), options)
    for (let leg = 0; leg < 5; leg++) flight.apply(Commands.hold)
    expect(flight.contacts[0].identified).toBe(false)
    flight.apply(Commands.choose(0))
    expect(flight.contacts[0].identified).toBe(true)
  })

  test('an unknown contact hides its radiation band unless a flight computer is fitted', () => {
    const flight = Flight.begin(Fixtures.setup(starter, 'Calm', 3), options)
    for (let leg = 0; leg < 5; leg++) flight.apply(Commands.hold)
    const [unknown, other] = flight.contacts
    expect(unknown.showsBandTo(flight.craft)).toBe(false)
    expect(unknown.showsBandTo(new Spacecraft(Fixtures.loadout('SmallSat', [['Camera', 1], ['FlightComputer', 1]])))).toBe(true)
    if (other.identified) expect(other.showsBandTo(flight.craft)).toBe(true)
  })
})

describe('What the screens ask the engine', () => {
  test('why a module cannot be added to this turn', () => {
    const { encounter, state } = encounterOn(rock, [['Camera', 1], ['Radar', 1], ['Thrusters', 1], ['RepairDrone', 1]], 'SmallSat')
    state.charge = 5
    state.burnsLeft = 0
    state.repairUsed = true
    const camera = new TurnPlan(['Camera#1'])
    expect(encounter.problemWith('Radar#1', camera)).toBe(PlanProblem.NotEnoughCharge)
    expect(encounter.problemWith('Radar#1', TurnPlan.empty)).toBeUndefined()
    expect(encounter.problemWith('Camera#1', camera)).toBeUndefined()
    expect(encounter.problemWith('Thrusters#1', TurnPlan.empty)).toBe(PlanProblem.NoBurnsLeft)
    expect(encounter.problemWith('RepairDrone#1', TurnPlan.empty)).toBe(PlanProblem.RepairUsed)
    expect(encounter.problemWith('Nope#1', TurnPlan.empty)).toBe(PlanProblem.UnknownModule)
  })

  test('how many planets each instrument could record', () => {
    const forecast = Fixtures.calmWeek.forecast
    expect(forecast.planetsFor(Channel.Visible)).toBe(4)
    expect(forecast.planetsFor(Channel.Spectrum)).toBe(1)
    expect(forecast.planetsFor(Channel.Radar)).toBe(0)
  })

  test('the turn history of an encounter', () => {
    const { encounter } = encounterOn(rock, [['Camera', 1]])
    encounter.commit(new TurnPlan(['Camera#1']))
    encounter.commit(TurnPlan.empty)
    expect(encounter.history.map((outcome) => outcome.gains.get(Channel.Visible) ?? 0)).toEqual([3, 0])
    expect(encounter.history.map((outcome) => outcome.encounterOver)).toEqual([false, false])
  })

  test('a week catalog built for tests does not leak into the shared one', () => {
    expect(WeekCatalog.shared.all).toEqual([])
  })
})
