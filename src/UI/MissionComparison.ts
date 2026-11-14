import { ReferenceFactKey, type ReferenceFact } from '../Engine/Catalog/ReferenceMission'
import { Numbers } from '../Engine/Numbers'
import type { SimulationResult } from '../Engine/Simulation/SimulationResult'
import type { Translator } from '../I18n/Translator'
import { CatalogFacts } from './CatalogFacts'

export interface ComparisonRow {
  key: ReferenceFactKey
  yours: string
  theirs: ReferenceFact
}

export class MissionComparison {
  readonly rows: readonly ComparisonRow[]

  constructor(result: SimulationResult, translator: Translator) {
    const design = result.design
    const facts = new CatalogFacts(translator, design)
    const mass = result.budgets.mass.launchMassKg
    const fleet = design.copies > 1 ? ` × ${design.copies}` : ''
    const yours: Record<ReferenceFactKey, string> = {
      [ReferenceFactKey.Mass]: `${translator.number(Numbers.round(mass, mass < 100 ? 1 : 0))} kg${fleet}`,
      [ReferenceFactKey.Orbit]: design.orbit.name,
      [ReferenceFactKey.Instruments]: design.instruments.map((instrument) => instrument.name).join(', ') || '—',
      [ReferenceFactKey.Downlink]: `${design.comms.name} ${facts.rate(result.budgets.data.effectiveRateMbps)}`,
      [ReferenceFactKey.DesignLife]: translator.t('Brief.Years', { years: design.designLifeYears }),
      [ReferenceFactKey.Launch]: design.vehicle.name,
      [ReferenceFactKey.Cost]: translator.t('Fact.Cost', { cost: Numbers.round(result.costMusd) }),
    }
    this.rows = design.scenario.reference.facts.map((fact) => ({ key: fact.key, yours: yours[fact.key], theirs: fact }))
  }
}
