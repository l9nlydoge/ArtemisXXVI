import { Bus } from './Bus'

export class BusCatalog {
  static readonly shared = new BusCatalog([
    new Bus('SmallSat', { minRank: 1, budgetMusd: 60, bayUnits: 8, hull: 16, baseGeneration: 1, baseCapacity: 6 }),
    new Bus('Explorer', { minRank: 3, budgetMusd: 110, bayUnits: 12, hull: 22, baseGeneration: 2, baseCapacity: 8 }),
    new Bus('Flagship', { minRank: 5, budgetMusd: 200, bayUnits: 18, hull: 30, baseGeneration: 3, baseCapacity: 10 }),
  ])

  constructor(readonly all: readonly Bus[]) {}

  has(id: string): boolean {
    return this.all.some((bus) => bus.id === id)
  }

  get(id: string): Bus {
    const bus = this.all.find((candidate) => candidate.id === id)
    if (!bus) throw new Error(`Unknown bus: ${id}`)
    return bus
  }

  availableAt(rank: number): Bus[] {
    return this.all.filter((bus) => bus.minRank <= rank)
  }

  largestFor(rank: number): Bus {
    const available = this.availableAt(rank)
    return available[available.length - 1] ?? this.all[0]
  }
}
