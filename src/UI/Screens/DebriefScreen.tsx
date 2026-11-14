import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { ComparisonTable } from '../Components/ComparisonTable'
import { Criteria } from '../Components/Criteria'
import { TraceView } from '../Components/TraceView'

export function DebriefScreen() {
  const translator = useTranslator()
  const { result, retry, backToMenu, session } = useGameStore()
  if (!result) return null
  const primary = result.primaryTrace
  const canRetry = !session || session.isHost
  const spec = result.design.scenario.spec

  return (
    <main className="DebriefScreen">
      <header className={`Verdict ${result.succeeded ? 'IsSuccess' : 'IsFailure'}`}>
        <h1>{translator.t(`Verdict.${result.verdict}`)}</h1>
        <Criteria rating={result.rating} />
        <dl className="Outcome">
          <div>
            <dt>{translator.t('Outcome.Science')}</dt>
            <dd>{translator.t('Outcome.ScienceValue', { score: Numbers.round(result.score), required: spec.requiredScience })}</dd>
          </div>
          <div>
            <dt>{translator.t('Outcome.Cost')}</dt>
            <dd>{translator.t('Outcome.CostValue', { cost: Numbers.round(result.costMusd), budget: spec.budgetMusd })}</dd>
          </div>
          <div>
            <dt>{translator.t('Outcome.Life')}</dt>
            <dd>{translator.t('Outcome.LifeValue', { life: Numbers.round(result.lifeYears, 1), target: spec.targetYears })}</dd>
          </div>
        </dl>
      </header>

      {primary && (
        <section className="Why">
          <h2>{translator.t('Debrief.Why')}</h2>
          <TraceView trace={primary} canFix={canRetry} onFix={retry} />
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="Warnings">
          <h2>{translator.t('Debrief.Warnings')}</h2>
          {result.warnings.map((trace, index) => <TraceView key={index} trace={trace} canFix={canRetry} onFix={retry} />)}
        </section>
      )}

      <ComparisonTable result={result} />

      <footer className="ActionBar">
        {canRetry ? (
          <div className="Actions">
            {!session && <button type="button" className="Quiet" onClick={backToMenu}>{translator.t('Debrief.Menu')}</button>}
            <button type="button" className="Primary" onClick={() => retry(primary?.rootDecision?.field)}>{translator.t('Debrief.Retry')}</button>
          </div>
        ) : (
          <p>{translator.t('Debrief.WaitingHost')}</p>
        )}
      </footer>
    </main>
  )
}
