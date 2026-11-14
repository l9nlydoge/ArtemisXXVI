import { AllChannels, Channel } from '../Events/Channel'
import { RadiationBands, type RadiationBand } from '../Events/RadiationBand'
import type { SolarStorm } from '../Events/SolarStorm'
import { EventKind, type SpaceEvent } from '../Events/SpaceEvent'

export class Forecast {
  readonly stormLegs: number
  readonly worstBand: RadiationBand
  readonly asteroidCount: number
  readonly radarTargets: number
  readonly planetCount: number
  readonly unknownsExpected: boolean
  private readonly demand: ReadonlyMap<Channel, number>

  constructor(events: readonly SpaceEvent[], storms: readonly SolarStorm[]) {
    const asteroids = events.filter((event) => event.kind === EventKind.Asteroid)
    this.stormLegs = storms.length
    this.worstBand = RadiationBands.worst(storms.map((storm) => storm.band))
    this.asteroidCount = asteroids.length
    this.radarTargets = asteroids.filter((event) => event.channels.has(Channel.Radar)).length
    this.planetCount = events.filter((event) => event.kind === EventKind.Exoplanet).length
    this.unknownsExpected = events.some((event) => event.startsUnidentified)
    this.demand = new Map(AllChannels.map((channel) => [channel, [...events, ...storms].reduce((sum, event) => sum + event.capacity(channel) * event.rarity, 0)]))
  }

  channelDemand(channel: Channel): number {
    return this.demand.get(channel) ?? 0
  }

  get channelsByDemand(): Channel[] {
    return AllChannels.filter((channel) => this.channelDemand(channel) > 0).sort((a, b) => this.channelDemand(b) - this.channelDemand(a))
  }

  demandShare(channel: Channel): number {
    const total = AllChannels.reduce((sum, each) => sum + this.channelDemand(each), 0)
    return total === 0 ? 0 : this.channelDemand(channel) / total
  }
}
