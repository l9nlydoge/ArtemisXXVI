import type { DesignField } from '../../Engine/Design/DesignField'
import type { FailureTrace } from '../../Engine/Simulation/TraceLink'
import { useTranslator } from '../../I18n/UseTranslator'

interface TraceViewProps {
  trace: FailureTrace
  onFix(field: DesignField): void
}

export function TraceView({ trace, onFix }: TraceViewProps) {
  const translator = useTranslator()
  return (
    <article className={`TraceView Is${trace.severity}`}>
      <h3>{translator.t(trace.headline.key, trace.headline.params)}</h3>
      <ol className="TraceChain">
        {trace.causes.map((link, index) => (
          <li key={`${link.key}-${index}`} className={link.isDecision ? 'IsDecision' : ''} style={{ animationDelay: `${(index + 1) * 350}ms` }}>
            <span className="TraceArrow" aria-hidden="true">↑</span>
            <span>{translator.t(link.key, link.field ? { ...link.params, field: translator.t(`Field.${link.field}`) } : link.params)}</span>
            {link.field && (
              <button type="button" className="FixButton" onClick={() => onFix(link.field!)}>
                {translator.t('Debrief.Fix')} →
              </button>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
}
