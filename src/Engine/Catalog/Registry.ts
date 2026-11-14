import type { CatalogItem } from './CatalogItem'

export class Registry<T extends CatalogItem> {
  private readonly byId: ReadonlyMap<string, T>

  constructor(readonly items: readonly T[]) {
    this.byId = new Map(items.map((item) => [item.id, item]))
  }

  get(id: string): T {
    const item = this.byId.get(id)
    if (!item) throw new Error(`Unknown catalog id: ${id}`)
    return item
  }

  has(id: string): boolean {
    return this.byId.has(id)
  }

  get ids(): string[] {
    return this.items.map((item) => item.id)
  }
}
