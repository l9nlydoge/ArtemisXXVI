import type { Channel } from '../../Engine/Events/Channel'
import type { SpaceEvent } from '../../Engine/Events/SpaceEvent'
import { ModuleCatalog } from '../../Engine/Modules/ModuleCatalog'
import type { Spacecraft } from '../../Engine/Spacecraft/Spacecraft'
import { useWording } from '../../I18n/UseTranslator'

interface ChannelBarsProps {
  event: SpaceEvent
  craft: Spacecraft
  recorded?: ReadonlyMap<Channel, number>
  pending?: ReadonlyMap<Channel, number>
}

export function ChannelBars({ event, craft, recorded, pending }: ChannelBarsProps) {
  const wording = useWording()
  return (
    <ul className="ChannelBars">
      {[...event.channels].map(([channel, spec]) => {
        const able = craft.canRecord(channel, spec.minMark)
        const have = recorded?.get(channel) ?? 0
        const coming = pending?.get(channel) ?? 0
        const instrument = ModuleCatalog.shared.instrumentFor(channel)
        const fitted = craft.instrumentFor(channel)
        const need = !instrument
          ? ''
          : fitted
            ? wording.t('Contact.NeedsMark', { module: wording.t(`Module.${instrument.id}.Name`), mark: wording.t(`Mark.${spec.minMark}`) })
            : wording.t('Contact.Missing', { module: wording.t(`Module.${instrument.id}.Name`) })
        return (
          <li key={channel} className={`ChannelBar ${able ? '' : 'IsClosed'} ${have >= spec.capacity ? 'IsFull' : ''}`}>
            <span className="ChannelName">{wording.t(`Channel.${channel}`)}</span>
            <span className="ChannelAmount">{able ? (recorded ? `${have} / ${spec.capacity}` : spec.capacity) : need}</span>
            <div className="ChannelTrack">
              <div className="ChannelPending" style={{ width: `${Math.min(100, ((have + coming) / spec.capacity) * 100)}%` }} />
              <div className="ChannelFill" style={{ width: `${Math.min(100, (have / spec.capacity) * 100)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
