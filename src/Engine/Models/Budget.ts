import { EngineConstants } from '../EngineConstants'
import type { DesignField } from '../Design/DesignField'

export enum BudgetKind {
  Mass = 'Mass',
  Power = 'Power',
  Data = 'Data',
  Cost = 'Cost',
  Lifetime = 'Lifetime',
}

export enum BudgetStatus {
  Green = 'Green',
  Yellow = 'Yellow',
  Red = 'Red',
}

export interface BudgetLine {
  label: string
  amount: number
  field: DesignField
}

export abstract class Budget {
  abstract readonly kind: BudgetKind
  abstract readonly margin: number
  abstract readonly lines: readonly BudgetLine[]
  abstract readonly unit: string

  get higherIsBetter(): boolean {
    return false
  }

  get fill(): number {
    if (!Number.isFinite(this.margin)) return this.margin > 0 ? 0 : 1.5
    if (this.margin <= -1) return 1.5
    return Math.min(1.5, 1 / (1 + this.margin))
  }

  get requiredMargin(): number {
    return EngineConstants.flightReadyMargin
  }

  get status(): BudgetStatus {
    if (!Number.isFinite(this.margin) && this.margin > 0) return BudgetStatus.Green
    if (this.margin < 0) return BudgetStatus.Red
    return this.margin < this.requiredMargin ? BudgetStatus.Yellow : BudgetStatus.Green
  }

  get isFlightReady(): boolean {
    return this.status === BudgetStatus.Green
  }

  largestLine(): BudgetLine | undefined {
    return [...this.lines].sort((a, b) => b.amount - a.amount)[0]
  }
}
