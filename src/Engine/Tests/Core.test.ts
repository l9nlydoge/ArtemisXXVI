import { describe, expect, test } from 'vitest'
import { Numbers } from '../Core/Numbers'
import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import { TextRef } from '../Core/TextRef'
import { TurnPlan } from '../Flight/TurnPlan'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { BusCatalog } from '../Spacecraft/BusCatalog'

describe('Numbers', () => {
  test('rounds halves up, including values that binary arithmetic lands just under', () => {
    expect([0.4, 0.5, 1.5, 2.49, 2.5, 8.4, 17.5, 12 * 0.7, 12 * 0.3, 3 * 0.5].map((value) => Numbers.roundHalfUp(value))).toEqual([0, 1, 2, 2, 3, 8, 18, 8, 4, 2])
    expect(Numbers.roundHalfUp(1.15 * 100)).toBe(115)
  })

  test('clamps', () => {
    expect([Numbers.clamp(-1, 0, 5), Numbers.clamp(3, 0, 5), Numbers.clamp(9, 0, 5)]).toEqual([0, 3, 5])
  })
})

describe('Seeded random', () => {
  test('the same seed gives the same sequence', () => {
    const a = new SeededRandom(42)
    const b = new SeededRandom(42)
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()))
  })

  test('values stay in range', () => {
    const random = new SeededRandom(7)
    for (let index = 0; index < 2000; index++) {
      const value = random.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      const whole = random.integer(2, 5)
      expect(whole).toBeGreaterThanOrEqual(2)
      expect(whole).toBeLessThanOrEqual(5)
    }
  })

  test('weighted picks follow the weights', () => {
    const random = new SeededRandom(11)
    const counts = { a: 0, b: 0, c: 0 }
    const items = [{ name: 'a' as const, weight: 6 }, { name: 'b' as const, weight: 3 }, { name: 'c' as const, weight: 1 }]
    for (let index = 0; index < 10000; index++) counts[random.weighted(items, (item) => item.weight).name] += 1
    expect(counts.a / 10000).toBeCloseTo(0.6, 1)
    expect(counts.b / 10000).toBeCloseTo(0.3, 1)
    expect(counts.c / 10000).toBeCloseTo(0.1, 1)
  })

  test('a zero-weight item is never picked', () => {
    const random = new SeededRandom(3)
    for (let index = 0; index < 500; index++) expect(random.weighted(['never', 'always'], (item) => (item === 'never' ? 0 : 1))).toBe('always')
  })

  test('derived streams are repeatable and differ by salt', () => {
    const first = (random: SeededRandom) => Array.from({ length: 5 }, () => random.next())
    expect(first(SeededRandom.derive(100, 1, 2))).toEqual(first(SeededRandom.derive(100, 1, 2)))
    const variants = [SeededRandom.derive(100, 1, 2), SeededRandom.derive(100, 2, 1), SeededRandom.derive(100, 1, 3), SeededRandom.derive(101, 1, 2), SeededRandom.derive(100, 1)]
    expect(new Set(variants.map((random) => random.next())).size).toBe(5)
  })
})

describe('Turn plan and text', () => {
  test('a plan toggles keys and never holds one twice', () => {
    const plan = TurnPlan.empty.toggle('A').toggle('B').with('A')
    expect(plan.list).toEqual(['A', 'B'])
    expect(plan.toggle('A').list).toEqual(['B'])
    expect(TurnPlan.empty.isEmpty).toBe(true)
    expect(new TurnPlan(['A', 'A']).list).toEqual(['A'])
  })

  test('a literal text carries its words as a parameter', () => {
    expect(TextRef.literal('2019 OK')).toEqual(new TextRef('Text.Literal', { text: '2019 OK' }))
  })
})

describe('Tables match the spec', () => {
  const row = (id: string) => {
    const card = ModuleCatalog.shared.get(id)
    return { rank: card.minRank, power: card.powerCost, cost: card.marks.map((mark) => mark.costMusd), bay: card.marks.map((mark) => mark.bayUnits), value: card.marks.map((mark) => mark.value), unlock: card.marks.map((mark) => mark.unlockPoints) }
  }

  test('modules', () => {
    expect(row('SolarArray')).toEqual({ rank: 1, power: 0, cost: [8, 14, 24], bay: [1, 2, 3], value: [2, 3, 5], unlock: [0, 90, 260] })
    expect(row('Battery')).toEqual({ rank: 1, power: 0, cost: [6, 10, 18], bay: [1, 1, 2], value: [6, 10, 16], unlock: [0, 70, 220] })
    expect(row('Camera')).toEqual({ rank: 1, power: 3, cost: [10, 18, 30], bay: [2, 2, 3], value: [3, 4, 6], unlock: [0, 110, 320] })
    expect(row('ParticleDetector')).toEqual({ rank: 1, power: 1, cost: [6, 10, 16], bay: [1, 1, 1], value: [2, 3, 5], unlock: [0, 80, 240] })
    expect(row('Spectrometer')).toEqual({ rank: 1, power: 3, cost: [14, 24, 38], bay: [2, 3, 3], value: [4, 6, 8], unlock: [0, 140, 360] })
    expect(row('Radar')).toEqual({ rank: 1, power: 4, cost: [16, 26, 40], bay: [2, 3, 4], value: [5, 7, 10], unlock: [90, 170, 400] })
    expect(row('HighEnergyDetector')).toEqual({ rank: 2, power: 3, cost: [18, 28, 44], bay: [2, 2, 3], value: [4, 6, 9], unlock: [120, 200, 440] })
    expect(row('RadiationShielding')).toEqual({ rank: 1, power: 0, cost: [5, 9, 15], bay: [1, 2, 3], value: [1, 2, 3], unlock: [0, 80, 240] })
    expect(row('MagneticShield')).toEqual({ rank: 1, power: 4, cost: [12, 20, 32], bay: [2, 2, 3], value: [6, 9, 13], unlock: [70, 150, 380] })
    expect(row('FlightComputer')).toEqual({ rank: 1, power: 0, cost: [6, 10, 16], bay: [1, 1, 1], value: [1, 2, Number.POSITIVE_INFINITY], unlock: [40, 100, 240] })
    expect(row('Thrusters')).toEqual({ rank: 2, power: 2, cost: [10, 16, 26], bay: [1, 1, 2], value: [2, 3, 4], unlock: [100, 180, 400] })
    expect(row('Antenna')).toEqual({ rank: 3, power: 0, cost: [8, 14, 22], bay: [1, 2, 2], value: [1.1, 1.2, 1.35], unlock: [120, 220, 460] })
    expect(row('RepairDrone')).toEqual({ rank: 3, power: 3, cost: [9, 15, 24], bay: [1, 1, 2], value: [6, 9, 12], unlock: [110, 200, 420] })
  })

  test('buses', () => {
    expect(BusCatalog.shared.all.map((bus) => ({ id: bus.id, ...bus.spec }))).toEqual([
      { id: 'SmallSat', minRank: 1, budgetMusd: 60, bayUnits: 8, hull: 16, baseGeneration: 1, baseCapacity: 6 },
      { id: 'Explorer', minRank: 3, budgetMusd: 110, bayUnits: 12, hull: 22, baseGeneration: 2, baseCapacity: 8 },
      { id: 'Flagship', minRank: 5, budgetMusd: 200, bayUnits: 18, hull: 30, baseGeneration: 3, baseCapacity: 10 },
    ])
    expect([1, 2, 3, 4, 5, 6].map((rank) => BusCatalog.shared.largestFor(rank).id)).toEqual(['SmallSat', 'SmallSat', 'Explorer', 'Explorer', 'Flagship', 'Flagship'])
  })

  test('flight rules', () => {
    expect({ ...Rules }).toMatchObject({ legsPerFlight: 6, contactsPerLeg: 2, cruiseTurns: 2, surveyCost: 3, chaseCost: 2, shadowChance: 0.3, anomalyChance: 0.15, anomalyRadiation: 1, unidentifiedNotableChance: 0.3, channelBonus: 3, fullBonus: 5, lostShare: 0.5 })
  })
})
