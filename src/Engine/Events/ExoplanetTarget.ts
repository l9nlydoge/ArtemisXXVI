import { Numbers } from '../Core/Numbers'
import { TextRef } from '../Core/TextRef'
import type { Mark } from '../Modules/MarkSpec'
import { Channel } from './Channel'
import { Rarity } from './Rarity'
import type { ExoplanetNote, ExoplanetRecord } from './Records'
import { EventKind, SpaceEvent, type ChannelSpec, type EventTurn } from './SpaceEvent'

export enum ObservingMode {
  Transit = 'Transit',
  RadialVelocity = 'RadialVelocity',
  Imaging = 'Imaging',
}

interface ModePlan {
  channel: Channel
  capacity: number
  minMark: Mark
}

export class ExoplanetTarget extends SpaceEvent {
  readonly kind = EventKind.Exoplanet
  private static readonly turnCount = 5
  private static readonly plans: Readonly<Record<ObservingMode, ModePlan>> = {
    [ObservingMode.Transit]: { channel: Channel.Visible, capacity: 14, minMark: 1 },
    [ObservingMode.RadialVelocity]: { channel: Channel.Spectrum, capacity: 14, minMark: 1 },
    [ObservingMode.Imaging]: { channel: Channel.Visible, capacity: 20, minMark: 2 },
  }
  private static readonly modeByMethod: Readonly<Record<string, ObservingMode>> = {
    Transit: ObservingMode.Transit,
    'Radial Velocity': ObservingMode.RadialVelocity,
    Imaging: ObservingMode.Imaging,
  }
  private static readonly faintStarVmag = 12
  private static readonly faintFactor = 1.25
  private static readonly atmosphereCapacity = 10

  private constructor(readonly record: ExoplanetRecord, readonly mode: ObservingMode, note: ExoplanetNote) {
    const plan = ExoplanetTarget.plans[mode]
    const faint = record.starVmag !== null && record.starVmag > ExoplanetTarget.faintStarVmag
    const scale = (capacity: number) => (faint ? Numbers.roundHalfUp(capacity * ExoplanetTarget.faintFactor) : capacity)
    const channels = new Map<Channel, ChannelSpec>([[plan.channel, { capacity: scale(plan.capacity), minMark: plan.minMark }]])
    if (note.atmosphere) {
      const existing = channels.get(Channel.Spectrum)
      channels.set(Channel.Spectrum, { capacity: (existing?.capacity ?? 0) + scale(ExoplanetTarget.atmosphereCapacity), minMark: existing?.minMark ?? 1 })
    }
    const facts = [new TextRef('Fact.Method', { method: record.method }), new TextRef('Fact.Discovered', { year: String(record.year), facility: record.facility })]
    if (record.distanceParsec !== null) facts.push(new TextRef('Fact.Distance', { lightYears: Math.round(record.distanceParsec * 3.26156) }))
    if (record.radiusEarth !== null) facts.push(new TextRef(record.radiusEstimated ? 'Fact.RadiusEstimated' : 'Fact.Radius', { radius: Number(record.radiusEarth.toFixed(2)) }))
    super({
      id: ExoplanetTarget.idFor(record.name),
      label: TextRef.literal(record.name),
      rarity: note.famous ? Rarity.Notable : Rarity.Common,
      channels,
      turns: Array.from({ length: ExoplanetTarget.turnCount }, (): EventTurn => ({ signal: 1, radiation: 0 })),
      facts,
      learned: new TextRef(note.famous ? `Learned.${ExoplanetTarget.idFor(record.name)}` : `Learned.Mode.${mode}`, { name: record.name }),
      sourceUrl: record.url,
      imageId: `Exoplanet${plan.channel}`,
    })
  }

  static modeFor(record: ExoplanetRecord): ObservingMode | undefined {
    return record.transits ? ObservingMode.Transit : ExoplanetTarget.modeByMethod[record.method]
  }

  static canObserve(record: ExoplanetRecord): boolean {
    return ExoplanetTarget.modeFor(record) !== undefined
  }

  static fromRecord(record: ExoplanetRecord, note: ExoplanetNote = { famous: false, atmosphere: false }): ExoplanetTarget {
    const mode = ExoplanetTarget.modeFor(record)
    if (!mode) throw new Error(`${record.name} cannot be a standing target: found by ${record.method} and it does not transit`)
    return new ExoplanetTarget(record, mode, note)
  }

  static idFor(name: string): string {
    return `Exoplanet.${name.replace(/[^A-Za-z0-9]+/g, '')}`
  }
}
