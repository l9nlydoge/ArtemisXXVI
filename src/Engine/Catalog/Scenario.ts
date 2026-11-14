import { CatalogItem } from './CatalogItem'
import type { OrbitClass } from './OrbitClass'
import type { ReferenceMission } from './ReferenceMission'

export interface ScenarioSpec {
  budgetMusd: number
  targetYears: number
  requiredScience: number
  requiredRevisitHours: number
  maxCopies: number
  instrumentFit: Readonly<Record<string, number>>
  orbitFit: Readonly<Record<OrbitClass, number>>
  orbitRevisitHours: Readonly<Record<OrbitClass, number>>
}

export class Scenario extends CatalogItem {
  constructor(
    id: string,
    name: string,
    readonly briefing: string,
    readonly spec: ScenarioSpec,
    readonly reference: ReferenceMission,
  ) {
    super(id, name)
  }

  instrumentFit(instrumentId: string): number {
    return this.spec.instrumentFit[instrumentId] ?? 0
  }

  orbitFit(orbitClass: OrbitClass): number {
    return this.spec.orbitFit[orbitClass]
  }

  revisitHours(orbitClass: OrbitClass, copies: number): number {
    return this.spec.orbitRevisitHours[orbitClass] / Math.max(1, copies)
  }
}
