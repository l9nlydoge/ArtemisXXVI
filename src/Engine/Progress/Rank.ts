import { Rules } from '../Core/Rules'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import { WeekCatalog } from '../Weeks/WeekCatalog'

export enum UnlockKind {
  Bus = 'Bus',
  Week = 'Week',
  Module = 'Module',
  Mark = 'Mark',
  Teaser = 'Teaser',
}

export interface RankUnlock {
  kind: UnlockKind
  id: string
}

export interface RankProgress {
  rank: number
  into: number
  span: number
  toNext: number
  isTop: boolean
}

export class Rank {
  static readonly thresholds: readonly number[] = [0, 150, 350, 900, 1800, 3500]

  static get top(): number {
    return Rank.thresholds.length
  }

  static of(lifetimePoints: number): number {
    let rank = 1
    Rank.thresholds.forEach((threshold, index) => {
      if (lifetimePoints >= threshold) rank = index + 1
    })
    return rank
  }

  static threshold(rank: number): number {
    return Rank.thresholds[Math.min(Rank.top, Math.max(1, rank)) - 1]
  }

  static progress(lifetimePoints: number): RankProgress {
    const rank = Rank.of(lifetimePoints)
    const floor = Rank.threshold(rank)
    if (rank === Rank.top) return { rank, into: lifetimePoints - floor, span: 0, toNext: 0, isTop: true }
    const ceiling = Rank.threshold(rank + 1)
    return { rank, into: lifetimePoints - floor, span: ceiling - floor, toNext: ceiling - lifetimePoints, isTop: false }
  }

  static unlocksAt(rank: number, weeks: WeekCatalog = WeekCatalog.shared, modules: ModuleCatalog = ModuleCatalog.shared, buses: BusCatalog = BusCatalog.shared): RankUnlock[] {
    const unlocks: RankUnlock[] = [
      ...buses.all.filter((bus) => bus.minRank === rank).map((bus) => ({ kind: UnlockKind.Bus, id: bus.id })),
      ...weeks.all.filter((week) => week.minRank === rank).map((week) => ({ kind: UnlockKind.Week, id: week.id })),
      ...modules.all.filter((card) => card.isObtainable && card.minRank === rank && !card.isStarter).map((card) => ({ kind: UnlockKind.Module, id: card.id })),
    ]
    Rules.markRanks.forEach((markRank, index) => {
      if (index > 0 && markRank === rank) unlocks.push({ kind: UnlockKind.Mark, id: String(index + 1) })
    })
    if (rank === Rank.top) unlocks.push({ kind: UnlockKind.Teaser, id: 'Destinations' })
    return unlocks
  }
}
