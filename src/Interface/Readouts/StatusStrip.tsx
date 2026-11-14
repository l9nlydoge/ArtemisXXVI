import type { BudgetSheet } from '../../Engine/Models/BudgetSheet'
import { useTranslator } from '../../I18n/UseTranslator'
import { StatusIcon } from './StatusIcon'

export function StatusStrip({ sheet }: { sheet: BudgetSheet }) {
  const translator = useTranslator()
  return (
    <ul className="StatusStrip">
      {sheet.all.map((budget) => (
        <li key={budget.kind} className={`Is${budget.status}`} title={translator.t(`Status.${budget.status}`)}>
          <StatusIcon status={budget.status} />
          {translator.t(`Budget.${budget.kind}`)}
        </li>
      ))}
    </ul>
  )
}
