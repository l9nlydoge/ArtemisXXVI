import { describe, expect, test } from 'vitest'
import { Catalog } from '../Catalog/Catalog'
import { Difficulty } from '../Design/Difficulty'
import { MissionRanking } from '../Simulation/MissionRanking'
import { StrategyFinder } from '../Simulation/StrategyFinder'

describe('Balance', () => {
  for (const scenario of Catalog.shared.scenarios.items) {
    test(`${scenario.name} can be won reliably in at least three different ways`, () => {
      const winners = new StrategyFinder(scenario).winners(400, 60, 7)
      expect(winners.size).toBeGreaterThanOrEqual(3)
    })

    test(`${scenario.name} has a comparison field that mostly falls short but sometimes wins`, () => {
      const ranking = MissionRanking.for(scenario, Difficulty.Normal)
      expect(ranking.field.length).toBeGreaterThanOrEqual(200)
      expect(ranking.successRate).toBeGreaterThan(0)
      expect(ranking.successRate).toBeLessThan(0.5)
    })
  }

  test('no single launch vehicle is the only way to win Crop Watch', () => {
    const winners = new StrategyFinder(Catalog.shared.scenarios.get('CropWatch')).winners(400, 60, 7)
    const vehicles = new Set([...winners.values()].map((sample) => sample.design.slices.Program.launchVehicleId))
    expect(vehicles.size).toBeGreaterThanOrEqual(3)
  })
})
