import { useId } from 'react'
import { useTranslator } from '../../I18n/UseTranslator'
import type { MissionRecord } from '../../State/MissionArchive'

const OrbitShapes: Record<string, { rx: number; ry: number; tilt: number }> = {
  Leo450: { rx: 60, ry: 17, tilt: -24 },
  Sso705: { rx: 62, ry: 15, tilt: -74 },
  Geo: { rx: 72, ry: 9, tilt: 0 },
  L2: { rx: 70, ry: 30, tilt: 12 },
}

const StarPath = 'M0 -7 L2 -2.2 L7 -2 L3.2 1.2 L4.4 6.2 L0 3.4 L-4.4 6.2 L-3.2 1.2 L-7 -2 L-2 -2.2 Z'

interface MissionPatchProps {
  record: MissionRecord
  awarded?: boolean
}

export function MissionPatch({ record, awarded }: MissionPatchProps) {
  const translator = useTranslator()
  const id = useId()
  const shape = OrbitShapes[record.orbitId] ?? OrbitShapes.Leo450
  const craft = Math.min(record.copies, 8)
  const label = `${record.scenarioName}, ${translator.t('Patch.Mission', { number: record.number })}, ${translator.t('Debrief.Stars', { stars: record.stars })}`
  return (
    <svg className={`MissionPatch ${awarded ? 'IsAwarded' : ''} ${record.stars === 3 ? 'IsGold' : ''}`} viewBox="0 0 200 200" role="img" aria-label={label}>
      <defs>
        <path id={`${id}-top`} d="M 24 100 A 76 76 0 0 1 176 100" />
        <path id={`${id}-bottom`} d="M 14 100 A 86 86 0 0 0 186 100" />
        <clipPath id={`${id}-disc`}><circle cx={100} cy={100} r={62} /></clipPath>
      </defs>
      <circle className="PatchField" cx={100} cy={100} r={96} />
      <circle className="PatchBorder" cx={100} cy={100} r={93} />
      <circle className="PatchSky" cx={100} cy={100} r={62} />
      <g clipPath={`url(#${id}-disc)`}>
        <circle className="PatchEarth" cx={100} cy={112} r={34} />
        <path className="PatchNight" d="M 100 78 A 34 34 0 0 1 100 146 Z" />
      </g>
      <g transform={`rotate(${shape.tilt} 100 112)`}>
        <ellipse className="PatchOrbit" cx={100} cy={112} rx={shape.rx * 0.82} ry={shape.ry} />
        {Array.from({ length: craft }, (_, index) => {
          const angle = Math.PI * 1.1 + (index / craft) * Math.PI * 2
          return <circle key={index} className="PatchCraft" cx={100 + Math.cos(angle) * shape.rx * 0.82} cy={112 + Math.sin(angle) * shape.ry} r={3.4} />
        })}
      </g>
      {Array.from({ length: 3 }, (_, index) => (
        <path key={index} className={`PatchStar ${index < record.stars ? 'IsEarned' : ''}`} d={StarPath} transform={`translate(${82 + index * 18} ${index === 1 ? 54 : 58})`} />
      ))}
      <text className="PatchName"><textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">{record.scenarioName}</textPath></text>
      <text className="PatchNumber"><textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">{translator.t('Patch.Mission', { number: record.number })}</textPath></text>
    </svg>
  )
}
