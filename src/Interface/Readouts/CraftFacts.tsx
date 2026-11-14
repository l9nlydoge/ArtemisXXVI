import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import type { Mission } from '../../State/UseMission'
import { GraphicsSupport } from '../../World/GraphicsSupport'
import { OrbitDiagram } from '../Diagrams/OrbitDiagram'

export function CraftFacts({ mission }: { mission: Mission }) {
  const translator = useTranslator()
  const { resolved, sheet } = mission
  const { eclipseMin, periodMin } = resolved.orbit.spec
  const mass = sheet.mass.launchMassKg
  const shadow = eclipseMin === 0
    ? translator.t('Fact.NoShadow')
    : periodMin > 600
      ? translator.t('Fact.Shadow', { minutes: eclipseMin })
      : translator.t('Stage.Shadow', { eclipse: eclipseMin, period: Numbers.round(periodMin) })
  return (
    <div className="CraftFacts">
      <OrbitDiagram orbit={resolved.orbit} copies={resolved.copies} stations={resolved.groundStations} label={resolved.orbit.name} />
      <p>
        <strong>{resolved.bus.name}{resolved.copies > 1 ? ` × ${resolved.copies}` : ''}, {translator.t('Stage.Mass', { mass: Numbers.round(mass, mass < 100 ? 1 : 0) })}</strong>
        <span>{resolved.orbit.name}. {shadow}.</span>
        {GraphicsSupport.webgl && <span>{translator.t('Stage.Drag')}</span>}
      </p>
    </div>
  )
}
