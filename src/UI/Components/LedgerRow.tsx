import type { Budget } from '../../Engine/Models/Budget'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { StatusIcon } from './StatusIcon'

interface LedgerRowProps {
  budget: Budget
  detailed: boolean
}

const TrackSpan = 1.25

export function LedgerRow({ budget, detailed }: LedgerRowProps) {
  const translator = useTranslator()
  const name = translator.t(`Budget.${budget.kind}`)
  const fill = Math.min(100, (budget.fill / TrackSpan) * 100)
  const limitAt = 100 / TrackSpan
  const reserveFrom = budget.higherIsBetter ? limitAt : limitAt / (1 + budget.requiredMargin)
  const total = budget.lines.reduce((sum, line) => sum + line.amount, 0)
  const segments = budget.higherIsBetter || total === 0 ? [] : [...budget.lines].sort((a, b) => b.amount - a.amount)
  const digits = (value: number) => Numbers.round(value, value < 10 ? 1 : 0)
  const limit = Number.isFinite(budget.limit) ? digits(budget.limit) : 0

  return (
    <div className={`LedgerRow Is${budget.status} ${detailed ? 'IsDetailed' : ''}`}>
      <span className="LedgerName">{name}</span>
      {detailed && (
        <>
          <div className="Gauge" role="meter" aria-label={name} aria-valuenow={Math.round(budget.fill * 100)} aria-valuemin={0} aria-valuemax={125}>
            {!budget.higherIsBetter && <div className="GaugeReserve" style={{ left: `${reserveFrom}%`, width: `${limitAt - reserveFrom}%` }} />}
            <div className="GaugeFill" style={{ width: `${fill}%` }}>
              {segments.map((line) => <span key={line.label} style={{ flexGrow: line.amount }} title={line.label} />)}
            </div>
            <div className="GaugeLimit" style={{ left: `${limitAt}%` }} />
          </div>
          <span className="LedgerAmount">{translator.t('Ledger.Amount', { used: digits(budget.used), limit, unit: budget.unit })}</span>
        </>
      )}
      <span className="LedgerStatus"><StatusIcon status={budget.status} />{translator.t(`Status.${budget.status}`)}</span>
      {detailed && segments.length > 0 && (
        <span className="LedgerDrivers">
          {segments.slice(0, 3).map((line) => `${line.label} ${translator.number(digits(line.amount))}`).join(', ')}
        </span>
      )}
    </div>
  )
}
