import { Rules } from '../Core/Rules'
import type { Mark, MarkSpec, MarkTable } from './MarkSpec'
import type { ModuleFamily } from './ModuleFamily'

export interface ModuleTraits {
  minRank: number
  marks: MarkTable
  maxCopies?: number
}

export abstract class ModuleCard {
  abstract readonly family: ModuleFamily
  readonly minRank: number
  readonly marks: MarkTable
  readonly maxCopies: number

  constructor(readonly id: string, traits: ModuleTraits) {
    this.minRank = traits.minRank
    this.marks = traits.marks
    this.maxCopies = traits.maxCopies ?? 1
  }

  mark(mark: Mark): MarkSpec {
    return this.marks[mark - 1]
  }

  minRankFor(mark: Mark): number {
    return Math.max(this.minRank, Rules.markRanks[mark - 1])
  }

  get powerCost(): number {
    return 0
  }

  get isActive(): boolean {
    return this.powerCost > 0
  }

  get isObtainable(): boolean {
    return true
  }

  get isStarter(): boolean {
    return this.marks[0].unlockPoints === 0 && this.isObtainable
  }
}
