import { CatalogItem } from './CatalogItem'

export class Instrument extends CatalogItem {
  constructor(
    id: string,
    name: string,
    readonly massKg: number,
    readonly powerW: number,
    readonly dataMbps: number,
    readonly dutyCycle: number,
    readonly costMusd: number,
    readonly sciencePerYear: number,
    sources: string[],
    estimated = false,
  ) {
    super(id, name, sources, estimated)
  }

  get gigabitsPerDay(): number {
    return (this.dataMbps * this.dutyCycle * 86400) / 1000
  }
}
