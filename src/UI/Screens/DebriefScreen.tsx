import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { ReferenceCard } from '../Components/ReferenceCard'
import { StarRow } from '../Components/StarRow'
import { TraceView } from '../Components/TraceView'

export function DebriefScreen() {
  const translator = useTranslator()
  const { result, retry, session } = useGameStore()
  if (!result) return null
  const primary = result.primaryTrace
  const canRetry = !session || session.isHost

  return (
    <main className="DebriefScreen">
      <header className={`VerdictBanner Is${result.verdict}`}>
        <p className="Eyebrow">{translator.t('Debrief.Title')}</p>
        <h1>{translator.t(`Verdict.${result.verdict}`)}</h1>
        <p className="Numeric">
          {translator.t('Debrief.Score', { score: Numbers.round(result.score), perMillion: Numbers.round(result.sciencePerMillion, 2), cost: Numbers.round(result.costMusd) })}
        </p>
        <StarRow rating={result.rating} />
      </header>

      {primary && <TraceView trace={primary} onFix={retry} />}

      {result.warnings.length > 0 && (
        <section className="Warnings">
          <h2>{translator.t('Debrief.Warnings')}</h2>
          {result.warnings.map((trace, index) => <TraceView key={index} trace={trace} onFix={retry} />)}
        </section>
      )}

      <ReferenceCard mission={result.design.scenario.reference} />

      {canRetry && (
        <div className="ButtonRow">
          <button type="button" className="Primary" onClick={() => retry(primary?.rootDecision?.field)}>{translator.t('Debrief.Retry')}</button>
        </div>
      )}
    </main>
  )
}
