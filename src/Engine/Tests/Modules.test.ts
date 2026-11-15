import { describe, expect, test } from 'vitest'
import { Channel } from '../Events/Channel'
import { Instrument } from '../Modules/Instrument'
import { AllMarks } from '../Modules/MarkSpec'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { ModuleFamily } from '../Modules/ModuleFamily'

const catalog = ModuleCatalog.shared

describe('Module catalog', () => {
  test('holds the fourteen modules of the spec', () => {
    expect(catalog.all.map((card) => card.id)).toEqual([
      'SolarArray', 'Battery', 'Camera', 'Spectrometer', 'Radar', 'ParticleDetector', 'HighEnergyDetector',
      'RadiationShielding', 'MagneticShield', 'FlightComputer', 'Thrusters', 'Antenna', 'RepairDrone', 'CrewCapsule',
    ])
  })

  test('the player starts with six modules', () => {
    expect(catalog.starters.map((card) => card.id)).toEqual(['SolarArray', 'Battery', 'Camera', 'Spectrometer', 'ParticleDetector', 'RadiationShielding'])
  })

  test('marks never get cheaper, smaller or weaker', () => {
    for (const card of catalog.all.filter((each) => each.isObtainable)) {
      expect(card.mark(2).costMusd, card.id).toBeGreaterThan(card.mark(1).costMusd)
      expect(card.mark(3).costMusd, card.id).toBeGreaterThan(card.mark(2).costMusd)
      expect(card.mark(2).bayUnits, card.id).toBeGreaterThanOrEqual(card.mark(1).bayUnits)
      expect(card.mark(3).bayUnits, card.id).toBeGreaterThanOrEqual(card.mark(2).bayUnits)
      expect(card.mark(2).value, card.id).toBeGreaterThan(card.mark(1).value)
      expect(card.mark(3).value, card.id).toBeGreaterThan(card.mark(2).value)
      expect(card.mark(3).unlockPoints, card.id).toBeGreaterThan(card.mark(2).unlockPoints)
    }
  })

  test('a mark needs the higher of the module rank and the mark rank', () => {
    expect(AllMarks.map((mark) => catalog.get('Camera').minRankFor(mark))).toEqual([1, 3, 4])
    expect(AllMarks.map((mark) => catalog.get('HighEnergyDetector').minRankFor(mark))).toEqual([2, 3, 4])
    expect(AllMarks.map((mark) => catalog.get('Antenna').minRankFor(mark))).toEqual([3, 3, 4])
  })

  test('only modules that cost power are active', () => {
    const active = catalog.all.filter((card) => card.isActive).map((card) => card.id)
    expect(active).toEqual(['Camera', 'Spectrometer', 'Radar', 'ParticleDetector', 'HighEnergyDetector', 'MagneticShield', 'Thrusters', 'RepairDrone'])
    expect(catalog.get('Camera').powerCost).toBe(3)
    expect(catalog.get('Radar').powerCost).toBe(4)
    expect(catalog.get('SolarArray').powerCost).toBe(0)
  })

  test('every channel has exactly one instrument', () => {
    for (const channel of Object.values(Channel)) {
      expect(catalog.all.filter((card) => card instanceof Instrument && card.channel === channel)).toHaveLength(1)
    }
    expect(catalog.instrumentFor(Channel.Radar)?.id).toBe('Radar')
    expect(catalog.instrumentFor(Channel.Radar)?.canSurvey).toBe(true)
    expect(catalog.instrumentFor(Channel.Visible)?.canSurvey).toBe(false)
  })

  test('only power modules can be fitted twice', () => {
    expect(catalog.all.filter((card) => card.maxCopies > 1).map((card) => card.id)).toEqual(['SolarArray', 'Battery'])
  })

  test('the crew capsule is shown but cannot be obtained', () => {
    const capsule = catalog.get('CrewCapsule')
    expect(capsule.family).toBe(ModuleFamily.Crew)
    expect(capsule.isObtainable).toBe(false)
    expect(capsule.isStarter).toBe(false)
  })

  test('asking for an unknown module fails loudly', () => {
    expect(() => catalog.get('Nope')).toThrow()
  })
})
