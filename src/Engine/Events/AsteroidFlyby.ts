import { SeededRandom } from '../Core/SeededRandom'
import { TextRef } from '../Core/TextRef'
import { UtcDate } from '../Core/UtcDate'
import { Channel } from './Channel'
import { Rarity } from './Rarity'
import type { AsteroidRecord } from './Records'
import { EventKind, SpaceEvent, type ChannelSpec, type EventTurn } from './SpaceEvent'

export enum ObservationHistory {
  SeenBeforeAndAfter = 'SeenBeforeAndAfter',
  FirstSeenAfter = 'FirstSeenAfter',
  LastSeenBefore = 'LastSeenBefore',
}

export class AsteroidFlyby extends SpaceEvent {
  readonly kind = EventKind.Asteroid
  private static readonly images = ['AsteroidA', 'AsteroidB', 'AsteroidC']

  private constructor(readonly record: AsteroidRecord, pinned: boolean) {
    const diameter = AsteroidFlyby.diameterM(record)
    const history = AsteroidFlyby.history(record)
    const words = { name: record.name, km: Math.round(record.missKm), lunar: Number(record.missLunar.toFixed(2)), first: record.firstObserved, last: record.lastObserved }
    const size = AsteroidFlyby.sizeStep(diameter)
    const channels = new Map<Channel, ChannelSpec>([
      [Channel.Visible, { capacity: 6 + size, minMark: 1 }],
      [Channel.Spectrum, { capacity: 6, minMark: 1 }],
    ])
    if (record.missLunar < 10) channels.set(Channel.Radar, { capacity: 8 + size, minMark: 1 })
    super({
      id: AsteroidFlyby.idFor(record.id),
      label: TextRef.literal(record.name),
      dateUtc: record.dateUtc,
      rarity: AsteroidFlyby.rarity(record, diameter, pinned),
      channels,
      turns: AsteroidFlyby.turns(record),
      facts: [
        new TextRef('Fact.Speed', { speed: Number(record.speedKmS.toFixed(1)) }),
        new TextRef('Fact.MissDistance', { km: Math.round(record.missKm), lunar: Number(record.missLunar.toFixed(2)) }),
        new TextRef(record.diameterMeasured ? 'Fact.DiameterMeasured' : 'Fact.Diameter', { min: Math.round(record.diameterMinM), max: Math.round(record.diameterMaxM) }),
        new TextRef(`Fact.Observed.${history}`, words),
      ],
      learned: new TextRef(pinned ? `Learned.${AsteroidFlyby.idFor(record.id)}` : `Learned.Asteroid.${history}`, words),
      sourceUrl: record.url,
      imageId: AsteroidFlyby.images[SeededRandom.hashText(record.id) % AsteroidFlyby.images.length],
    })
  }

  static fromRecord(record: AsteroidRecord, pinned = false): AsteroidFlyby {
    return new AsteroidFlyby(record, pinned)
  }

  get history(): ObservationHistory {
    return AsteroidFlyby.history(this.record)
  }

  static idFor(recordId: string): string {
    return `Asteroid.${recordId}`
  }

  override get startsUnidentified(): boolean {
    return this.rarity === Rarity.Headline
  }

  private static history(record: AsteroidRecord): ObservationHistory {
    const passDay = record.dateUtc.slice(0, 10)
    for (const day of [record.firstObserved, record.lastObserved]) UtcDate.parse(`${day}T00:00:00Z`)
    if (record.firstObserved > passDay) return ObservationHistory.FirstSeenAfter
    if (record.lastObserved < passDay) return ObservationHistory.LastSeenBefore
    return ObservationHistory.SeenBeforeAndAfter
  }

  private static diameterM(record: AsteroidRecord): number {
    return (record.diameterMinM + record.diameterMaxM) / 2
  }

  private static sizeStep(diameter: number): number {
    if (diameter < 30) return 0
    if (diameter < 140) return 3
    if (diameter < 1000) return 6
    return 9
  }

  private static peak(missLunar: number): number {
    if (missLunar < 1) return 2
    if (missLunar < 5) return 1.5
    return 1
  }

  private static turns(record: AsteroidRecord): EventTurn[] {
    const peak = AsteroidFlyby.peak(record.missLunar)
    const signals = record.speedKmS >= 20 ? [1, peak, 1] : record.speedKmS >= 10 ? [0.5, 1, peak, 1] : [0.5, 1, peak, 1, 0.5]
    return signals.map((signal) => ({ signal, radiation: 0 }))
  }

  private static rarity(record: AsteroidRecord, diameter: number, pinned: boolean): Rarity {
    if (pinned) return Rarity.Headline
    return record.missLunar < 1 || record.hazardous || diameter >= 140 ? Rarity.Notable : Rarity.Common
  }
}
