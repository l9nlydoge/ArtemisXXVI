import { CatalogItem } from './CatalogItem'
import type { LaunchPricing } from './LaunchPricing'
import type { Orbit } from './Orbit'
import type { CapacityClass } from './OrbitClass'

export class LaunchVehicle extends CatalogItem {
  constructor(
    id: string,
    name: string,
    private readonly capacityKg: Partial<Record<CapacityClass, number>>,
    readonly pricing: LaunchPricing,
    readonly failureChance: number,
    sources: string[],
    estimated = false,
  ) {
    super(id, name, sources, estimated)
  }

  capacityFor(orbit: Orbit): number {
    return this.capacityKg[orbit.spec.capacityClass] ?? 0
  }

  canReach(orbit: Orbit): boolean {
    return this.capacityFor(orbit) > 0
  }
}
