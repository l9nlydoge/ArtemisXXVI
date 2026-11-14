import type { Week } from './Week'

export class WeekCatalog {
  static shared = new WeekCatalog([])

  constructor(readonly all: readonly Week[]) {}

  has(id: string): boolean {
    return this.all.some((week) => week.id === id)
  }

  get(id: string): Week {
    const week = this.all.find((candidate) => candidate.id === id)
    if (!week) throw new Error(`Unknown week: ${id}`)
    return week
  }

  availableAt(rank: number): Week[] {
    return this.all.filter((week) => week.minRank <= rank)
  }
}
