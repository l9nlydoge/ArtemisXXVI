import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { EngineConstants } from '../EngineConstants'
import { Budget, BudgetKind, type BudgetLine } from './Budget'
import type { MassBudget } from './MassModel'
import { SubsystemModel } from './SubsystemModel'

export class CostBudget extends Budget {
  readonly kind = BudgetKind.Cost
  readonly unit = '$M'

  constructor(
    readonly lines: readonly BudgetLine[],
    readonly totalMusd: number,
    readonly budgetMusd: number,
  ) {
    super()
  }

  get requiredMargin(): number {
    return EngineConstants.reserveForStar
  }

  get fill(): number {
    return Math.min(1.5, this.totalMusd / this.budgetMusd)
  }

  get margin(): number {
    return (this.budgetMusd - this.totalMusd) / this.budgetMusd
  }

  get overBudget(): boolean {
    return this.totalMusd > this.budgetMusd
  }
}

export class CostModel extends SubsystemModel<CostBudget, MassBudget> {
  evaluate(design: ResolvedDesign, mass: MassBudget): CostBudget {
    const fleetFactor = EngineConstants.programOverhead * (1 + EngineConstants.learningCurve * (design.copies - 1))
    const lifePremium = 1 + EngineConstants.busLifeCostPerYear * (design.designLifeYears - EngineConstants.busLifeBaselineYears)
    const craftLines: BudgetLine[] = [
      { label: design.bus.name, amount: design.bus.costMusd * lifePremium, field: DesignField.Bus },
      ...design.instruments.map((instrument) => ({ label: instrument.name, amount: instrument.costMusd, field: DesignField.Instruments })),
      { label: design.comms.name, amount: design.comms.costMusd, field: DesignField.Comms },
      { label: design.arrayType.name, amount: design.arrayType.costMusd(design.arrayAreaM2), field: DesignField.ArrayArea },
      { label: 'Battery', amount: design.batteryWh * EngineConstants.batteryCostMusdPerWh, field: DesignField.Battery },
    ]
    if (design.shielded) craftLines.push({ label: 'Radiation shielding', amount: EngineConstants.shieldingCostMusd, field: DesignField.Shielding })

    const launches = Number.isFinite(mass.launches) ? mass.launches : design.copies
    const lines: BudgetLine[] = [
      ...craftLines.map((line) => ({ ...line, amount: line.amount * fleetFactor })),
      { label: design.vehicle.name, amount: design.vehicle.pricing.costMusd(mass.launchMassKg, design.copies, launches), field: DesignField.LaunchVehicle },
      { label: 'Ground stations', amount: design.groundStations * EngineConstants.stationCostMusdPerYear * design.designLifeYears, field: DesignField.GroundStations },
    ]
    const total = lines.reduce((sum, line) => sum + line.amount, 0)
    return new CostBudget(lines, total, design.scenario.spec.budgetMusd)
  }
}
