import { useMemo } from 'react'
import { LearnedSources } from '../../Data/Curated/LearnedSources'
import { Logbook, type LogbookEntry } from '../../Engine/Progress/Logbook'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { EventPhoto } from '../Cards/EventPhoto'
import { ExternalLink } from '../Shared/ExternalLink'

const byDate = (a: LogbookEntry, b: LogbookEntry) => (a.event.dateUtc ?? '9999').localeCompare(b.event.dateUtc ?? '9999')

function LogbookCard({ entry }: { entry: LogbookEntry }) {
  const wording = useWording()
  const { event } = entry
  return (
    <li className={`LogbookCard Panel ${entry.complete ? 'IsComplete' : ''}`}>
      <EventPhoto imageId={event.imageId} compact />
      <div className="LogbookBody">
        <h2>{wording.text(event.label)}</h2>
        <p className="Muted">{[event.dateUtc ? wording.date(event.dateUtc) : '', ...entry.weekIds.map((weekId) => wording.t(`Week.${weekId}.Name`))].filter(Boolean).join(' · ')}</p>
        <p className="LogbookState">
          <span className={entry.complete ? 'IsDone' : ''}>{wording.t(entry.complete ? 'Logbook.Complete' : 'Logbook.Partial')}</span>
          <span className="Muted">{wording.t('Logbook.Best', { points: entry.bestPoints })}</span>
        </p>
        <p className="LogbookLearned">
          {wording.text(event.learned)} <ExternalLink href={LearnedSources.linkFor(event)}>{wording.t('Result.Source')}</ExternalLink>
        </p>
      </div>
    </li>
  )
}

export function LogbookScreen() {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const go = useGameStore((state) => state.go)
  const logbook = useMemo(() => new Logbook(profile), [profile])
  const recorded = useMemo(() => logbook.entries.filter((entry) => entry.recorded).sort(byDate), [logbook])
  const totals = logbook.totals

  return (
    <main className="LogbookScreen">
      <header className="ScreenHead">
        <button type="button" className="Quiet" onClick={() => go(Screen.Home)}>‹ {wording.t('Logbook.Back')}</button>
        <h1>{wording.t('Logbook.Title')}</h1>
        <p className="LogbookTotals">
          {wording.t('Logbook.Totals', { recorded: totals.recorded, total: totals.total })}
          {totals.recorded > 0 && <span className="Muted"> · {wording.t('Logbook.Completed', { complete: totals.complete })}</span>}
        </p>
        <button type="button" className="Quiet LogbookSources" onClick={() => go(Screen.Sources)}>{wording.t('Home.Sources')}</button>
      </header>
      {recorded.length === 0 ? (
        <section className="Panel LogbookEmpty">
          <p>{wording.t('Logbook.Empty')}</p>
          <button type="button" className="Primary" onClick={() => go(Screen.Week)}>{wording.t('Logbook.Fly')}</button>
        </section>
      ) : (
        <ul className="LogbookGrid">
          {recorded.map((entry) => <LogbookCard key={entry.event.id} entry={entry} />)}
        </ul>
      )}
    </main>
  )
}
