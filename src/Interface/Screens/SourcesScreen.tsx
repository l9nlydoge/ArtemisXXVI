import { useMemo } from 'react'
import { ChallengeResources } from '../../Data/Curated/ChallengeResources'
import { Images } from '../../Data/Curated/Images'
import { LearnedSources } from '../../Data/Curated/LearnedSources'
import { GameData } from '../../Data/GameData'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { ExternalLink } from '../Shared/ExternalLink'
import { SourceFigures } from './SourceFigures'

const LibraryPage = 'https://images.nasa.gov/details/'

export function SourcesScreen() {
  const wording = useWording()
  const go = useGameStore((state) => state.go)
  const figures = useMemo(() => new SourceFigures(WeekCatalog.shared.all), [])
  const groups = (['Nasa', 'Partner'] as const).map((group) => ({ group, resources: ChallengeResources.all.filter((resource) => resource.group === group) }))

  return (
    <main className="SourcesScreen">
      <div className="SourcesColumn">
        <header className="ScreenHead">
          <button type="button" className="Quiet" onClick={() => go(Screen.Home)}>‹ {wording.t('SourcesScreen.Back')}</button>
          <h1>{wording.t('SourcesScreen.Title')}</h1>
        </header>

        <section className="Panel SourcesPanel">
          <p className="SourcesLead">{wording.t('SourcesScreen.Intro')}</p>
          <p>{wording.t('SourcesScreen.Counts', figures.params)}</p>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.DataTitle')}</h2>
          <ul className="SourcesList">
            {GameData.sources.map((source) => (
              <li key={source.id} className="SourceEntry">
                <h3>{source.name}</h3>
                <p>{wording.t(`SourcesScreen.Use.${source.id}`)}</p>
                <p className="SourceMeta">
                  {source.retrievedAt && <span>{wording.t('SourcesScreen.Retrieved', { date: wording.date(source.retrievedAt) })}</span>}
                  {source.requests.length > 0 && <span>{wording.t('SourcesScreen.RequestCount', { count: source.requests.length })}</span>}
                </p>
                <p className="SourceLinks">
                  <ExternalLink href={source.homeUrl}>{wording.t('SourcesScreen.HomePage')}</ExternalLink>
                  {source.requests[0] && <ExternalLink href={source.requests[0]}>{wording.t('SourcesScreen.ExampleRequest')}</ExternalLink>}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.ImagesTitle')}</h2>
          <ul className="SourcesList">
            {Images.all.map((image) => (
              <li key={image.id} className="PictureEntry">
                <img src={`${import.meta.env.BASE_URL}${image.file}`} alt="" loading="lazy" width={256} height={144} />
                <div className="PictureText">
                  <h3>{image.title}</h3>
                  <p className="Muted">{wording.t(image.captionKey)}</p>
                  <p className="SourceMeta">
                    <span>{wording.t(`SourcesScreen.Kind.${image.kind}`)}</span>
                    <span>{image.pageUrl.startsWith(LibraryPage) ? wording.t('SourcesScreen.NasaId', { id: image.nasaId }) : wording.t('SourcesScreen.FromArticle')}</span>
                  </p>
                  <p>{wording.t('SourcesScreen.Credit', { credit: image.credit })}</p>
                  <p className="SourceLinks"><ExternalLink href={image.pageUrl}>{wording.t('SourcesScreen.ImagePage')}</ExternalLink></p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.LearnedTitle')}</h2>
          <p>{wording.t('SourcesScreen.LearnedIntro')}</p>
          <ul className="CheckedList">
            {LearnedSources.all.map((source) => {
              const event = figures.event(source.eventId)
              return (
                <li key={source.eventId}>
                  <span className="CheckedName">{event ? wording.text(event.label) : source.eventId}</span>
                  <span className="Muted">{wording.t('SourcesScreen.Checked', { date: wording.date(source.checkedOn) })}</span>
                  <ExternalLink href={source.url}>{wording.t('Result.Source')}</ExternalLink>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.NotesTitle')}</h2>
          <p>{wording.t('Sources.Note.Estimates')}</p>
          <p>{wording.t('Sources.Note.Planets')}</p>
          <p>{wording.t('SourcesScreen.GameNumbers')}</p>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.ChallengeTitle')}</h2>
          <p>{wording.t('SourcesScreen.ChallengeIntro')}</p>
          {groups.map(({ group, resources }) => (
            <div key={group} className="ResourceGroup">
              <h3>{wording.t(`SourcesScreen.Group.${group}`)}</h3>
              <ul>
                {resources.map((resource) => (
                  <li key={resource.url}><ExternalLink href={resource.url}>{resource.title}</ExternalLink></li>
                ))}
              </ul>
            </div>
          ))}
          <p className="SourceLinks">
            <span className="Muted">{wording.t('SourcesScreen.ChallengeRead', { date: wording.date(ChallengeResources.readOn) })}</span>
            <ExternalLink href={ChallengeResources.pageUrl}>{wording.t('SourcesScreen.ChallengePage')}</ExternalLink>
          </p>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.AiTitle')}</h2>
          <p>{wording.t('Credits.Statement')}</p>
        </section>

        <section className="Panel SourcesPanel">
          <h2>{wording.t('SourcesScreen.UseTitle')}</h2>
          <p>{wording.t('Footer.Earth')}</p>
          <p>{wording.t('Footer.Disclaimer')}</p>
        </section>
      </div>
    </main>
  )
}
