import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { ComparisonTable } from '../Readouts/ComparisonTable'
import { Criteria } from '../Readouts/Criteria'
import { MissionPatch } from '../Readouts/MissionPatch'
import { RankingChart } from '../Readouts/RankingChart'
import { TraceView } from '../Readouts/TraceView'

export function ReportScreen() {
  const translator = useTranslator()
  const { result, patch, retry, backToMenu, openSources, session } = useGameStore()
  if (!result) return null
  const primary = result.primaryTrace
  const canRetry = !session || session.isHost
  const spec = result.design.scenario.spec

  return (
    <main className="ReportScreen">
      <header className={`Verdict Panel ${result.succeeded ? 'IsSuccess' : 'IsFailure'}`}>
        <div>
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
        </div>
        {patch && result.succeeded && (
          <figure className="PatchAward">
            <MissionPatch record={patch} awarded />
            <figcaption>{translator.t('Debrief.PatchEarned')}</figcaption>
          </figure>
        )}
      </header>

      {primary && (
        <section className="Panel">
          <h2>{translator.t('Debrief.Why')}</h2>
          <TraceView trace={primary} canFix={canRetry} onFix={retry} />
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="Warnings Panel">
          <h2>{translator.t('Debrief.Warnings')}</h2>
          {result.warnings.map((trace, index) => <TraceView key={index} trace={trace} canFix={canRetry} onFix={retry} />)}
        </section>
      )}

      <div className="Panel">
        <RankingChart result={result} />
      </div>

      <div className="Panel">
        <ComparisonTable result={result} />
      </div>

      <footer className="ReportBar">
        <button type="button" className="Quiet" onClick={openSources}>{translator.t('Sources.Open')}</button>
        {canRetry ? (
          <>
            {!session && <button type="button" className="Quiet" onClick={backToMenu}>{translator.t('Debrief.Menu')}</button>}
            <button type="button" className="Primary" onClick={() => retry(primary?.rootDecision?.field)}>{translator.t('Debrief.Retry')}</button>
          </>
        ) : (
          <p>{translator.t('Debrief.WaitingHost')}</p>
        )}
      </footer>
    </main>
  )
}
