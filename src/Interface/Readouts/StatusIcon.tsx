import { BudgetStatus } from '../../Engine/Models/Budget'

export function StatusIcon({ status }: { status: BudgetStatus }) {
  return (
    <svg className={`StatusIcon Is${status}`} viewBox="0 0 12 12" aria-hidden="true">
      {status === BudgetStatus.Green && <circle cx={6} cy={6} r={5} />}
      {status === BudgetStatus.Yellow && <path d="M 6 1 L 11.5 11 L 0.5 11 Z" />}
      {status === BudgetStatus.Red && <path d="M 1 1 L 11 1 L 11 11 L 1 11 Z" />}
    </svg>
  )
}
