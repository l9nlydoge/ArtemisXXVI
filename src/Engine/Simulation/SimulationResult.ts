import type { ResolvedDesign } from '../Design/ResolvedDesign'
import type { BudgetSheet } from '../Models/BudgetSheet'
import type { MissionEvent } from './MissionEvent'
import { StarRating } from './StarRating'
import { TraceSeverity, type FailureTrace } from './TraceLink'
import { Verdict } from './Verdict'

export class SimulationResult {
  readonly rating: StarRating

  constructor(
    readonly design: ResolvedDesign,
    readonly budgets: BudgetSheet,
    readonly verdict: Verdict,
    readonly events: readonly MissionEvent[],
    readonly traces: readonly FailureTrace[],
    readonly science: number,
    readonly coverage: number,
    readonly lifeYears: number,
    readonly seed: number,
  ) {
    this.rating = new StarRating(verdict, budgets)
  }

  get score(): number {
    return this.science * this.coverage
  }

  get succeeded(): boolean {
    return this.verdict === Verdict.Success
  }

  get flew(): boolean {
    return this.verdict !== Verdict.Cancelled && this.verdict !== Verdict.Grounded
  }

  get costMusd(): number {
    return this.budgets.cost.totalMusd
  }

  get sciencePerMillion(): number {
    return this.costMusd === 0 ? 0 : this.score / this.costMusd
  }

  get primaryTrace(): FailureTrace | undefined {
    return this.traces.find((trace) => trace.severity === TraceSeverity.Fatal)
  }

  get warnings(): FailureTrace[] {
    return this.traces.filter((trace) => trace.severity === TraceSeverity.Degraded)
  }
}
