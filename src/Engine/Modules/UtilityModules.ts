import { ModuleCard, type ModuleTraits } from './ModuleCard'
import { ModuleFamily } from './ModuleFamily'

export class FlightComputer extends ModuleCard {
  readonly family = ModuleFamily.Utility
}

export class Antenna extends ModuleCard {
  readonly family = ModuleFamily.Utility
}

abstract class PoweredModule extends ModuleCard {
  constructor(id: string, private readonly power: number, traits: ModuleTraits) {
    super(id, traits)
  }

  override get powerCost(): number {
    return this.power
  }
}

export class RepairDrone extends PoweredModule {
  readonly family = ModuleFamily.Utility
}

export class Thrusters extends PoweredModule {
  readonly family = ModuleFamily.Mobility
}

export class CrewCapsule extends ModuleCard {
  readonly family = ModuleFamily.Crew

  override get isObtainable(): boolean {
    return false
  }
}
