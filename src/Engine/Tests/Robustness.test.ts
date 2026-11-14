import { describe, expect, test } from 'vitest'
import { SeededRandom } from '../Core/SeededRandom'
import { UtcDate } from '../Core/UtcDate'
import { DateWindow } from '../Events/DateWindow'
import { Flight, FlightPhase } from '../Flight/Flight'
import { CommandType, Commands, type FlightCommand } from '../Flight/FlightCommand'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { Profile } from '../Progress/Profile'
import { Loadout } from '../Spacecraft/Loadout'
import { LoadoutIssueKind } from '../Spacecraft/LoadoutIssue'
import { Week } from '../Weeks/Week'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const starter = Loadout.starter()
const begin = (loadout: unknown, extra: object = {}) => Flight.begin({ loadout: loadout as never, weekId: 'Calm', seed: 7, ...extra }, options)

describe('Dates', () => {
  test('a date without a time zone is refused, so no browser reads it as local time', () => {
    for (const bad of ['2019-07-25', '2019-07-25T01:22', '2019-07-25T01:22:00', '2019-Jul-25 01:22', '', 'soon']) expect(() => UtcDate.parse(bad), bad).toThrow()
    expect(UtcDate.parse('2019-07-25T01:22:00Z')).toBe(Date.UTC(2019, 6, 25, 1, 22))
    expect(UtcDate.parse('2019-07-25T04:22:00+03:00')).toBe(Date.UTC(2019, 6, 25, 1, 22))
  })

  test('a window refuses such dates when built and when asked', () => {
    expect(() => new DateWindow('2019-07-25', '2019-07-26')).toThrow()
    const window = new DateWindow('2019-07-25T00:00:00Z', '2019-07-26T00:00:00Z')
    expect(() => window.contains('2019-07-25T01:22')).toThrow()
    expect(window.contains('2019-07-25T02:22:00+03:00')).toBe(false)
    expect(window.contains('2019-07-25T03:22:00+03:00')).toBe(true)
  })
})

describe('Reading a saved loadout', () => {
  test('anything that is not a loadout becomes an empty small spacecraft', () => {
    for (const bad of [null, undefined, 7, 'text', [], { modules: {} }, { modules: 'abc' }, { busId: 5, modules: null }]) {
      const loadout = Loadout.fromJson(bad)
      expect(loadout.bus.id).toBe('SmallSat')
      expect(loadout.installed).toEqual([])
    }
  })

  test('bad entries are skipped and good ones kept', () => {
    const loadout = Loadout.fromJson({ busId: 'Explorer', modules: [null, 3, 'x', { id: 'Camera' }, { id: 'Camera', mark: 2, copy: 1.5 }, { id: 'Camera', mark: '2', copy: 1 }, { id: 'Radar', mark: 1, copy: 1 }, { id: 'CrewCapsule', mark: 1, copy: 1 }] })
    expect(loadout.bus.id).toBe('Explorer')
    expect(loadout.installed.map((module) => module.key)).toEqual(['Radar#1'])
  })

  test('two entries with the same key count once', () => {
    const loadout = Loadout.fromJson({ busId: 'SmallSat', modules: [{ id: 'SolarArray', mark: 1, copy: 1 }, { id: 'SolarArray', mark: 3, copy: 1 }, { id: 'Camera', mark: 1, copy: 1 }] })
    expect(loadout.installed.map((module) => [module.key, module.mark])).toEqual([['SolarArray#1', 1], ['Camera#1', 1]])
    expect(loadout.costMusd).toBe(18)
  })

  test('a profile cleans the loadout it remembers', () => {
    const profile = Profile.fromJson({ ...Profile.starter().toJson(), lastLoadout: { busId: 'Nope', modules: [null, { id: 'Camera', mark: 1, copy: 1 }, { id: 'Laser', mark: 1, copy: 1 }] } })
    expect(profile.lastLoadout).toEqual({ busId: 'SmallSat', modules: [{ id: 'Camera', mark: 1, copy: 1 }] })
    expect(() => Loadout.fromJson(profile.lastLoadout)).not.toThrow()
    expect(Profile.fromJson({ ...Profile.starter().toJson(), lastLoadout: { modules: 'x' } }).lastLoadout).toBeUndefined()
  })
})

describe('Starting a flight checks its setup', () => {
  test('a loadout that breaks a structural rule cannot fly', () => {
    const cases: [Loadout, LoadoutIssueKind][] = [
      [new Loadout(starter.bus, []), LoadoutIssueKind.NoInstrument],
      [Fixtures.loadout('SmallSat', [['Camera', 3], ['Spectrometer', 3], ['Radar', 3]]), LoadoutIssueKind.OverBudget],
      [Fixtures.loadout('SmallSat', [['Camera', 1], ['Spectrometer', 1], ['Radar', 1], ['MagneticShield', 1]]), LoadoutIssueKind.OverBay],
      [Fixtures.loadout('Flagship', [['Camera', 1], ['SolarArray', 1], ['SolarArray', 1], ['SolarArray', 1]]), LoadoutIssueKind.TooManyCopies],
      [Fixtures.loadout('Flagship', [['Camera', 1], ['RadiationShielding', 1], ['RadiationShielding', 1]]), LoadoutIssueKind.TooManyCopies],
    ]
    for (const [loadout, kind] of cases) expect(() => begin(loadout.toJson()), kind).toThrow(kind)
  })

  test('the crew capsule can never be flown', () => {
    const capsule = ModuleCatalog.shared.get('CrewCapsule')
    expect(starter.install(capsule, 1).issues(Fixtures.everything)).toEqual([{ kind: LoadoutIssueKind.NotOwned, moduleId: 'CrewCapsule', amount: 1 }])
    expect(() => begin({ busId: 'SmallSat', modules: [{ id: 'CrewCapsule', mark: 1, copy: 1 }] })).toThrow(LoadoutIssueKind.NoInstrument)
  })

  test('with an owner given, modules and buses the player has not unlocked are refused', () => {
    const owner = Profile.starter()
    expect(() => Flight.begin(Fixtures.setup(starter, 'Calm', 1), { ...options, owner })).not.toThrow()
    expect(() => Flight.begin(Fixtures.setup(starter.install(ModuleCatalog.shared.get('Spectrometer'), 1), 'Calm', 1), { ...options, owner })).toThrow(LoadoutIssueKind.NotOwned)
    expect(() => Flight.begin(Fixtures.setup(Fixtures.loadout('Explorer', [['Camera', 1]]), 'Calm', 1), { ...options, owner })).toThrow(LoadoutIssueKind.BusLocked)
  })

  test('a seed must be a whole number from 0 up to 2 to the 32nd', () => {
    for (const bad of [undefined, null, Number.NaN, 'abc', 0.9, -1, 2 ** 32, 7 + 2 ** 32]) expect(() => begin(starter.toJson(), { seed: bad }), String(bad)).toThrow()
    expect(() => begin(starter.toJson(), { seed: 0 })).not.toThrow()
    expect(() => begin(starter.toJson(), { seed: 2 ** 32 - 1 })).not.toThrow()
    expect(SeededRandom.isSeed(SeededRandom.randomSeed())).toBe(true)
  })

  test('a flight saved against week data that has since changed is refused', () => {
    const setup = Flight.setup(starter, Fixtures.calmWeek, 5)
    expect(setup.weekSignature).toBe(Fixtures.calmWeek.signature)
    expect(() => Flight.begin(setup, options)).not.toThrow()
    const changed = new Week('Calm', 1, Fixtures.calmWeek.legs, Fixtures.calmWeek.events.slice(1))
    expect(changed.signature).not.toBe(Fixtures.calmWeek.signature)
    expect(() => Flight.begin(setup, { weeks: new WeekCatalog([changed]) })).toThrow('changed')
    expect(Fixtures.stormWeek.signature).not.toBe(Fixtures.calmWeek.signature)
    expect(new Week('Calm', 1, Fixtures.calmWeek.legs, Fixtures.calmWeek.events).signature).toBe(Fixtures.calmWeek.signature)
  })

  test('cooldowns are part of the setup, so a replay always uses the rule the flight was flown under', () => {
    const setup = Flight.setup(starter, Fixtures.calmWeek, 5, true)
    const flight = Flight.begin(setup, options)
    flight.apply(Commands.choose(0))
    flight.apply(Commands.commit(['Camera#1']))
    expect(flight.can(Commands.commit(['Camera#1']))).toBe(false)
    const replayed = Flight.replay(JSON.parse(JSON.stringify(setup)), flight.log, options)
    expect(replayed.can(Commands.commit(['Camera#1']))).toBe(false)
    const plain = Flight.begin(Flight.setup(starter, Fixtures.calmWeek, 5), options)
    plain.apply(Commands.choose(0))
    plain.apply(Commands.commit(['Camera#1']))
    expect(plain.can(Commands.commit(['Camera#1']))).toBe(true)
  })
})

describe('Commands from a damaged log', () => {
  const malformed = [
    { type: CommandType.Choose, contactIndex: 'length' },
    { type: CommandType.Choose, contactIndex: 0.5 },
    { type: CommandType.Choose },
    { type: CommandType.Chase, contactIndex: 'length' },
    { type: CommandType.Commit },
    { type: CommandType.Commit, keys: 'Camera#1' },
    { type: CommandType.Commit, keys: [7] },
    { type: 'Explode' },
    {},
  ] as unknown as FlightCommand[]

  test('are refused in every phase and change nothing', () => {
    const chaser = Fixtures.loadout('Flagship', [['SolarArray', 2], ['Battery', 2], ['Camera', 1], ['Thrusters', 1]])
    const scanning = Flight.begin(Fixtures.setup(chaser, 'Calm', 3), options)
    const fighting = Flight.begin(Fixtures.setup(chaser, 'Calm', 3), options)
    fighting.apply(Commands.choose(0))
    const done = Flight.begin(Fixtures.setup(chaser, 'Calm', 3), options)
    done.apply(Commands.choose(0))
    while (done.phase === FlightPhase.Encounter) done.apply(Commands.commit([]))
    for (const flight of [scanning, fighting, done]) {
      const before = JSON.stringify([flight.phase, flight.state, flight.log, flight.legIndex])
      for (const command of malformed) {
        expect(flight.can(command), JSON.stringify(command)).toBe(false)
        expect(() => flight.apply(command)).toThrow()
      }
      expect(JSON.stringify([flight.phase, flight.state, flight.log, flight.legIndex])).toBe(before)
    }
  })

  test('a replay stops at the first bad command instead of carrying on wrongly', () => {
    expect(() => Flight.replay(Fixtures.setup(starter, 'Calm', 3), [Commands.choose(0), malformed[4], Commands.proceed], options)).toThrow()
  })
})

describe('After the spacecraft is lost', () => {
  const lose = () => {
    const flight = Flight.begin(Fixtures.setup(Fixtures.loadout('SmallSat', [['Camera', 1]]), 'Storm', 4), options)
    flight.apply(Commands.hold)
    flight.apply(Commands.hold)
    flight.apply(Commands.choose(0))
    while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit([]))
    return flight
  }

  test('the encounter still points at the turn that did it', () => {
    const flight = lose()
    const encounter = flight.encounter!
    expect(flight.phase).toBe(FlightPhase.Lost)
    expect(encounter.contact.conditions.map((condition) => condition.radiation)).toEqual([3, 7, 10, 7, 3])
    expect(encounter.turnIndex).toBe(2)
    expect(encounter.turnsPlayed).toBe(3)
    expect(encounter.current.radiation).toBe(10)
    expect(encounter.visible.map((condition) => condition !== undefined)).toEqual([true, true, true, false, false])
    expect(encounter.history.map((outcome) => outcome.incoming)).toEqual([3, 7, 10])
    expect(encounter.history.at(-1)).toMatchObject({ lost: true, encounterOver: true, hullAfter: 0 })
  })

  test('the hull reads zero, never below', () => {
    const flight = lose()
    expect(flight.state.hull).toBe(0)
    expect(flight.report().hullLeft).toBe(0)
    expect(flight.lastOutcome?.hullAfter).toBe(0)
  })

  test('the report names the radiation of the fatal turn and what stood against it', () => {
    const report = lose().report()
    expect(report.loss).toEqual({ legIndex: 2, eventId: 'Storm.2024-05-10', radiation: 10, shielding: 0, hadActiveShield: false })
    expect(report.legsFlown).toBe(3)
    const shielded = Flight.begin(Fixtures.setup(Fixtures.loadout('SmallSat', [['Camera', 1], ['MagneticShield', 1], ['RadiationShielding', 1]]), 'Storm', 4), options)
    shielded.apply(Commands.hold)
    shielded.apply(Commands.hold)
    shielded.apply(Commands.choose(0))
    while (shielded.phase === FlightPhase.Encounter) shielded.apply(Commands.commit([]))
    expect(shielded.report().loss).toMatchObject({ shielding: 1, hadActiveShield: true })
  })

  test('no command is accepted any more', () => {
    const flight = lose()
    for (const command of [Commands.hold, Commands.proceed, Commands.choose(0), Commands.commit([]), Commands.survey, Commands.chase(1)]) expect(flight.can(command)).toBe(false)
  })
})

describe('Leftovers between legs', () => {
  test('the last turn outcome is cleared when the flight moves on', () => {
    const flight = Flight.begin(Fixtures.setup(starter, 'Calm', 3), options)
    flight.apply(Commands.choose(0))
    while (flight.phase === FlightPhase.Encounter) flight.apply(Commands.commit([]))
    expect(flight.lastOutcome).toBeDefined()
    flight.apply(Commands.proceed)
    expect(flight.lastOutcome).toBeUndefined()
    expect(flight.encounter).toBeUndefined()
  })
})
