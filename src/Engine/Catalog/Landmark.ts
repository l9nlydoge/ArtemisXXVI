import { CatalogItem } from './CatalogItem'
import type { OrbitClass } from './OrbitClass'

export interface LandmarkSpec {
  orbitClass: OrbitClass
  altitudeKm: number
  inclinationDeg: number
  periodMin: number
  lengthM: number
  launchedYear: number
}

export class Landmark extends CatalogItem {
  constructor(id: string, name: string, readonly spec: LandmarkSpec, sources: string[]) {
    super(id, name, sources)
  }

  get source(): string {
    return this.sources[0]
  }
}
