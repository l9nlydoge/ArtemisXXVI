import { BudgetKind } from '../Engine/Models/Budget'
import { AllRoles, Role } from '../Engine/Design/Role'

export class RoleView {
  private static readonly ownedBudgets: Record<Role, readonly BudgetKind[]> = {
    [Role.PrincipalInvestigator]: [BudgetKind.Lifetime],
    [Role.SpacecraftEngineer]: [BudgetKind.Mass, BudgetKind.Power],
    [Role.MissionOps]: [BudgetKind.Data],
    [Role.ProgramManager]: [BudgetKind.Cost],
  }

  static detailedBudgets(roles: readonly Role[]): BudgetKind[] {
    return [...new Set(roles.flatMap((role) => RoleView.ownedBudgets[role]))]
  }

  static get solo(): readonly Role[] {
    return AllRoles
  }
}
