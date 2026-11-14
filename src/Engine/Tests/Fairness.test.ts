import { describe, expect, test } from 'vitest'
import { Catalog } from '../Catalog/Catalog'
import { Difficulty } from '../Design/Difficulty'
import { MissionDesign } from '../Design/MissionDesign'
import { MissionEventKind } from '../Simulation/MissionEvent'
import { MissionSimulator } from '../Simulation/MissionSimulator'
import { Verdict } from '../Simulation/Verdict'

const simulator = new MissionSimulator()
const cropWatch = Catalog.shared.scenarios.get('CropWatch')
const stormChaser = Catalog.shared.scenarios.get('StormChaser')
const seeds = Array.from({ length: 300 }, (_, index) => index + 1)
const luck = [MissionEventKind.SolarStorm, MissionEventKind.Micrometeoroid, MissionEventKind.HighSolarActivity]

const soundImager = new MissionDesign({
  Science: { instrumentIds: ['LandsatImager'], designLifeYears: 5 },
  Spacecraft: { busId: 'Medium', arrayTypeId: 'Rigid', arrayAreaM2: 6, batteryWh: 3000, shielded: false },
  Operations: { orbitId: 'Sso705', commsId: 'XBand', groundStations: 5 },
  Program: { launchVehicleId: 'VegaC', copies: 1 },
})

const thinReserve = new MissionDesign({
  Science: { instrumentIds: ['MiniRadiometer'], designLifeYears: 3 },
  Spacecraft: { busId: 'CubeSat6U', arrayTypeId: 'Rigid', arrayAreaM2: 0.2, batteryWh: 80, shielded: false },
  Operations: { orbitId: 'Leo450', commsId: 'SBand', groundStations: 3 },
  Program: { launchVehicleId: 'Electron', copies: 5 },
})

describe('Fairness', () => {
  test('on Normal, luck cannot strike in the first year', () => {
    for (const seed of seeds) {
      const result = simulator.run({ scenario: cropWatch, design: soundImager, seed })
      expect(result.events.filter((event) => luck.includes(event.kind) && event.year < 1)).toEqual([])
    }
  })

  test('on Normal, a sound design with reserve never ends at launch', () => {
    const results = seeds.map((seed) => simulator.run({ scenario: cropWatch, design: soundImager, seed }))
    expect(results.some((result) => result.verdict === Verdict.LaunchFailure)).toBe(false)
    const reflown = results.filter((result) => result.events.some((event) => event.kind === MissionEventKind.Reflight))
    expect(reflown.length).toBeGreaterThan(0)
    expect(reflown.every((result) => result.extraCostMusd > 0 && result.costMusd <= cropWatch.spec.budgetMusd)).toBe(true)
  })

  test('on Normal, a failed launch with no reserve for a second try ends the mission and says why', () => {
    const results = seeds.map((seed) => simulator.run({ scenario: stormChaser, design: thinReserve, seed }))
    expect(results[0].budgets.cost.overBudget).toBe(false)
    expect(results[0].reserveFraction).toBeLessThan(0.15)
    const failures = results.filter((result) => result.verdict === Verdict.LaunchFailure)
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0].primaryTrace?.causes.some((link) => link.key === 'Trace.NoReflight')).toBe(true)
  })

  test('on Easy, launches always succeed', () => {
    const results = seeds.map((seed) => simulator.run({ scenario: stormChaser, design: thinReserve, seed, difficulty: Difficulty.Easy }))
    expect(results.some((result) => result.verdict === Verdict.LaunchFailure || result.extraCostMusd > 0)).toBe(false)
  })

  test('on Normal, a micrometeoroid never destroys the last instrument', () => {
    for (const seed of seeds) {
      const result = simulator.run({ scenario: cropWatch, design: soundImager, seed })
      expect(result.events.some((event) => event.kind === MissionEventKind.Micrometeoroid)).toBe(false)
    }
  })
})
