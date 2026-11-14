import type { Channel } from '../Events/Channel'
import { ModuleCard, type ModuleTraits } from './ModuleCard'
import { ModuleFamily } from './ModuleFamily'

export class Instrument extends ModuleCard {
  readonly family = ModuleFamily.Instrument

  constructor(
    id: string,
    readonly channel: Channel,
    private readonly power: number,
    traits: ModuleTraits,
  ) {
    super(id, traits)
  }

  override get powerCost(): number {
    return this.power
  }

  get canSurvey(): boolean {
    return false
  }
}

export class Radar extends Instrument {
  override get canSurvey(): boolean {
    return true
  }
}
