import type { Mark } from '../Modules/MarkSpec'
import type { ModuleCard } from '../Modules/ModuleCard'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import type { Profile } from './Profile'

export enum OfferState {
  Available = 'Available',
  TooExpensive = 'TooExpensive',
  RankLocked = 'RankLocked',
  Maxed = 'Maxed',
  InDevelopment = 'InDevelopment',
}

export interface LabOffer {
  card: ModuleCard
  ownedMark: number
  mark?: Mark
  cost: number
  state: OfferState
  needsRank?: number
  shortBy?: number
}

export class Lab {
  constructor(private readonly catalog: ModuleCatalog = ModuleCatalog.shared) {}

  offers(profile: Profile): LabOffer[] {
    return this.catalog.all.map((card) => this.offer(profile, card))
  }

  offer(profile: Profile, card: ModuleCard): LabOffer {
    const ownedMark = profile.ownedMark(card.id)
    if (!card.isObtainable) return { card, ownedMark, cost: 0, state: OfferState.InDevelopment, needsRank: card.minRank }
    if (ownedMark >= 3) return { card, ownedMark, cost: 0, state: OfferState.Maxed }
    const mark = (ownedMark + 1) as Mark
    const cost = card.mark(mark).unlockPoints
    const needsRank = card.minRankFor(mark)
    if (profile.rank < needsRank) return { card, ownedMark, mark, cost, state: OfferState.RankLocked, needsRank }
    if (profile.points < cost) return { card, ownedMark, mark, cost, state: OfferState.TooExpensive, shortBy: cost - profile.points }
    return { card, ownedMark, mark, cost, state: OfferState.Available }
  }

  canBuy(profile: Profile, moduleId: string): boolean {
    return this.catalog.has(moduleId) && this.offer(profile, this.catalog.get(moduleId)).state === OfferState.Available
  }

  buy(profile: Profile, moduleId: string): Profile {
    if (!this.canBuy(profile, moduleId)) throw new Error(`Cannot unlock ${moduleId}`)
    const offer = this.offer(profile, this.catalog.get(moduleId))
    return profile.afterUnlock(moduleId, offer.mark!, offer.cost)
  }
}
