import { ModuleCard } from './ModuleCard'
import { ModuleFamily } from './ModuleFamily'

export class SolarArray extends ModuleCard {
  readonly family = ModuleFamily.Power
}

export class Battery extends ModuleCard {
  readonly family = ModuleFamily.Power
}
