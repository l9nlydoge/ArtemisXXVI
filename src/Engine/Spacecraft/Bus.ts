export interface BusSpec {
  minRank: number
  budgetMusd: number
  bayUnits: number
  hull: number
  baseGeneration: number
  baseCapacity: number
}

export class Bus {
  constructor(readonly id: string, readonly spec: BusSpec) {}

  get minRank(): number {
    return this.spec.minRank
  }

  get budgetMusd(): number {
    return this.spec.budgetMusd
  }

  get bayUnits(): number {
    return this.spec.bayUnits
  }

  get hull(): number {
    return this.spec.hull
  }

  get baseGeneration(): number {
    return this.spec.baseGeneration
  }

  get baseCapacity(): number {
    return this.spec.baseCapacity
  }
}
