export enum Rarity {
  Common = 1,
  Notable = 2,
  Headline = 3,
}

export class RarityTable {
  private static readonly weights: Record<Rarity, number> = {
    [Rarity.Common]: 6,
    [Rarity.Notable]: 3,
    [Rarity.Headline]: 1,
  }

  static dealWeight(rarity: Rarity): number {
    return RarityTable.weights[rarity]
  }
}
