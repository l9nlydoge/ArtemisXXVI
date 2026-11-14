export type Mark = 1 | 2 | 3

export const AllMarks: readonly Mark[] = [1, 2, 3]

export interface MarkSpec {
  costMusd: number
  bayUnits: number
  unlockPoints: number
  value: number
}

export type MarkTable = readonly [MarkSpec, MarkSpec, MarkSpec]

export class Marks {
  static table(cost: readonly number[], bay: readonly number[], value: readonly number[], unlock: readonly number[]): MarkTable {
    const spec = (index: number): MarkSpec => ({ costMusd: cost[index], bayUnits: bay[index], value: value[index], unlockPoints: unlock[index] })
    return [spec(0), spec(1), spec(2)]
  }
}
