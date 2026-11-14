import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { MissionEventKind } from './MissionEvent'
import type { SeededRandom } from './SeededRandom'

interface EventRate {
  kind: MissionEventKind
  perYear: number
  applies: (design: ResolvedDesign) => boolean
}

export class RandomEventDeck {
  private static readonly rates: readonly EventRate[] = [
    { kind: MissionEventKind.SolarStorm, perYear: 0.15, applies: () => true },
    { kind: MissionEventKind.Micrometeoroid, perYear: 0.03, applies: (design) => design.instruments.length > 0 },
    { kind: MissionEventKind.HighSolarActivity, perYear: 0.25, applies: (design) => design.orbit.spec.dragEventsPossible },
  ]

  constructor(
    private readonly design: ResolvedDesign,
    private readonly random: SeededRandom,
  ) {}

  draw(stepYears: number): MissionEventKind[] {
    const frequency = this.design.difficulty.eventFrequency
    return RandomEventDeck.rates
      .filter((rate) => rate.applies(this.design))
      .filter((rate) => this.random.chance(rate.perYear * stepYears * frequency))
      .map((rate) => rate.kind)
  }
}
