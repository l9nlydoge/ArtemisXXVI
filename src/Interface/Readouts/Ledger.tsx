import type { BudgetKind } from '../../Engine/Models/Budget'
import type { BudgetSheet } from '../../Engine/Models/BudgetSheet'
import { LedgerRow } from './LedgerRow'

interface LedgerProps {
  sheet: BudgetSheet
  detailed: readonly BudgetKind[]
}

export function Ledger({ sheet, detailed }: LedgerProps) {
  return (
    <div className="Ledger">
      {sheet.all.map((budget) => <LedgerRow key={budget.kind} budget={budget} detailed={detailed.includes(budget.kind)} />)}
    </div>
  )
}
