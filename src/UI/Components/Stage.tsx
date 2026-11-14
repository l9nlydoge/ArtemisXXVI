import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import type { Mission } from '../UseMission'
import { OrbitDiagram } from '../Visuals/OrbitDiagram'
import { SpacecraftDrawing } from '../Visuals/SpacecraftDrawing'

export function Stage({ mission }: { mission: Mission }) {
  const translator = useTranslator()
  const { resolved, sheet } = mission
  const { eclipseMin, periodMin } = resolved.orbit.spec
  return (
    <section className="Stage">
      <figure className="StageCraft">
        <SpacecraftDrawing design={resolved} label={translator.t('Stage.Spacecraft')} />
        <figcaption>
          <strong>{resolved.bus.name}{resolved.copies > 1 ? ` × ${resolved.copies}` : ''}</strong>
          <span>{translator.t('Stage.Mass', { mass: Numbers.round(sheet.mass.launchMassKg, sheet.mass.launchMassKg < 100 ? 1 : 0) })}</span>
        </figcaption>
      </figure>
      <figure className="StageOrbit">
        <OrbitDiagram orbit={resolved.orbit} copies={resolved.copies} stations={resolved.groundStations} label={resolved.orbit.name} />
        <figcaption>
          <strong>{resolved.orbit.name}</strong>
          <span>{eclipseMin === 0 ? translator.t('Fact.NoShadow') : periodMin > 600 ? translator.t('Fact.Shadow', { minutes: eclipseMin }) : translator.t('Stage.Shadow', { eclipse: eclipseMin, period: Numbers.round(periodMin) })}</span>
        </figcaption>
      </figure>
    </section>
  )
}
