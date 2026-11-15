import { describe, expect, test } from 'vitest'
import { GreedyBot } from '../Bots/GreedyBot'
import { FlightReport } from '../Flight/FlightReport'
import { Lab, OfferState } from '../Progress/Lab'
import { Logbook } from '../Progress/Logbook'
import { Profile } from '../Progress/Profile'
import { Rank, UnlockKind } from '../Progress/Rank'
import { Loadout } from '../Spacecraft/Loadout'
import { Fixtures } from './Fixtures'

const lab = new Lab()
const options = { weeks: Fixtures.weeks }
const withPoints = (points: number, lifetime = points) => Profile.fromJson({ ...Profile.starter().toJson(), points, lifetimePoints: lifetime })
const state = (profile: Profile, moduleId: string) => lab.offers(profile).find((offer) => offer.card.id === moduleId)!

describe('Rank', () => {
  test('follows the thresholds in the spec', () => {
    expect([0, 149, 150, 399, 400, 899, 900, 1799, 1800, 3499, 3500, 99999].map((points) => Rank.of(points))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6])
    expect(Rank.top).toBe(6)
  })

  test('reports progress to the next rank', () => {
    expect(Rank.progress(0)).toEqual({ rank: 1, into: 0, span: 150, toNext: 150, isTop: false })
    expect(Rank.progress(210)).toEqual({ rank: 2, into: 60, span: 250, toNext: 190, isTop: false })
    expect(Rank.progress(4000)).toEqual({ rank: 6, into: 500, span: 0, toNext: 0, isTop: true })
  })

  test('lists what each rank unlocks', () => {
    const at = (rank: number) => Rank.unlocksAt(rank, Fixtures.weeks).map((unlock) => `${unlock.kind}:${unlock.id}`)
    expect(at(1)).toEqual(['Bus:SmallSat', 'Week:Calm', 'Module:Radar', 'Module:MagneticShield', 'Module:FlightComputer'])
    expect(at(2)).toEqual(['Module:HighEnergyDetector', 'Module:Thrusters', 'Mark:2'])
    expect(at(3)).toEqual(['Bus:Explorer', 'Module:Antenna', 'Module:RepairDrone'])
    expect(at(4)).toEqual(['Week:Storm', 'Mark:3'])
    expect(at(5)).toEqual(['Bus:Flagship'])
    expect(Rank.unlocksAt(6, Fixtures.weeks)).toEqual([{ kind: UnlockKind.Teaser, id: 'Destinations' }])
  })
})

describe('Profile', () => {
  test('a new player has no points, rank 1 and the six starter modules at Mk I', () => {
    const profile = Profile.starter()
    expect(profile.points).toBe(0)
    expect(profile.lifetimePoints).toBe(0)
    expect(profile.rank).toBe(1)
    expect(profile.flights).toBe(0)
    expect(['SolarArray', 'Battery', 'Camera', 'ParticleDetector', 'RadiationShielding'].every((id) => profile.owns(id, 1))).toBe(true)
    expect(profile.owns('Camera', 2)).toBe(false)
    expect(profile.owns('Radar')).toBe(false)
    expect(profile.ownedMark('Radar')).toBe(0)
  })

  test('survives a JSON round trip', () => {
    const profile = lab.buy(withPoints(300), 'Spectrometer').withHintSeen('Hangar')
    const restored = Profile.fromJson(JSON.parse(JSON.stringify(profile.toJson())))
    expect(restored.toJson()).toEqual(profile.toJson())
    expect(restored.hasSeen('Hangar')).toBe(true)
  })

  test('unreadable or outdated data gives a fresh profile', () => {
    for (const bad of [null, undefined, 'text', 42, [], {}, { version: 2, points: 500 }]) {
      expect(Profile.fromJson(bad).toJson()).toEqual(Profile.starter().toJson())
    }
  })

  test('spendable points can never exceed lifetime points', () => {
    expect(withPoints(1000, 150).points).toBe(150)
  })

  test('damaged fields are repaired and unknown modules dropped', () => {
    const profile = Profile.fromJson({
      version: 1,
      points: 900,
      lifetimePoints: 400,
      ownedMarks: { Camera: 0, Radar: 2, Laser: 3, CrewCapsule: 1, Battery: 'x' },
      logbook: { A: { recorded: true, complete: 'yes', bestPoints: -4 }, B: 7 },
      flights: -2,
      lastLoadout: 'broken',
      hintsSeen: ['Hangar', 5],
    })
    expect(profile.points).toBe(400)
    expect(profile.ownedMark('Camera')).toBe(1)
    expect(profile.ownedMark('Radar')).toBe(2)
    expect(profile.ownedMark('Laser')).toBe(0)
    expect(profile.ownedMark('CrewCapsule')).toBe(0)
    expect(profile.ownedMark('Battery')).toBe(1)
    expect(profile.logged('A')).toEqual({ recorded: true, complete: false, bestPoints: 0 })
    expect(profile.logged('B')).toEqual({ recorded: false, complete: false, bestPoints: 0 })
    expect(profile.flights).toBe(0)
    expect(profile.lastLoadout).toBeUndefined()
    expect(profile.toJson().hintsSeen).toEqual(['Hangar'])
  })

  test('a hint is remembered once', () => {
    const profile = Profile.starter().withHintSeen('Hangar').withHintSeen('Hangar')
    expect(profile.toJson().hintsSeen).toEqual(['Hangar'])
  })
})

describe('Lab', () => {
  test('a new player sees what is too expensive, rank-locked and in development', () => {
    const profile = Profile.starter()
    expect(state(profile, 'Radar')).toMatchObject({ state: OfferState.TooExpensive, mark: 1, cost: 90, shortBy: 90 })
    expect(state(profile, 'Camera')).toMatchObject({ state: OfferState.RankLocked, mark: 2, needsRank: 2, ownedMark: 1 })
    expect(state(profile, 'HighEnergyDetector')).toMatchObject({ state: OfferState.RankLocked, mark: 1, needsRank: 2 })
    expect(state(profile, 'Antenna')).toMatchObject({ state: OfferState.RankLocked, needsRank: 3 })
    expect(state(profile, 'CrewCapsule')).toMatchObject({ state: OfferState.InDevelopment })
    expect(lab.offers(profile)).toHaveLength(14)
  })

  test('unlocking spends points and leaves lifetime points and rank alone', () => {
    const before = withPoints(130)
    expect(lab.canBuy(before, 'Radar')).toBe(true)
    const after = lab.buy(before, 'Radar')
    expect(after.points).toBe(40)
    expect(after.lifetimePoints).toBe(130)
    expect(after.owns('Radar', 1)).toBe(true)
    expect(before.owns('Radar', 1)).toBe(false)
    expect(lab.canBuy(after, 'FlightComputer')).toBe(true)
    expect(lab.canBuy(after, 'MagneticShield')).toBe(false)
  })

  test('what cannot be bought is refused', () => {
    expect(() => lab.buy(Profile.starter(), 'Spectrometer')).toThrow()
    expect(() => lab.buy(withPoints(140), 'Camera')).toThrow()
    expect(() => lab.buy(withPoints(9999), 'CrewCapsule')).toThrow()
    expect(lab.canBuy(withPoints(9999), 'Nope')).toBe(false)
  })

  test('marks are bought in order, Mk II from rank 2 and Mk III from rank 4', () => {
    let profile = withPoints(500)
    expect(profile.rank).toBe(3)
    expect(state(profile, 'Camera')).toMatchObject({ state: OfferState.Available, mark: 2, cost: 110 })
    profile = lab.buy(profile, 'Camera')
    expect(profile.ownedMark('Camera')).toBe(2)
    expect(state(profile, 'Camera')).toMatchObject({ state: OfferState.RankLocked, mark: 3, needsRank: 4 })
    profile = lab.buy(Profile.fromJson({ ...profile.toJson(), lifetimePoints: 900 }), 'Camera')
    expect(profile.ownedMark('Camera')).toBe(3)
    expect(profile.points).toBe(500 - 110 - 320)
    expect(state(profile, 'Camera').state).toBe(OfferState.Maxed)
    expect(lab.canBuy(profile, 'Camera')).toBe(false)
  })
})

describe('After a flight', () => {
  const bot = new GreedyBot()

  test('a completed flight banks every point and fills the logbook', () => {
    const loadout = Loadout.starter()
    const { report } = bot.fly(Fixtures.setup(loadout, 'Calm', 12), options)
    const profile = Profile.starter().afterFlight(report, loadout)
    expect(report.survived).toBe(true)
    expect(profile.points).toBe(report.pointsBanked)
    expect(profile.lifetimePoints).toBe(report.pointsBanked)
    expect(profile.flights).toBe(1)
    expect(profile.lastLoadout).toEqual(loadout.toJson())
    for (const encounter of report.encounters) {
      const mark = profile.logged(encounter.eventId)
      expect(mark.recorded).toBe(encounter.anyRecorded)
      expect(mark.complete).toBe(encounter.complete)
      if (encounter.anyRecorded) expect(mark.bestPoints).toBe(encounter.points)
    }
  })

  test('a lost flight banks half', () => {
    const loadout = Loadout.starter()
    const { report } = bot.fly(Fixtures.setup(loadout, 'Storm', 3), options)
    expect(report.survived).toBe(false)
    const profile = Profile.starter().afterFlight(report, loadout)
    expect(profile.points).toBe(Math.floor(report.pointsEarned / 2))
    expect(profile.flights).toBe(1)
  })

  test('the logbook keeps the best result and never un-completes an event', () => {
    const loadout = Loadout.starter()
    const first = bot.fly(Fixtures.setup(loadout, 'Calm', 12), options).report
    const once = Profile.starter().afterFlight(first, loadout)
    const worse = new FlightReport(first.outcome, first.encounters.map((encounter) => ({ ...encounter, points: 1, complete: false })), first.hullLeft, first.legsFlown)
    const twice = once.afterFlight(worse, loadout)
    for (const encounter of first.encounters.filter((each) => each.anyRecorded)) {
      expect(twice.logged(encounter.eventId).bestPoints).toBe(encounter.points)
      expect(twice.logged(encounter.eventId).complete).toBe(encounter.complete)
    }
    expect(twice.flights).toBe(2)
  })
})

describe('Logbook', () => {
  test('lists every event of the weeks the player can fly, storms included', () => {
    const trainee = new Logbook(Profile.starter(), Fixtures.weeks)
    expect(trainee.entries).toHaveLength(Fixtures.calmWeek.everything.length)
    expect(trainee.totals).toEqual({ recorded: 0, complete: 0, total: 27 })
    const director = new Logbook(withPoints(0, 900), Fixtures.weeks)
    expect(director.entries.some((entry) => entry.event.id === 'Storm.2024-05-11')).toBe(true)
    expect(director.inWeek('Storm')).toHaveLength(Fixtures.stormWeek.everything.length)
  })

  test('an event shared by two weeks is listed once', () => {
    const director = new Logbook(withPoints(0, 900), Fixtures.weeks)
    const shared = director.entries.filter((entry) => entry.event.id === Fixtures.planets[0].id)
    expect(shared).toHaveLength(1)
    expect(shared[0].weekIds).toEqual(['Calm', 'Storm'])
  })

  test('counts what has been recorded and completed', () => {
    const loadout = Loadout.starter()
    const { report } = new GreedyBot().fly(Fixtures.setup(loadout, 'Calm', 12), options)
    const logbook = new Logbook(Profile.starter().afterFlight(report, loadout), Fixtures.weeks)
    expect(logbook.totals.recorded).toBe(report.encounters.filter((encounter) => encounter.anyRecorded).length)
    expect(logbook.totals.complete).toBe(report.encounters.filter((encounter) => encounter.complete).length)
  })
})
