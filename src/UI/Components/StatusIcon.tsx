import { BudgetStatus } from '../../Engine/Models/Budget'

const Glyphs: Record<BudgetStatus, string> = {
  [BudgetStatus.Green]: '●',
  [BudgetStatus.Yellow]: '▲',
  [BudgetStatus.Red]: '✕',
}

export function StatusIcon({ status }: { status: BudgetStatus }) {
  return <span className={`StatusIcon Is${status}`} aria-hidden="true">{Glyphs[status]}</span>
}
