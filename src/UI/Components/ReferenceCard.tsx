import type { ReferenceMission } from '../../Engine/Catalog/ReferenceMission'
import { useTranslator } from '../../I18n/UseTranslator'

export function ReferenceCard({ mission }: { mission: ReferenceMission }) {
  const translator = useTranslator()
  return (
    <aside className="ReferenceCard">
      <h3>{translator.t('Debrief.HowNasaDidIt', { name: mission.name })}</h3>
      <dl>
        {mission.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.source ? <a href={fact.source} target="_blank" rel="noreferrer">{fact.value}</a> : fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="Lesson">{mission.lesson}</p>
    </aside>
  )
}
