import { useMemo } from 'react'
import { useTranslator } from '../../I18n/UseTranslator'
import { MissionArchive } from '../../State/MissionArchive'
import { MissionPatch } from './MissionPatch'

export function MissionWall() {
  const translator = useTranslator()
  const records = useMemo(() => MissionArchive.all().slice(0, 8), [])
  return (
    <section className="MissionWall">
      <h2>{translator.t('Wall.Title')}</h2>
      {records.length === 0 ? (
        <p>{translator.t('Wall.Empty')}</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={`${record.number}-${record.seed}`}>
              <MissionPatch record={record} />
              <span>{translator.t('Wall.Result', { score: record.score, cost: record.costMusd })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
