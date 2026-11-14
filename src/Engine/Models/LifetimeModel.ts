import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { EngineConstants } from '../EngineConstants'
import { Budget, BudgetKind, type BudgetLine } from './Budget'
import type { PowerBudget } from './PowerModel'
import { SubsystemModel } from './SubsystemModel'

export enum LifeLimit {
  DesignLife = 'DesignLife',
  Battery = 'Battery',
  Radiation = 'Radiation',
  BusRating = 'BusRating',
}

export class LifetimeBudget extends Budget {
  readonly kind = BudgetKind.Lifetime
  readonly unit = 'yr'

  constructor(
    readonly lines: readonly BudgetLine[],
    readonly limits: Readonly<Record<LifeLimit, number>>,
    readonly targetYears: number,
  ) {
    super()
  }

  get expectedYears(): number {
    return Math.min(...Object.values(this.limits))
  }

  get limitingFactor(): LifeLimit {
    return (Object.entries(this.limits) as [LifeLimit, number][]).sort((a, b) => a[1] - b[1])[0][0]
  }

  get requiredMargin(): number {
    return 0
  }

  get higherIsBetter(): boolean {
    return true
  }


  get used(): number {
    return this.expectedYears
  }

  get limit(): number {
    return this.targetYears
  }

  get margin(): number {
    return this.expectedYears / this.targetYears - 1
  }
}

export class LifetimeModel extends SubsystemModel<LifetimeBudget, PowerBudget> {
  evaluate(design: ResolvedDesign, power: PowerBudget): LifetimeBudget {
    const limits: Record<LifeLimit, number> = {
      [LifeLimit.DesignLife]: design.designLifeYears,
      [LifeLimit.Battery]: this.batteryLifeYears(power),
      [LifeLimit.Radiation]: design.orbit.radiationLifeYears(design.shielded),
      [LifeLimit.BusRating]: design.bus.maxDesignLifeYears,
    }
    const lines: BudgetLine[] = [
      { label: 'Design life', amount: limits.DesignLife, field: DesignField.DesignLife },
      { label: 'Battery wear', amount: limits.Battery, field: DesignField.Battery },
      { label: 'Radiation', amount: limits.Radiation, field: DesignField.Shielding },
      { label: 'Bus rating', amount: limits.BusRating, field: DesignField.Bus },
    ]
    return new LifetimeBudget(lines, limits, design.scenario.spec.targetYears)
  }

  batteryLifeYears(power: PowerBudget): number {
    if (power.depthOfDischarge === 0) return EngineConstants.batteryMaxLifeYears
    if (power.depthOfDischarge >= 1) return 0
    const life = EngineConstants.batteryReferenceLifeYears * Math.pow(power.safeDepthOfDischarge / power.depthOfDischarge, 2)
    return Math.min(EngineConstants.batteryMaxLifeYears, life)
  }
}
