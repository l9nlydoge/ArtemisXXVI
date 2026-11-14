import type { Budget } from '../../Engine/Models/Budget'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { StatusIcon } from './StatusIcon'

interface BudgetBarProps {
  budget: Budget
  detailed: boolean
}

export function BudgetBar({ budget, detailed }: BudgetBarProps) {
  const translator = useTranslator()
  const fill = Math.min(100, (budget.fill / 1.5) * 100)
  const limit = (1 / 1.5) * 100
  const margin = Number.isFinite(budget.margin) ? Numbers.percent(budget.margin) : 999
  return (
    <section className={`BudgetBar Is${budget.status}`} aria-label={translator.t(`Budget.${budget.kind}`)}>
      <header>
        <span className="BudgetName">{translator.t(`Budget.${budget.kind}`)}</span>
        <span className="BudgetStatus">
          <StatusIcon status={budget.status} /> {translator.t(`Status.${budget.status}`)}
        </span>
      </header>
      <div className="Meter" role="meter" aria-valuenow={Math.round(budget.fill * 100)} aria-valuemin={0} aria-valuemax={150}>
        <div className="MeterFill" style={{ width: `${fill}%` }} />
        <div className="MeterLimit" style={{ left: `${limit}%` }} />
      </div>
      {detailed && (
        <>
          <p className="BudgetMargin">{translator.t('Budget.Margin', { margin })}</p>
          <ul className="BudgetLines">
            {[...budget.lines].sort((a, b) => b.amount - a.amount).slice(0, 4).map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <span className="Numeric">{translator.number(Numbers.round(line.amount, line.amount < 10 ? 1 : 0))} {budget.unit}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
