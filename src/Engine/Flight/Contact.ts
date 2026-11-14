import { RadiationBands, type RadiationBand } from '../Events/RadiationBand'
import type { SolarStorm } from '../Events/SolarStorm'
import type { SpaceEvent } from '../Events/SpaceEvent'
import type { TurnCondition } from './TurnCondition'

export class Contact {
  played = false

  constructor(
    readonly event: SpaceEvent,
    public identified: boolean,
    readonly conditions: readonly TurnCondition[],
    readonly overlay?: SolarStorm,
  ) {}

  get turnCount(): number {
    return this.conditions.length
  }

  get peakRadiation(): number {
    return Math.max(...this.conditions.map((condition) => condition.radiation))
  }

  get band(): RadiationBand {
    return RadiationBands.of(this.peakRadiation)
  }

  get peakSignal(): number {
    return Math.max(...this.conditions.map((condition) => condition.signal))
  }
}
