import { Numbers } from '../Core/Numbers'
import { Rules } from '../Core/Rules'
import { TextRef } from '../Core/TextRef'
import { UtcDate } from '../Core/UtcDate'
import { Channel } from './Channel'
import type { DateWindow } from './DateWindow'
import { Rarity } from './Rarity'
import type { SpaceWeather } from './Records'
import { EventKind, SpaceEvent, type ChannelSpec } from './SpaceEvent'

const HourMs = 3600000

export enum FlareClass {
  None = 'None',
  C = 'C',
  M = 'M',
  X = 'X',
}

export interface StormReading {
  dateUtc: string
  kp: number
  particles: boolean
  flareClass: FlareClass
  flareObserved: boolean
  sourceUrl: string
}

export class SolarStorm extends SpaceEvent {
  readonly kind = EventKind.Storm
  private static readonly peakByKp: Readonly<Record<number, number>> = { 5: 3, 6: 4, 7: 6, 8: 8, 9: 10 }
  private static readonly longShape = [0.3, 0.7, 1, 0.7, 0.3]
  private static readonly shortShape = [0.4, 1, 0.8, 0.4]
  readonly peak: number

  constructor(readonly reading: StormReading) {
    const peak = SolarStorm.peakFor(reading)
    const shape = reading.kp >= 8 ? SolarStorm.longShape : SolarStorm.shortShape
    const radiation = shape.map((share) => Numbers.roundHalfUp(peak * share))
    const channels = new Map<Channel, ChannelSpec>([[Channel.Particles, { capacity: 3 * peak, minMark: 1 }]])
    if (reading.flareClass === FlareClass.X) channels.set(Channel.HighEnergy, { capacity: 12, minMark: 1 })
    if (reading.flareClass === FlareClass.M) channels.set(Channel.HighEnergy, { capacity: 8, minMark: 1 })
    super({
      id: SolarStorm.idFor(reading.dateUtc),
      label: new TextRef('Event.Storm.Name', { kp: reading.kp }),
      dateUtc: reading.dateUtc,
      rarity: reading.kp >= 8 ? Rarity.Headline : reading.kp === 7 ? Rarity.Notable : Rarity.Common,
      channels,
      turns: radiation.map((amount) => ({ signal: (2 * amount) / peak, radiation: amount })),
      facts: [
        new TextRef('Fact.Kp', { kp: reading.kp }),
        new TextRef(reading.particles ? 'Fact.ParticlesYes' : 'Fact.ParticlesNo'),
        new TextRef(!reading.flareObserved ? 'Fact.FlareAssumed' : reading.flareClass === FlareClass.None ? 'Fact.FlareNone' : 'Fact.FlareObserved', { flare: reading.flareClass }),
      ],
      learned: new TextRef('Learned.Storm', { kp: reading.kp }),
      sourceUrl: reading.sourceUrl,
      imageId: reading.kp >= 8 ? 'StormSevere' : 'Storm',
    })
    this.peak = peak
  }

  static idFor(dateUtc: string): string {
    return `Storm.${dateUtc.slice(0, 10)}`
  }

  static forWindow(window: DateWindow, weather: SpaceWeather): SolarStorm | undefined {
    const stampLag = Rules.kpStampHours * HourMs
    const readings = weather.storms
      .flatMap((storm) => storm.kpReadings.map((reading) => ({ kp: reading.kp, begins: UtcDate.parse(reading.timeUtc) - stampLag, ends: UtcDate.parse(reading.timeUtc), storm })))
      .filter((reading) => window.contains(new Date(reading.begins).toISOString()))
      .sort((a, b) => a.begins - b.begins)
    if (readings.length === 0) return undefined
    const strongest = readings.reduce((best, reading) => (reading.kp > best.kp ? reading : best))
    const kp = Math.min(9, Math.floor(strongest.kp))
    if (kp < Rules.stormKp) return undefined

    const begins = readings[0].begins
    const ends = readings[readings.length - 1].ends
    const within = (timeUtc: string, leadHours: number) => {
      const time = UtcDate.parse(timeUtc)
      return time >= begins - leadHours * HourMs && time < ends
    }
    const flares = weather.flares.filter((flare) => within(flare.peakUtc, Rules.flareLeadHours)).map((flare) => SolarStorm.classOf(flare.classType))
    const observed = weather.flaresAvailable
    return new SolarStorm({
      dateUtc: new Date(strongest.begins).toISOString().replace('.000Z', 'Z'),
      kp,
      particles: weather.particleEvents.some((event) => within(event.timeUtc, Rules.particleLeadHours)),
      flareClass: observed ? SolarStorm.strongest(flares) : kp >= 8 ? FlareClass.X : FlareClass.M,
      flareObserved: observed,
      sourceUrl: strongest.storm.url,
    })
  }

  private static peakFor(reading: StormReading): number {
    const base = SolarStorm.peakByKp[reading.kp]
    if (base === undefined) throw new Error(`No storm below Kp ${Rules.stormKp} or above 9: got ${reading.kp}`)
    return base + (reading.particles ? 2 : 0)
  }

  private static classOf(classType: string): FlareClass {
    const letter = classType.trim().charAt(0).toUpperCase()
    return letter === 'X' ? FlareClass.X : letter === 'M' ? FlareClass.M : letter === 'C' ? FlareClass.C : FlareClass.None
  }

  private static strongest(classes: readonly FlareClass[]): FlareClass {
    for (const flare of [FlareClass.X, FlareClass.M, FlareClass.C]) {
      if (classes.includes(flare)) return flare
    }
    return FlareClass.None
  }
}
