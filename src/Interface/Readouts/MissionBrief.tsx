import type { Scenario } from '../../Engine/Catalog/Scenario'
import { useTranslator } from '../../I18n/UseTranslator'

export function MissionBrief({ scenario }: { scenario: Scenario }) {
  const translator = useTranslator()
  return (
    <header className="MissionBrief">
      <div>
        <h1>{scenario.name}</h1>
        <p>{translator.t(`Scenario.${scenario.id}.Briefing`)}</p>
      </div>
      <dl>
        <div><dt>{translator.t('Brief.Budget')}</dt><dd>${translator.number(scenario.spec.budgetMusd)}M</dd></div>
        <div><dt>{translator.t('Brief.Duration')}</dt><dd>{translator.t('Brief.Years', { years: scenario.spec.targetYears })}</dd></div>
        <div><dt>{translator.t('Brief.Science')}</dt><dd>{translator.number(scenario.spec.requiredScience)}</dd></div>
      </dl>
    </header>
  )
}
