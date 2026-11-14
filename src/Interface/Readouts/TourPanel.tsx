import { Catalog } from '../../Engine/Catalog/Catalog'
import type { Landmark } from '../../Engine/Catalog/Landmark'
import { Numbers } from '../../Engine/Numbers'
import type { Translator } from '../../I18n/Translator'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

function period(landmark: Landmark, translator: Translator): string {
  const minutes = landmark.spec.periodMin
  if (minutes > 100000) return translator.t('Tour.HalfYear')
  if (minutes > 600) return translator.t('Tour.Hours', { hours: Numbers.round(minutes / 60) })
  return translator.t('Tour.Minutes', { minutes: Numbers.round(minutes) })
}

export function TourPanel() {
  const translator = useTranslator()
  const tourId = useGameStore((state) => state.tourId)
  const visit = useGameStore((state) => state.visit)
  const landmarks = Catalog.shared.landmarks
  const current = tourId && landmarks.has(tourId) ? landmarks.get(tourId) : undefined

  return (
    <section className="TourPanel Panel">
      <h2>{translator.t('Tour.Title')}</h2>
      <div className="TourList" role="group" aria-label={translator.t('Tour.Title')}>
        {landmarks.items.map((landmark) => (
          <button key={landmark.id} type="button" aria-pressed={landmark.id === tourId} onClick={() => visit(landmark.id)}>{landmark.name}</button>
        ))}
        <button type="button" aria-pressed={!current} onClick={() => visit(undefined)}>{translator.t('Tour.Horizon')}</button>
      </div>
      {current && (
        <>
          <p className="TourAbout">{translator.t(`Landmark.${current.id}.About`)}</p>
          <dl>
            <div><dt>{translator.t('Tour.Altitude')}</dt><dd>{translator.t('Tour.AltitudeValue', { km: current.spec.altitudeKm })}</dd></div>
            <div><dt>{translator.t('Tour.Period')}</dt><dd>{period(current, translator)}</dd></div>
            <div><dt>{translator.t('Tour.Tilt')}</dt><dd>{translator.t('Tour.TiltValue', { degrees: current.spec.inclinationDeg })}</dd></div>
            <div><dt>{translator.t('Tour.Size')}</dt><dd>{translator.t('Tour.SizeValue', { metres: current.spec.lengthM })}</dd></div>
            <div><dt>{translator.t('Tour.Launched')}</dt><dd>{current.spec.launchedYear}</dd></div>
          </dl>
          <p className="Hint">{translator.t('Tour.Scale')} <a href={current.source} target="_blank" rel="noreferrer">{translator.t('Tour.Source')}</a></p>
        </>
      )}
    </section>
  )
}
