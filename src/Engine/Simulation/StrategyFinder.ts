import { Catalog } from '../Catalog/Catalog'
import type { Scenario } from '../Catalog/Scenario'
import { Difficulty } from '../Design/Difficulty'
import type { SliceKey } from '../Design/DesignSlices'
import { MissionDesign } from '../Design/MissionDesign'
import { DesignSampler, type DesignSample } from './DesignSampler'
import { SeededRandom } from './SeededRandom'

export class StrategyFinder {
  private static readonly slices: readonly SliceKey[] = ['Science', 'Spacecraft', 'Operations', 'Program']
  private static readonly trialSeeds: readonly number[] = [11, 23, 37, 53, 71]
  private readonly sampler: DesignSampler

  constructor(
    private readonly scenario: Scenario,
    difficulty: Difficulty = Difficulty.Normal,
  ) {
    this.sampler = new DesignSampler(scenario, Catalog.shared, difficulty)
  }

  describe(design: MissionDesign): string {
    const { Science, Spacecraft, Operations, Program } = design.slices
    const primary = Science.instrumentIds.filter((id) => this.scenario.instrumentFit(id) >= 0.3).sort().join('+')
    return [Spacecraft.busId, primary, Operations.orbitId, Program.launchVehicleId].join(' / ')
  }

  winners(restarts: number, steps: number, seed: number): Map<string, DesignSample> {
    const random = new SeededRandom(seed)
    const found = new Map<string, DesignSample>()
    for (let restart = 0; restart < restarts; restart++) {
      let best = this.sampler.plausibleDesign(random)
      let bestFitness = this.fitness(best)
      for (let step = 0; step < steps; step++) {
        const donor = this.sampler.plausibleDesign(random)
        const key = random.pick(StrategyFinder.slices)
        const candidate = new MissionDesign({ ...best.slices, [key]: donor.slices[key] })
        const fitness = this.fitness(candidate)
        if (fitness > bestFitness) {
          best = candidate
          bestFitness = fitness
        }
      }
      if (this.isReliable(best)) found.set(this.describe(best), this.sampler.fly(best, StrategyFinder.trialSeeds[0]))
    }
    return found
  }

  isReliable(design: MissionDesign): boolean {
    const wins = StrategyFinder.trialSeeds.filter((trial) => this.sampler.fly(design, trial).result.succeeded).length
    return wins / StrategyFinder.trialSeeds.length >= 0.8
  }

  private fitness(design: MissionDesign): number {
    const required = this.scenario.spec.requiredScience
    const budget = this.scenario.spec.budgetMusd
    return StrategyFinder.trialSeeds.reduce((sum, trial) => {
      const { result } = this.sampler.fly(design, trial)
      const win = result.succeeded ? 10 + result.rating.stars : 0
      const progress = result.flew ? Math.min(1, result.score / required) : -result.costMusd / budget
      return sum + win + progress
    }, 0)
  }
}
