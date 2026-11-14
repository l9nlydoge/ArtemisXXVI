import type { Scenario } from '../Catalog/Scenario'
import { Catalog } from '../Catalog/Catalog'
import { Difficulty } from '../Design/Difficulty'
import { DesignSampler } from './DesignSampler'
import type { SimulationResult } from './SimulationResult'

export interface RankedMission {
  costMusd: number
  score: number
  succeeded: boolean
}

export class MissionRanking {
  private static readonly cache = new Map<string, MissionRanking>()
  private static readonly fieldSize = 300
  private static readonly seed = 2026

  readonly field: readonly RankedMission[]

  private constructor(scenario: Scenario, difficulty: Difficulty) {
    this.field = new DesignSampler(scenario, Catalog.shared, difficulty)
      .flown(MissionRanking.fieldSize, MissionRanking.seed)
      .map(({ result }) => ({ costMusd: result.costMusd, score: result.score, succeeded: result.succeeded }))
  }

  static for(scenario: Scenario, difficulty: Difficulty): MissionRanking {
    const key = `${scenario.id}:${difficulty}`
    let ranking = MissionRanking.cache.get(key)
    if (!ranking) {
      ranking = new MissionRanking(scenario, difficulty)
      MissionRanking.cache.set(key, ranking)
    }
    return ranking
  }

  get successRate(): number {
    return this.field.length === 0 ? 0 : this.field.filter((mission) => mission.succeeded).length / this.field.length
  }

  beatenBy(result: SimulationResult): number {
    if (!result.flew || this.field.length === 0) return 0
    return this.field.filter((mission) => mission.score < result.score).length / this.field.length
  }
}
