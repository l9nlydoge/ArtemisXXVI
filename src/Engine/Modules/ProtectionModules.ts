import { ModuleCard, type ModuleTraits } from './ModuleCard'
import { ModuleFamily } from './ModuleFamily'

export class RadiationShielding extends ModuleCard {
  readonly family = ModuleFamily.Protection
}

export class MagneticShield extends ModuleCard {
  readonly family = ModuleFamily.Protection

  constructor(id: string, private readonly power: number, traits: ModuleTraits) {
    super(id, traits)
  }

  override get powerCost(): number {
    return this.power
  }
}
