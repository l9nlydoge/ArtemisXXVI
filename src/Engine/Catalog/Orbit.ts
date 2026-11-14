import { CatalogItem } from './CatalogItem'
import { CapacityClass, OrbitClass } from './OrbitClass'

export interface OrbitSpec {
  orbitClass: OrbitClass
  altitudeKm: number
  inclinationDeg: number
  capacityClass: CapacityClass
  periodMin: number
  eclipseMin: number
  contactMinPerStation: number
  continuousContact: boolean
  rateFactor: number
  bandRateCapsMbps: Readonly<Record<string, number>>
  insertionDvMs: number
  keepingDvMsPerYear: number
  radiationLifeYears: number
  shieldedRadiationLifeYears: number
  safeDepthOfDischarge: number
  dragEventsPossible: boolean
}

export class Orbit extends CatalogItem {
  constructor(id: string, name: string, readonly spec: OrbitSpec, sources: string[]) {
    super(id, name, sources)
  }

  get orbitClass(): OrbitClass {
    return this.spec.orbitClass
  }

  get sunlitMin(): number {
    return this.spec.periodMin - this.spec.eclipseMin
  }

  get eclipseHours(): number {
    return this.spec.eclipseMin / 60
  }

  contactMinutesPerDay(stations: number): number {
    if (this.spec.continuousContact) return 1440
    return Math.min(1440, stations * this.spec.contactMinPerStation)
  }

  effectiveRateMbps(bandId: string, nominalMbps: number): number {
    const cap = this.spec.bandRateCapsMbps[bandId]
    const scaled = nominalMbps * this.spec.rateFactor
    return cap === undefined ? scaled : Math.min(scaled, cap)
  }

  radiationLifeYears(shielded: boolean): number {
    return shielded ? this.spec.shieldedRadiationLifeYears : this.spec.radiationLifeYears
  }
}
