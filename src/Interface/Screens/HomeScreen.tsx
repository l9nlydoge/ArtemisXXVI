import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { RankBadge } from '../Shared/RankBadge'

export function HomeScreen() {
  const wording = useWording()
  const go = useGameStore((state) => state.go)
  const flight = useGameStore((state) => state.flight)

  return (
    <main className="HomeScreen">
      <section className="HomeIntro">
        <h1>{wording.t('App.Name')}</h1>
        <p className="Pitch">{wording.t('Home.Pitch')}</p>
        <div className="HomeActions">
          <button type="button" className="Primary IsLarge" onClick={() => go(flight ? Screen.Flight : Screen.Week)}>
            {wording.t(flight ? 'Home.Resume' : 'Home.Fly')}
          </button>
          <button type="button" className="Quiet" onClick={() => go(Screen.Lab)}>{wording.t('Home.Lab')}</button>
        </div>
      </section>
      <div className="HomeFoot">
        <RankBadge />
        <footer className="Credits">
          <span>{wording.t('Footer.Disclaimer')}</span>
          <span>{wording.t('Footer.Earth')}</span>
        </footer>
      </div>
    </main>
  )
}
