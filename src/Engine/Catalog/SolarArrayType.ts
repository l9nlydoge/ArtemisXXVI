import { CatalogItem } from './CatalogItem'

export class SolarArrayType extends CatalogItem {
  constructor(
    id: string,
    name: string,
    readonly wattsPerSquareMeter: number,
    readonly kgPerSquareMeter: number,
    readonly costMusdPerSquareMeter: number,
    sources: string[],
  ) {
    super(id, name, sources, true)
  }

  massKg(areaM2: number): number {
    return areaM2 * this.kgPerSquareMeter
  }

  costMusd(areaM2: number): number {
    return areaM2 * this.costMusdPerSquareMeter
  }
}
