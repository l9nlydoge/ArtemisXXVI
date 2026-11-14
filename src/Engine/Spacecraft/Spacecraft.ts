import type { Channel } from '../Events/Channel'
import { Instrument } from '../Modules/Instrument'
import type { Mark } from '../Modules/MarkSpec'
import type { ModuleCard } from '../Modules/ModuleCard'
import { Battery, SolarArray } from '../Modules/PowerModules'
import { MagneticShield, RadiationShielding } from '../Modules/ProtectionModules'
import { Antenna, FlightComputer, RepairDrone, Thrusters } from '../Modules/UtilityModules'
import type { InstalledModule } from './InstalledModule'
import type { Loadout } from './Loadout'

type CardClass<T extends ModuleCard> = abstract new (...args: never[]) => T

export class Spacecraft {
  readonly generation: number
  readonly capacity: number
  readonly maxHull: number
  readonly passiveShield: number
  readonly lookahead: number
  readonly pointsMultiplier: number
  readonly burns: number
  readonly actives: readonly InstalledModule[]
  readonly instruments: readonly InstalledModule[]

  constructor(readonly loadout: Loadout) {
    const { bus, installed } = loadout
    this.generation = bus.baseGeneration + this.sum(SolarArray)
    this.capacity = bus.baseCapacity + this.sum(Battery)
    this.maxHull = bus.hull
    this.passiveShield = this.sum(RadiationShielding)
    this.lookahead = this.first(FlightComputer)?.value ?? 0
    this.pointsMultiplier = this.first(Antenna)?.value ?? 1
    this.burns = this.first(Thrusters)?.value ?? 0
    this.actives = installed.filter((module) => module.card.isActive)
    this.instruments = installed.filter((module) => module.card instanceof Instrument)
  }

  get hasRadar(): boolean {
    return this.instruments.some((module) => (module.card as Instrument).canSurvey)
  }

  get magneticShield(): InstalledModule | undefined {
    return this.first(MagneticShield)
  }

  get thrusters(): InstalledModule | undefined {
    return this.first(Thrusters)
  }

  get repairDrone(): InstalledModule | undefined {
    return this.first(RepairDrone)
  }

  get channels(): Channel[] {
    return this.instruments.map((module) => (module.card as Instrument).channel)
  }

  active(key: string): InstalledModule | undefined {
    return this.actives.find((module) => module.key === key)
  }

  instrumentFor(channel: Channel): InstalledModule | undefined {
    return this.instruments.find((module) => (module.card as Instrument).channel === channel)
  }

  canRecord(channel: Channel, minMark: Mark = 1): boolean {
    const instrument = this.instrumentFor(channel)
    return instrument !== undefined && instrument.mark >= minMark
  }

  private all<T extends ModuleCard>(kind: CardClass<T>): InstalledModule[] {
    return this.loadout.installed.filter((module) => module.card instanceof kind)
  }

  private first<T extends ModuleCard>(kind: CardClass<T>): InstalledModule | undefined {
    return this.all(kind)[0]
  }

  private sum<T extends ModuleCard>(kind: CardClass<T>): number {
    return this.all(kind).reduce((total, module) => total + module.value, 0)
  }
}
