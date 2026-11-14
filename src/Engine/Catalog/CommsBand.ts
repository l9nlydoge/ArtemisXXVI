import { CatalogItem } from './CatalogItem'

export class CommsBand extends CatalogItem {
  constructor(
    id: string,
    name: string,
    readonly dataMbps: number,
    readonly massKg: number,
    readonly powerW: number,
    readonly costMusd: number,
    readonly availability: number,
    sources: string[],
  ) {
    super(id, name, sources)
  }
}
