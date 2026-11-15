import { RadiationBand } from '../../Engine/Events/RadiationBand'
import type { Forecast } from '../../Engine/Weeks/Forecast'
import { useWording } from '../../I18n/UseTranslator'

export function ForecastLines({ forecast }: { forecast: Forecast }) {
  const wording = useWording()
  const stormy = forecast.stormLegs > 0
  return (
    <ul className="ForecastLines">
      <li className={stormy && forecast.worstBand === RadiationBand.Severe ? 'IsDanger' : stormy ? 'IsCaution' : ''}>
        {stormy ? wording.t('Forecast.Storms', { count: forecast.stormLegs, band: wording.t(`Band.${forecast.worstBand}`) }) : wording.t('Forecast.NoStorms')}
      </li>
      <li>{wording.t('Forecast.Asteroids', { count: forecast.asteroidCount, radar: forecast.radarTargets })}</li>
      <li>{wording.t('Forecast.Planets', { count: forecast.planetCount })}</li>
      {forecast.unknownsExpected && <li>{wording.t('Forecast.Unknowns')}</li>}
    </ul>
  )
}
