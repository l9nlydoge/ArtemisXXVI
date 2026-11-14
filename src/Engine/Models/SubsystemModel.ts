import type { ResolvedDesign } from '../Design/ResolvedDesign'
import type { Budget } from './Budget'

export abstract class SubsystemModel<TBudget extends Budget, TDependencies = void> {
  abstract evaluate(design: ResolvedDesign, dependencies: TDependencies): TBudget
}
