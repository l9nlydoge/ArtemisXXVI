import type { Role } from '../../Engine/Design/Role'
import { BudgetStatus } from '../../Engine/Models/Budget'
import type { BudgetSheet } from '../../Engine/Models/BudgetSheet'
import { useTranslator } from '../../I18n/UseTranslator'
import { RoleView } from '../RoleView'
import { StatusIcon } from './StatusIcon'

interface StationTabsProps {
  roles: readonly Role[]
  active: Role
  sheet: BudgetSheet
  onSelect(role: Role): void
}

const Severity = [BudgetStatus.Green, BudgetStatus.Yellow, BudgetStatus.Red]

export function StationTabs({ roles, active, sheet, onSelect }: StationTabsProps) {
  const translator = useTranslator()
  return (
    <div className="StationTabs" role="tablist">
      {roles.map((role) => {
        const owned = RoleView.detailedBudgets([role])
        const worst = sheet.all.filter((budget) => owned.includes(budget.kind)).reduce((status, budget) => (Severity.indexOf(budget.status) > Severity.indexOf(status) ? budget.status : status), BudgetStatus.Green)
        return (
          <button key={role} type="button" role="tab" aria-selected={role === active} onClick={() => onSelect(role)}>
            <StatusIcon status={worst} />
            {translator.t(`Station.${role}`)}
          </button>
        )
      })}
    </div>
  )
}
