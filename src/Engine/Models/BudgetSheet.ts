import type { ResolvedDesign } from '../Design/ResolvedDesign'
import type { Budget } from './Budget'
import { CostModel, type CostBudget } from './CostModel'
import { DataModel, type DataBudget } from './DataModel'
import { LifetimeModel, type LifetimeBudget } from './LifetimeModel'
import { MassModel, type MassBudget } from './MassModel'
import { PowerModel, type PowerBudget } from './PowerModel'

export class BudgetSheet {
  private constructor(
    readonly mass: MassBudget,
    readonly power: PowerBudget,
    readonly data: DataBudget,
    readonly cost: CostBudget,
    readonly lifetime: LifetimeBudget,
  ) {}

  static evaluate(design: ResolvedDesign): BudgetSheet {
    const mass = new MassModel().evaluate(design)
    const power = new PowerModel().evaluate(design)
    const data = new DataModel().evaluate(design)
    const cost = new CostModel().evaluate(design, mass)
    const lifetime = new LifetimeModel().evaluate(design, power)
    return new BudgetSheet(mass, power, data, cost, lifetime)
  }

  get all(): readonly Budget[] {
    return [this.mass, this.power, this.data, this.cost, this.lifetime]
  }

  get flightReady(): boolean {
    return this.mass.isFlightReady && this.power.isFlightReady && this.data.isFlightReady
  }
}
