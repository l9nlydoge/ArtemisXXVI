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
  abstract readonly used: number
  abstract readonly limit: number

  get higherIsBetter(): boolean {
    return false
  }

  get fill(): number {
    if (this.limit <= 0) return this.used > 0 ? 1.5 : 0
    return Math.min(1.5, this.used / this.limit)
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
