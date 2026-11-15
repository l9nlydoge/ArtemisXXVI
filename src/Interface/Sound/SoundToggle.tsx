import { useEffect, useState } from 'react'
import { useWording } from '../../I18n/UseTranslator'
import { Sound } from './Sound'
import '../../Styles/Sound.css'

type Pixel = readonly [number, number]

const Body: readonly Pixel[] = [[0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2]]
const Shade: readonly Pixel[] = [[0, 5], [1, 5], [2, 5], [3, 5], [3, 6], [4, 4], [4, 5], [4, 6], [4, 7], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8]]
const Waves: readonly Pixel[] = [[7, 3], [7, 4], [7, 5], [8, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [8, 7]]
const Cross: readonly Pixel[] = [[7, 2], [10, 2], [8, 3], [9, 3], [8, 5], [9, 5], [7, 6], [10, 6], [8, 4], [9, 4]]

function Pixels({ cells, colour }: { cells: readonly Pixel[]; colour: string }) {
  return (
    <>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colour} />
      ))}
    </>
  )
}

export function SoundToggle() {
  const wording = useWording()
  const [enabled, setEnabled] = useState(Sound.enabled)
  useEffect(() => Sound.onEnabledChange(setEnabled), [])
  const action = wording.t(enabled ? 'Sound.TurnOff' : 'Sound.TurnOn')
  return (
    <button type="button" className={`SoundToggle Quiet ${enabled ? 'IsOn' : 'IsOff'}`} aria-label={wording.t('Sound.Label')} aria-pressed={enabled} aria-keyshortcuts="M" title={action} onClick={() => Sound.toggle()}>
      <svg className="SoundIcon" viewBox="0 0 11 9" width={33} height={27} shapeRendering="crispEdges" aria-hidden="true">
        <Pixels cells={Body} colour="var(--Hull4)" />
        <Pixels cells={Shade} colour="var(--Hull3)" />
        {enabled ? <Pixels cells={Waves} colour="var(--Foil2)" /> : <Pixels cells={Cross} colour="var(--Hull3)" />}
      </svg>
      <span className="SoundTip" aria-hidden="true">{action}</span>
    </button>
  )
}
