import { Numbers } from '../Core/Numbers'
import { TextRef } from '../Core/TextRef'
import type { Mark } from '../Modules/MarkSpec'
import { Channel } from './Channel'
import { Rarity } from './Rarity'
import type { ExoplanetNote, ExoplanetRecord } from './Records'
import { EventKind, SpaceEvent, type ChannelSpec, type EventTurn } from './SpaceEvent'

interface MethodPlan {
  channel: Channel
  capacity: number
  minMark: Mark
  signals: readonly number[]
}

export class ExoplanetTransit extends SpaceEvent {
  readonly kind = EventKind.Exoplanet
  private static readonly steady = [1, 1, 1, 1, 1]
  private static readonly plans: Readonly<Record<string, MethodPlan>> = {
    Transit: { channel: Channel.Visible, capacity: 14, minMark: 1, signals: ExoplanetTransit.steady },
    'Radial Velocity': { channel: Channel.Spectrum, capacity: 14, minMark: 1, signals: ExoplanetTransit.steady },
    Imaging: { channel: Channel.Visible, capacity: 20, minMark: 2, signals: ExoplanetTransit.steady },
    Microlensing: { channel: Channel.Visible, capacity: 10, minMark: 1, signals: [0.5, 3, 0.5] },
  }
  private static readonly faintStarVmag = 12
  private static readonly faintFactor = 1.25
  private static readonly atmosphereCapacity = 10

  private constructor(readonly record: ExoplanetRecord, note: ExoplanetNote) {
    const known = record.method in ExoplanetTransit.plans
    const plan = known ? ExoplanetTransit.plans[record.method] : ExoplanetTransit.plans.Transit
    const methodKey = known ? record.method.replace(/\s+/g, '') : 'Transit'
    const faint = record.starVmag !== null && record.starVmag > ExoplanetTransit.faintStarVmag
    const scale = (capacity: number) => (faint ? Numbers.roundHalfUp(capacity * ExoplanetTransit.faintFactor) : capacity)
    const channels = new Map<Channel, ChannelSpec>([[plan.channel, { capacity: scale(plan.capacity), minMark: plan.minMark }]])
    if (note.atmosphere) {
      const existing = channels.get(Channel.Spectrum)
      channels.set(Channel.Spectrum, { capacity: (existing?.capacity ?? 0) + scale(ExoplanetTransit.atmosphereCapacity), minMark: existing?.minMark ?? 1 })
    }
    const facts = [new TextRef('Fact.Method', { method: record.method }), new TextRef('Fact.Discovered', { year: String(record.year), facility: record.facility })]
    if (record.distanceParsec !== null) facts.push(new TextRef('Fact.Distance', { lightYears: Math.round(record.distanceParsec * 3.26156) }))
    if (record.radiusEarth !== null) facts.push(new TextRef('Fact.Radius', { radius: Number(record.radiusEarth.toFixed(2)) }))
    super({
      id: ExoplanetTransit.idFor(record.name),
      label: TextRef.literal(record.name),
      rarity: note.famous ? Rarity.Notable : Rarity.Common,
      channels,
      turns: plan.signals.map((signal): EventTurn => ({ signal, radiation: 0 })),
      facts,
      learned: new TextRef(note.famous ? `Learned.${ExoplanetTransit.idFor(record.name)}` : `Learned.Method.${methodKey}`, { name: record.name }),
      sourceUrl: record.url,
      imageId: `Exoplanet${plan.channel}`,
    })
  }

  static fromRecord(record: ExoplanetRecord, note: ExoplanetNote = { famous: false, atmosphere: false }): ExoplanetTransit {
    return new ExoplanetTransit(record, note)
  }

  static idFor(name: string): string {
    return `Exoplanet.${name.replace(/[^A-Za-z0-9]+/g, '')}`
  }
}
