import type { Instrument } from '../Catalog/Instrument'
import type { ResolvedDesign } from '../Design/ResolvedDesign'

export class ScienceModel {
  pointsPerYear(design: ResolvedDesign, instruments: readonly Instrument[]): number {
    const orbitFit = design.scenario.orbitFit(design.orbit.orbitClass)
    const perSpacecraft = instruments.reduce((sum, instrument) => sum + instrument.sciencePerYear * design.scenario.instrumentFit(instrument.id), 0)
    return perSpacecraft * orbitFit * design.copies
  }

  revisitHours(design: ResolvedDesign): number {
    return design.scenario.revisitHours(design.orbit.orbitClass, design.copies)
  }

  coverage(design: ResolvedDesign): number {
    const achieved = this.revisitHours(design)
    if (!Number.isFinite(achieved)) return 0
    return Math.min(1, design.scenario.spec.requiredRevisitHours / achieved)
  }
}
