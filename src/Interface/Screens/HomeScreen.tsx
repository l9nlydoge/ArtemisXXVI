import { useTranslator } from '../../I18n/UseTranslator'

export function HomeScreen() {
  const translator = useTranslator()
  return (
    <main className="HomeScreen">
      <section className="HomeIntro">
        <h1>{translator.t('App.Name')}</h1>
        <p className="Pitch">{translator.t('Home.Pitch')}</p>
        <p className="Muted">{translator.t('Home.Soon')}</p>
      </section>
      <footer className="HomeFooter">
        <span>{translator.t('Footer.Disclaimer')}</span>
        <span>{translator.t('Footer.Earth')}</span>
      </footer>
    </main>
  )
}
