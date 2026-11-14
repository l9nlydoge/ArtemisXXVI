import type { BudgetKind } from '../../Engine/Models/Budget'
import type { BudgetSheet } from '../../Engine/Models/BudgetSheet'
import { BudgetBar } from './BudgetBar'

interface BudgetBoardProps {
  sheet: BudgetSheet
  detailed: readonly BudgetKind[]
}

export function BudgetBoard({ sheet, detailed }: BudgetBoardProps) {
  return (
    <div className="BudgetBoard">
      {sheet.all.map((budget) => (
        <BudgetBar key={budget.kind} budget={budget} detailed={detailed.includes(budget.kind)} />
      ))}
    </div>
  )
}
