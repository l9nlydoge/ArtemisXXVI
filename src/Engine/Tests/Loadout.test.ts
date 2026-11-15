import { describe, expect, test } from 'vitest'
import { Channel } from '../Events/Channel'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { Profile } from '../Progress/Profile'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import { Loadout } from '../Spacecraft/Loadout'
import { LoadoutIssueKind } from '../Spacecraft/LoadoutIssue'
import { Spacecraft } from '../Spacecraft/Spacecraft'
import { Fixtures } from './Fixtures'

const modules = ModuleCatalog.shared
const starterProfile = Profile.starter()
const kinds = (loadout: Loadout, owner = Fixtures.everything) => loadout.issues(owner).map((issue) => issue.kind)

describe('Loadout', () => {
  test('the starter loadout costs 49 of 60 and fills all 8 bay units', () => {
    const starter = Loadout.starter()
    expect(starter.bus.id).toBe('SmallSat')
    expect(starter.costMusd).toBe(49)
    expect(starter.bayUsed).toBe(8)
    expect(starter.budgetLeft).toBe(11)
    expect(starter.bayLeft).toBe(0)
    expect(starter.issues(starterProfile)).toEqual([])
    expect(starter.isValid(starterProfile)).toBe(true)
  })

  test('going over budget and over bay space are reported with the excess', () => {
    const heavy = Fixtures.loadout('SmallSat', [['Camera', 3], ['Spectrometer', 3], ['Radar', 1]])
    expect(heavy.costMusd).toBe(84)
    expect(heavy.bayUsed).toBe(9)
    expect(heavy.issues(Fixtures.everything)).toEqual([
      { kind: LoadoutIssueKind.OverBudget, amount: 24 },
      { kind: LoadoutIssueKind.OverBay, amount: 1 },
    ])
  })

  test('a module or mark the player has not unlocked is reported', () => {
    const loadout = Loadout.starter().install(modules.get('Radar'), 1).setMark('Camera#1', 2)
    const issues = loadout.issues(starterProfile).filter((issue) => issue.kind === LoadoutIssueKind.NotOwned)
    expect(issues).toEqual([
      { kind: LoadoutIssueKind.NotOwned, moduleId: 'Camera', amount: 2 },
      { kind: LoadoutIssueKind.NotOwned, moduleId: 'Radar', amount: 1 },
    ])
  })

  test('two solar arrays are allowed and a third is not', () => {
    const two = Fixtures.loadout('Flagship', [['Camera', 1], ['SolarArray', 1], ['SolarArray', 3]])
    expect(two.copiesOf('SolarArray').map((module) => module.key)).toEqual(['SolarArray#1', 'SolarArray#2'])
    expect(kinds(two)).toEqual([])
    expect(two.canAdd(modules.get('SolarArray'))).toBe(false)
    expect(two.canAdd(modules.get('Battery'))).toBe(true)
    const three = two.install(modules.get('SolarArray'), 1)
    expect(three.issues(Fixtures.everything)).toEqual([{ kind: LoadoutIssueKind.TooManyCopies, moduleId: 'SolarArray', amount: 2 }])
  })

  test('each copy keeps its own mark and a removed copy number is reused', () => {
    const loadout = Fixtures.loadout('Flagship', [['Camera', 1], ['Battery', 1], ['Battery', 2]])
    expect(loadout.find('Battery#2')?.mark).toBe(2)
    const refitted = loadout.remove('Battery#1').install(modules.get('Battery'), 3)
    expect(refitted.copiesOf('Battery').map((module) => [module.key, module.mark])).toEqual([['Battery#1', 3], ['Battery#2', 2]])
  })

  test('a spacecraft with no instrument cannot fly', () => {
    expect(kinds(Fixtures.loadout('SmallSat', [['SolarArray', 1], ['Battery', 1]]))).toEqual([LoadoutIssueKind.NoInstrument])
  })

  test('a bus above the player rank is reported', () => {
    const loadout = Loadout.starter().withBus(BusCatalog.shared.get('Explorer'))
    expect(loadout.issues(starterProfile)).toEqual([{ kind: LoadoutIssueKind.BusLocked, amount: 3 }])
  })

  test('the crew capsule cannot be added', () => {
    expect(Loadout.starter().canAdd(modules.get('CrewCapsule'))).toBe(false)
  })

  test('changes return a new loadout and leave the old one alone', () => {
    const before = Loadout.starter()
    const after = before.install(modules.get('Radar'), 1)
    expect(before.has('Radar')).toBe(false)
    expect(after.has('Radar')).toBe(true)
    expect(after.remove('Radar#1').toJson()).toEqual(before.toJson())
    expect(after.setMark('Radar#1', 3).costMusd).toBe(before.costMusd + 40)
  })

  test('modules are kept in catalog order whatever order they were added in', () => {
    const loadout = Fixtures.loadout('Flagship', [['MagneticShield', 1], ['Camera', 1], ['SolarArray', 1]])
    expect(loadout.installed.map((module) => module.card.id)).toEqual(['SolarArray', 'Camera', 'MagneticShield'])
  })

  test('survives a JSON round trip and drops entries it does not know', () => {
    const loadout = Fixtures.loadout('Explorer', [['Camera', 2], ['Battery', 1], ['Battery', 3]])
    expect(Loadout.fromJson(JSON.parse(JSON.stringify(loadout.toJson()))).toJson()).toEqual(loadout.toJson())
    const damaged = Loadout.fromJson({ busId: 'Nope', modules: [{ id: 'Camera', mark: 1, copy: 1 }, { id: 'Laser', mark: 1, copy: 1 }, { id: 'Radar', mark: 7 as never, copy: 1 }] })
    expect(damaged.bus.id).toBe('SmallSat')
    expect(damaged.installed.map((module) => module.key)).toEqual(['Camera#1'])
  })
})

describe('Spacecraft', () => {
  test('the starter spacecraft has the values in the spec', () => {
    const craft = new Spacecraft(Loadout.starter())
    expect(craft.generation).toBe(3)
    expect(craft.capacity).toBe(12)
    expect(craft.maxHull).toBe(16)
    expect(craft.passiveShield).toBe(1)
    expect(craft.lookahead).toBe(0)
    expect(craft.pointsMultiplier).toBe(1)
    expect(craft.burns).toBe(0)
    expect(craft.hasRadar).toBe(false)
    expect(craft.actives.map((module) => module.key)).toEqual(['Camera#1', 'Spectrometer#1', 'ParticleDetector#1'])
    expect(craft.channels).toEqual([Channel.Visible, Channel.Spectrum, Channel.Particles])
  })

  test('copies and marks add up', () => {
    const craft = new Spacecraft(Fixtures.loadout('Flagship', [
      ['SolarArray', 3], ['SolarArray', 2], ['Battery', 3], ['Battery', 1], ['Radar', 2], ['RadiationShielding', 3],
      ['MagneticShield', 2], ['FlightComputer', 2], ['Thrusters', 3], ['Antenna', 3], ['RepairDrone', 1],
    ]))
    expect(craft.generation).toBe(3 + 5 + 3)
    expect(craft.capacity).toBe(10 + 16 + 6)
    expect(craft.maxHull).toBe(30)
    expect(craft.passiveShield).toBe(3)
    expect(craft.lookahead).toBe(2)
    expect(craft.pointsMultiplier).toBe(1.35)
    expect(craft.burns).toBe(4)
    expect(craft.hasRadar).toBe(true)
    expect(craft.magneticShield?.value).toBe(9)
    expect(craft.repairDrone?.value).toBe(6)
    expect(craft.actives.map((module) => module.card.id)).toEqual(['Radar', 'MagneticShield', 'Thrusters', 'RepairDrone'])
  })

  test('the top flight computer sees every turn', () => {
    expect(new Spacecraft(Fixtures.loadout('Flagship', [['Camera', 1], ['FlightComputer', 3]])).lookahead).toBe(Number.POSITIVE_INFINITY)
  })

  test('recording needs the right instrument at a high enough mark', () => {
    const craft = new Spacecraft(Fixtures.loadout('Flagship', [['Camera', 1], ['Spectrometer', 2]]))
    expect(craft.canRecord(Channel.Visible)).toBe(true)
    expect(craft.canRecord(Channel.Visible, 2)).toBe(false)
    expect(craft.canRecord(Channel.Spectrum, 2)).toBe(true)
    expect(craft.canRecord(Channel.Radar)).toBe(false)
    expect(craft.instrumentFor(Channel.Spectrum)?.key).toBe('Spectrometer#1')
  })
})
