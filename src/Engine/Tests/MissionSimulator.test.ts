import { describe, expect, test } from 'vitest'
import { Catalog } from '../Catalog/Catalog'
import { DesignField } from '../Design/DesignField'
import { MissionDesign } from '../Design/MissionDesign'
import { MissionSimulator } from '../Simulation/MissionSimulator'
import { Verdict } from '../Simulation/Verdict'

const simulator = new MissionSimulator()
const cropWatch = Catalog.shared.scenarios.get('CropWatch')
const stormChaser = Catalog.shared.scenarios.get('StormChaser')

const landsatReplica = new MissionDesign({
  Science: { instrumentIds: ['LandsatImager', 'ThermalImager'], designLifeYears: 5 },
  Spacecraft: { busId: 'Large', arrayTypeId: 'Rigid', arrayAreaM2: 9, batteryWh: 4000, shielded: false },
  Operations: { orbitId: 'Sso705', commsId: 'XBand', groundStations: 5 },
  Program: { launchVehicleId: 'Falcon9', copies: 1 },
})

const mediumImager = new MissionDesign({
  Science: { instrumentIds: ['LandsatImager'], designLifeYears: 5 },
  Spacecraft: { busId: 'Medium', arrayTypeId: 'Rigid', arrayAreaM2: 6, batteryWh: 3000, shielded: false },
  Operations: { orbitId: 'Sso705', commsId: 'XBand', groundStations: 4 },
  Program: { launchVehicleId: 'VegaC', copies: 1 },
})

const stormCubeSats = new MissionDesign({
  Science: { instrumentIds: ['MiniRadiometer'], designLifeYears: 2 },
  Spacecraft: { busId: 'CubeSat6U', arrayTypeId: 'Rigid', arrayAreaM2: 0.15, batteryWh: 60, shielded: false },
  Operations: { orbitId: 'Leo450', commsId: 'SBand', groundStations: 1 },
  Program: { launchVehicleId: 'Electron', copies: 4 },
})

describe('MissionSimulator', () => {
  test('a Landsat replica is launchable and Landsat-sized but over the Crop Watch budget', () => {
    const result = simulator.run({ scenario: cropWatch, design: landsatReplica, seed: 1 })
    expect(result.budgets.mass.canLaunch).toBe(true)
    expect(result.budgets.mass.launchMassKg).toBeGreaterThan(2000)
    expect(result.budgets.mass.launchMassKg).toBeLessThan(3500)
    expect(result.verdict).toBe(Verdict.Cancelled)
    expect(result.budgets.cost.totalMusd).toBeGreaterThan(cropWatch.spec.budgetMusd)
  })

  test('a medium-bus imager in sun-synchronous orbit succeeds', () => {
    const result = simulator.run({ scenario: cropWatch, design: mediumImager, seed: 3 })
    expect(result.verdict).toBe(Verdict.Success)
    expect(result.rating.stars).toBeGreaterThanOrEqual(2)
  })

  test('the same seed always flies the same mission', () => {
    const first = simulator.run({ scenario: cropWatch, design: mediumImager, seed: 42 })
    const second = simulator.run({ scenario: cropWatch, design: mediumImager, seed: 42 })
    expect(second.events).toEqual(first.events)
    expect(second.science).toBe(first.science)
  })

  test('an undersized battery wears out and the trace points at the battery', () => {
    const design = mediumImager.with('Spacecraft', { batteryWh: 900 })
    const result = simulator.run({ scenario: cropWatch, design, seed: 3 })
    expect(result.verdict).toBe(Verdict.Lost)
    expect(result.primaryTrace?.headline.key).toBe('Trace.BatteryWornOut')
    expect(result.primaryTrace?.rootDecision?.field).toBe(DesignField.Battery)
  })

  test('a spacecraft too heavy for the rocket is grounded', () => {
    const design = mediumImager.with('Program', { launchVehicleId: 'Electron' })
    const result = simulator.run({ scenario: cropWatch, design, seed: 3 })
    expect(result.verdict).toBe(Verdict.Grounded)
    expect(result.primaryTrace?.rootDecision?.field).toBe(DesignField.LaunchVehicle)
  })

  test('a thin downlink is reported with ground stations as the fix', () => {
    const result = simulator.run({ scenario: stormChaser, design: stormCubeSats, seed: 3 })
    const backlog = result.warnings.find((trace) => trace.headline.key === 'Trace.DataBacklog')
    expect(backlog?.rootDecision?.field).toBe(DesignField.GroundStations)
    const fixed = simulator.run({ scenario: stormChaser, design: stormCubeSats.with('Operations', { groundStations: 2 }), seed: 3 })
    expect(fixed.science).toBeGreaterThan(result.science)
  })

  test('designs survive a URL round trip', () => {
    expect(MissionDesign.decode(mediumImager.encode()).slices).toEqual(mediumImager.slices)
  })
})
