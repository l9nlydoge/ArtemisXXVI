import { useMemo } from 'react'
import { Logbook } from '../../Engine/Progress/Logbook'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import { Images } from '../../Data/Curated/Images'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { ForecastLines } from '../Shared/ForecastLines'

const Covers: Readonly<Record<string, string>> = {
  JulyNineteen: 'AsteroidB',
  AutumnTwentyTwo: 'DartImpact',
  MayTwentyFour: 'Storm',
}

export function WeekScreen() {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const pickWeek = useGameStore((state) => state.pickWeek)
  const go = useGameStore((state) => state.go)
  const logbook = useMemo(() => new Logbook(profile), [profile])

  return (
    <main className="WeekScreen">
      <header className="ScreenHead">
        <button type="button" className="Quiet" onClick={() => go(Screen.Home)}>‹ {wording.t('Week.Back')}</button>
        <h1>{wording.t('Week.Title')}</h1>
      </header>
      <ul className="WeekRow">
        {WeekCatalog.shared.all.map((week) => {
          const open = week.minRank <= profile.rank
          const image = Images.get(Covers[week.id])
          const entries = logbook.inWeek(week.id)
          return (
            <li key={week.id} className={`WeekCard Panel ${open ? '' : 'IsLocked'}`}>
              {image && <img src={`${import.meta.env.BASE_URL}${image.file}`} alt="" />}
              <div className="WeekBody">
                <p className="WeekDates">{wording.dayRange(week.startUtc, week.endUtc)} {new Date(week.startUtc).getUTCFullYear()}</p>
                <h2>{wording.t(`Week.${week.id}.Name`)}</h2>
                <p className="WeekAbout">{wording.t(`Week.${week.id}.About`)}</p>
                <ForecastLines forecast={week.forecast} />
                {open ? (
                  <>
                    <p className="Muted WeekLogged">{wording.t('Week.Logged', { recorded: entries.filter((entry) => entry.recorded).length, total: entries.length })}</p>
                    <button type="button" className="Primary" onClick={() => pickWeek(week.id)}>{wording.t('Week.Fly')}</button>
                  </>
                ) : (
                  <p className="WeekLock">{wording.t('Week.Locked', { rank: week.minRank })}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
