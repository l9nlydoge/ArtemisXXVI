import { CatalogItem } from './CatalogItem'

export class Bus extends CatalogItem {
  constructor(
    id: string,
    name: string,
    readonly massKg: number,
    readonly maxPayloadKg: number,
    readonly baseLoadW: number,
    readonly costMusd: number,
    readonly maxDesignLifeYears: number,
    sources: string[] = [],
  ) {
    super(id, name, sources, true)
  }
}
