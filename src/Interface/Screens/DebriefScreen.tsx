import { useMemo } from 'react'
import { FlightOutcome } from '../../Engine/Flight/FlightReport'
import { ModuleCatalog } from '../../Engine/Modules/ModuleCatalog'
import { Rank, UnlockKind, type RankUnlock } from '../../Engine/Progress/Rank'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import { useWording, type Wording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { RankBadge } from '../Shared/RankBadge'

function unlockText(unlock: RankUnlock, wording: Wording): string {
  switch (unlock.kind) {
    case UnlockKind.Bus:
      return wording.t('Unlock.Bus', { name: wording.t(`Bus.${unlock.id}`) })
    case UnlockKind.Week:
      return wording.t('Unlock.Week', { name: wording.t(`Week.${unlock.id}.Name`) })
    case UnlockKind.Module:
      return wording.t('Unlock.Module', { name: wording.t(`Module.${unlock.id}.Name`) })
    case UnlockKind.Mark:
      return wording.t('Unlock.Mark', { mark: wording.t(`Mark.${unlock.id}`) })
    default:
      return wording.t('Unlock.Teaser')
  }
}

export function DebriefScreen() {
  const wording = useWording()
  const summary = useGameStore((state) => state.summary)
  const profile = useGameStore((state) => state.profile)
  const go = useGameStore((state) => state.go)
  const pickWeek = useGameStore((state) => state.pickWeek)
  const rankUps = useMemo(() => {
    if (!summary) return []
    const ranks: number[] = []
    for (let rank = summary.rankBefore + 1; rank <= profile.rank; rank++) ranks.push(rank)
    return ranks
  }, [summary, profile.rank])
  if (!summary) return null
  const { report } = summary
  const week = WeekCatalog.shared.get(summary.weekId)
  const lost = report.outcome === FlightOutcome.Lost

  return (
    <main className="DebriefScreen">
      <section className={`Panel DebriefVerdict ${lost ? 'IsLost' : ''}`}>
        <h1>{lost ? wording.t('Debrief.Lost', { leg: (report.loss?.legIndex ?? 0) + 1 }) : wording.t('Debrief.Complete')}</h1>
        <p className="BankedPoints">{wording.t('Debrief.Banked', { points: report.pointsBanked })}</p>
        {lost && <p>{wording.t('Debrief.LostHalf', { earned: report.pointsEarned })}</p>}
        {lost && report.loss && (
          <p className="LossWhy">{wording.t(report.loss.hadActiveShield ? 'Debrief.LossShield' : 'Debrief.LossBare', { radiation: report.loss.radiation, shielding: report.loss.shielding })}</p>
        )}
      </section>

      <section className="Panel DebriefMissed">
        <h2>{wording.t('Debrief.Missed')}</h2>
        {report.misses.length === 0 ? (
          <p>{wording.t('Debrief.NothingMissed')}</p>
        ) : (
          <ul className="MissList">
            {report.misses.map((miss, index) => (
              <li key={miss.moduleId} className={index === 0 ? 'IsBiggest' : ''}>
                <span>{wording.t('Debrief.MissedLine', { count: miss.count, module: ModuleCatalog.shared.has(miss.moduleId) ? wording.t(`Module.${miss.moduleId}.Name`) : miss.moduleId, points: miss.points })}</span>
                {index === 0 && <button type="button" onClick={() => go(Screen.Lab)}>{wording.t('Debrief.SeeLab')}</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="Panel DebriefRank">
        <RankBadge from={summary.lifetimeBefore} />
        {rankUps.map((rank) => (
          <div key={rank} className="RankUp">
            <p className="RankUpTitle">{wording.t('Debrief.RankUp', { rank, title: wording.t(`Rank.${rank}`) })}</p>
            <p className="Muted">{wording.t('Debrief.Unlocked')} {Rank.unlocksAt(rank).map((unlock) => unlockText(unlock, wording)).join(', ')}</p>
          </div>
        ))}
      </section>

      <section className="Panel DebriefLog">
        <h2>{wording.t('Debrief.Log')}</h2>
        <ol className="LegLog">
          {week.legs.map((leg, legIndex) => {
            const met = report.encounters.filter((encounter) => encounter.legIndex === legIndex)
            const flown = legIndex < report.legsFlown
            const lostHere = lost && report.loss?.legIndex === legIndex
            const tone = lostHere ? 'IsLostHere' : !flown ? 'IsNotFlown' : met.some((encounter) => encounter.complete) ? 'IsComplete' : met.some((encounter) => encounter.anyRecorded) ? 'IsPartial' : ''
            return (
              <li key={legIndex} className={`LegEntry ${tone}`}>
                <p className="LegDate">{wording.dayRange(leg.window.startUtc, leg.window.endUtc)}</p>
                {met.map((encounter, at) => {
                  const event = week.event(encounter.eventId)
                  const full = event ? [...event.channels].filter(([channel, spec]) => (encounter.recorded.get(channel) ?? 0) >= spec.capacity).length : 0
                  return (
                    <div key={at} className="LegEvent">
                      <p className="LegName">{event ? wording.text(event.label) : encounter.eventId}</p>
                      <p className="LegState">
                        {encounter.complete
                          ? wording.t('Result.Complete')
                          : encounter.anyRecorded && event
                            ? wording.t('Debrief.Channels', { full, total: event.channels.size })
                            : wording.t('Result.Nothing')}
                      </p>
                      <p className="LegPoints">{wording.t('Result.Points', { points: encounter.points })}</p>
                    </div>
                  )
                })}
                {met.length === 0 && <p className="LegName IsQuiet">{flown ? wording.t('Debrief.Held') : wording.t('Debrief.NotFlown')}</p>}
                {lostHere && <p className="LegLost">{wording.t('Debrief.LostHere')}</p>}
              </li>
            )
          })}
        </ol>
        <footer className="DebriefActions">
          <button type="button" className="Quiet" onClick={() => go(Screen.Home)}>{wording.t('Debrief.Home')}</button>
          <button type="button" onClick={() => pickWeek(summary.weekId)}>{wording.t('Debrief.Again')}</button>
          <button type="button" className="Primary IsLarge" onClick={() => go(Screen.Lab)}>{wording.t('Debrief.GoLab')}</button>
        </footer>
      </section>
    </main>
  )
}
