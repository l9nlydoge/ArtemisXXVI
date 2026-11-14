import type { Bus } from '../Catalog/Bus'
import { Catalog } from '../Catalog/Catalog'
import type { CommsBand } from '../Catalog/CommsBand'
import type { Instrument } from '../Catalog/Instrument'
import type { LaunchVehicle } from '../Catalog/LaunchVehicle'
import type { Orbit } from '../Catalog/Orbit'
import type { Scenario } from '../Catalog/Scenario'
import type { SolarArrayType } from '../Catalog/SolarArrayType'
import { Difficulty, DifficultyProfile } from './Difficulty'
import type { MissionDesign } from './MissionDesign'

export class ResolvedDesign {
  readonly instruments: readonly Instrument[]
  readonly bus: Bus
  readonly arrayType: SolarArrayType
  readonly orbit: Orbit
  readonly comms: CommsBand
  readonly vehicle: LaunchVehicle
  readonly difficulty: DifficultyProfile

  constructor(
    readonly design: MissionDesign,
    readonly scenario: Scenario,
    difficulty: Difficulty = Difficulty.Normal,
    catalog: Catalog = Catalog.shared,
  ) {
    const { Science, Spacecraft, Operations, Program } = design.slices
    this.instruments = Science.instrumentIds.map((id) => catalog.instruments.get(id))
    this.bus = catalog.buses.get(Spacecraft.busId)
    this.arrayType = catalog.solarArrays.get(Spacecraft.arrayTypeId)
    this.orbit = catalog.orbits.get(Operations.orbitId)
    this.comms = catalog.commsBands.get(Operations.commsId)
    this.vehicle = catalog.launchVehicles.get(Program.launchVehicleId)
    this.difficulty = DifficultyProfile.of(difficulty)
  }

  get designLifeYears(): number {
    return this.design.slices.Science.designLifeYears
  }

  get arrayAreaM2(): number {
    return this.design.slices.Spacecraft.arrayAreaM2
  }

  get batteryWh(): number {
    return this.design.slices.Spacecraft.batteryWh
  }

  get shielded(): boolean {
    return this.design.slices.Spacecraft.shielded
  }

  get groundStations(): number {
    return this.design.slices.Operations.groundStations
  }

  get copies(): number {
    return this.design.slices.Program.copies
  }

  get payloadMassKg(): number {
    return this.instruments.reduce((sum, instrument) => sum + instrument.massKg, 0)
  }
}
