import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { Budget, BudgetKind, type BudgetLine } from './Budget'
import { SubsystemModel } from './SubsystemModel'

export class DataBudget extends Budget {
  readonly kind = BudgetKind.Data
  readonly unit = 'Gb/day'

  constructor(
    readonly lines: readonly BudgetLine[],
    readonly generatedGbPerDay: number,
    readonly downlinkGbPerDay: number,
    readonly contactMinPerDay: number,
    readonly effectiveRateMbps: number,
  ) {
    super()
  }

  get deliveredFraction(): number {
    return this.generatedGbPerDay === 0 ? 1 : Math.min(1, this.downlinkGbPerDay / this.generatedGbPerDay)
  }

  get used(): number {
    return this.generatedGbPerDay
  }

  get limit(): number {
    return this.downlinkGbPerDay
  }

  get margin(): number {
    return this.generatedGbPerDay === 0 ? Number.POSITIVE_INFINITY : this.downlinkGbPerDay / this.generatedGbPerDay - 1
  }
}

export class DataModel extends SubsystemModel<DataBudget> {
  evaluate(design: ResolvedDesign): DataBudget {
    const lines: BudgetLine[] = design.instruments.map((instrument) => ({
      label: instrument.name,
      amount: instrument.gigabitsPerDay,
      field: DesignField.Instruments,
    }))
    const generated = lines.reduce((sum, line) => sum + line.amount, 0)
    const contactMin = design.orbit.contactMinutesPerDay(design.groundStations)
    const rateMbps = design.orbit.effectiveRateMbps(design.comms.id, design.comms.dataMbps) * design.comms.availability
    const downlink = (rateMbps * contactMin * 60) / 1000
    return new DataBudget(lines, generated, downlink, contactMin, rateMbps)
  }
}
