export abstract class CatalogItem {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly sources: readonly string[] = [],
    readonly estimated: boolean = false,
  ) {}
}
