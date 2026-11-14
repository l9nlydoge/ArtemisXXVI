import { Catalog } from '../../Engine/Catalog/Catalog'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

export function ScenarioHeader() {
  const translator = useTranslator()
  const scenario = Catalog.shared.scenarios.get(useGameStore((state) => state.scenarioId))
  return (
    <header className="ScenarioHeader">
      <div>
        <p className="Eyebrow">{translator.t('App.Title')}</p>
        <h1>{scenario.name}</h1>
        <p>{scenario.briefing}</p>
      </div>
      <p className="Numeric BudgetChip">{translator.t('Menu.Budget', { budget: scenario.spec.budgetMusd, years: scenario.spec.targetYears })}</p>
    </header>
  )
}
