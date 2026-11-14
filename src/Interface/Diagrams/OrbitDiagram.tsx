import { useMemo } from 'react'
import type { Orbit } from '../../Engine/Catalog/Orbit'
import { OrbitGeometry } from './OrbitGeometry'

interface OrbitDiagramProps {
  orbit: Orbit
  copies: number
  stations: number
  label: string
  flying?: boolean
  lost?: boolean
}

export function OrbitDiagram({ orbit, copies, stations, label, flying, lost }: OrbitDiagramProps) {
  const geometry = useMemo(() => new OrbitGeometry(orbit), [orbit])

  if (geometry.isSchematic) {
    return (
      <svg className="OrbitDiagram" viewBox="-1.6 -1.2 6 2.4" role="img" aria-label={label}>
        <circle className="EarthDay" cx={0} cy={0} r={0.5} />
        <path className="EarthNight" d="M 0 -0.5 A 0.5 0.5 0 0 1 0 0.5 Z" />
        <line className="Transfer" x1={0.6} y1={0} x2={3.1} y2={0} />
        <ellipse className={`Ring IsSunlit ${lost ? 'IsLost' : ''}`} cx={3.6} cy={0} rx={0.5} ry={0.85} />
        <g className={`Satellites ${flying && !lost ? 'IsHalo' : ''}`}>
          <circle className={`Satellite ${lost ? 'IsLost' : ''}`} cx={3.6} cy={-0.85} r={0.07} />
        </g>
      </svg>
    )
  }

  const view = geometry.viewRadius
  const shadow = geometry.shadowHalfAngle
  const size = view * 0.042
  return (
    <svg className="OrbitDiagram" viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`} role="img" aria-label={label}>
      {[-0.55, 0, 0.55].map((offset) => (
        <line key={offset} className="Sunray" x1={-view * 0.98} y1={offset * view} x2={-view * 0.86} y2={offset * view} />
      ))}
      {shadow > 0 && <rect className="Shadow" x={0} y={-1} width={geometry.ringRadius} height={2} />}
      <circle className="EarthDay" cx={0} cy={0} r={1} />
      <path className="EarthNight" d="M 0 -1 A 1 1 0 0 1 0 1 Z" />
      {geometry.stationAngles(stations).map((angle) => {
        const inner = geometry.point(angle, 1)
        const outer = geometry.point(angle, 1 + Math.max(0.05, view * 0.035))
        return <line key={angle} className="Station" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
      })}
      {shadow > 0 ? (
        <>
          <path className="Ring IsSunlit" d={geometry.arc(shadow, Math.PI * 2 - shadow)} />
          <path className="Ring IsEclipsed" d={geometry.arc(-shadow, shadow)} />
        </>
      ) : (
        <circle className="Ring IsSunlit" cx={0} cy={0} r={geometry.ringRadius} />
      )}
      <g className={`Satellites ${flying && !lost ? 'IsFlying' : ''}`}>
        {geometry.satelliteAngles(copies).map((angle) => {
          const at = geometry.point(angle)
          return <circle key={angle} className={`Satellite ${lost ? 'IsLost' : ''}`} cx={at.x} cy={at.y} r={size} />
        })}
      </g>
    </svg>
  )
}
