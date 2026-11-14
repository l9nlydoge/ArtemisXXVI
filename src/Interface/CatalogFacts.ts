import type { Bus } from '../Engine/Catalog/Bus'
import { Catalog } from '../Engine/Catalog/Catalog'
import type { CommsBand } from '../Engine/Catalog/CommsBand'
import type { LaunchVehicle } from '../Engine/Catalog/LaunchVehicle'
import type { Orbit } from '../Engine/Catalog/Orbit'
import type { SolarArrayType } from '../Engine/Catalog/SolarArrayType'
import type { ResolvedDesign } from '../Engine/Design/ResolvedDesign'
import { Numbers } from '../Engine/Numbers'
import type { Translator } from '../I18n/Translator'

export class CatalogFacts {
  constructor(
    private readonly translator: Translator,
    private readonly design: ResolvedDesign,
  ) {}

  bus(bus: Bus): string[] {
    const t = this.translator
    return [t.t('Fact.Carries', { payload: bus.maxPayloadKg }), t.t('Fact.Rated', { years: bus.maxDesignLifeYears }), t.t('Fact.Cost', { cost: bus.costMusd })]
  }

  solarArray(array: SolarArrayType): string[] {
    return [this.translator.t('Fact.ArrayDensity', { kg: array.kgPerSquareMeter }), this.translator.t('Fact.CostPerArea', { cost: array.costMusdPerSquareMeter })]
  }

  orbit(orbit: Orbit): string[] {
    const t = this.translator
    const { periodMin, eclipseMin, continuousContact, contactMinPerStation } = orbit.spec
    const period = periodMin > 100000 ? t.t('Fact.HaloOrbit') : periodMin > 600 ? t.t('Fact.PeriodHours', { hours: Numbers.round(periodMin / 60) }) : t.t('Fact.PeriodMinutes', { minutes: Numbers.round(periodMin) })
    const neighbours = Catalog.shared.landmarks.items.filter((landmark) => landmark.spec.orbitClass === orbit.orbitClass).map((landmark) => landmark.name)
    return [
      t.t('Fact.Fit', { fit: Numbers.percent(this.design.scenario.orbitFit(orbit.orbitClass)) }),
      period,
      eclipseMin === 0 ? t.t('Fact.NoShadow') : t.t('Fact.Shadow', { minutes: eclipseMin }),
      continuousContact ? t.t('Fact.ContinuousContact') : t.t('Fact.Contact', { minutes: contactMinPerStation }),
      ...(neighbours.length ? [t.t('Fact.Neighbours', { names: neighbours.join(', ') })] : []),
    ]
  }

  comms(band: CommsBand): string[] {
    const t = this.translator
    const rate = this.design.orbit.effectiveRateMbps(band.id, band.dataMbps)
    return [rate === 0 ? t.t('Fact.NoLink') : this.rate(rate), t.t('Fact.Draws', { watts: band.powerW }), t.t('Fact.Cost', { cost: band.costMusd })]
  }

  vehicle(vehicle: LaunchVehicle, launchMassKg: number): string[] {
    const t = this.translator
    const capacity = vehicle.capacityFor(this.design.orbit)
    const price = vehicle.pricing.costMusd(launchMassKg, 1, 1)
    return [
      capacity === 0 ? t.t('Fact.CannotReach') : t.t('Fact.Lifts', { capacity }),
      vehicle.pricing.sharesRide ? t.t('Fact.CostEach', { cost: Numbers.round(price, 2) }) : t.t('Fact.Cost', { cost: price }),
      t.t('Fact.Fails', { chance: Numbers.percent(vehicle.failureChance) }),
    ]
  }

  rate(mbps: number): string {
    if (mbps >= 1000) return `${this.translator.number(Numbers.round(mbps / 1000, 1))} Gbps`
    if (mbps < 1) return `${this.translator.number(Numbers.round(mbps * 1000, 1))} kbps`
    return `${this.translator.number(Numbers.round(mbps, 1))} Mbps`
  }
}
