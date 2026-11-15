import { Flight } from '../Flight/Flight'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { Lab, OfferState, type LabOffer } from '../Progress/Lab'
import type { Profile } from '../Progress/Profile'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import type { Loadout } from '../Spacecraft/Loadout'
import type { Week } from '../Weeks/Week'
import type { FlightBot } from './FlightBot'
import { LoadoutSearch } from './LoadoutSearch'

export interface NextFlight {
  loadout: Loadout
  mean: number
  completed: number
}

export interface PurchaseValue {
  moduleId: string
  mark: number
  weekId: string
  without: NextFlight
  with: NextFlight
  gain: number
}

export class PurchaseStudy {
  private readonly known = new Map<string, NextFlight>()
  private readonly lab = new Lab()

  constructor(
    private readonly bot: FlightBot,
    private readonly scout: FlightBot,
    private readonly searchSeeds: readonly number[],
    private readonly flySeeds: readonly number[],
    private readonly shortlist = 16,
  ) {}

  offers(profile: Profile): LabOffer[] {
    return this.lab.offers(profile).filter((offer) => offer.state === OfferState.Available)
  }

  nextFlight(profile: Profile, week: Week): NextFlight {
    const bus = BusCatalog.shared.largestFor(profile.rank)
    const owned = ModuleCatalog.shared.all.map((card) => profile.ownedMark(card.id)).join('')
    const key = `${bus.id}|${week.id}|${profile.rank}|${owned}`
    const cached = this.known.get(key)
    if (cached) return cached
    const best = LoadoutSearch.shortlisted(new LoadoutSearch(profile).candidates(bus), this.bot, this.scout, week, this.searchSeeds, this.shortlist)
    let total = 0
    let completed = 0
    for (const seed of this.flySeeds) {
      const { report } = this.bot.fly(Flight.setup(best, week, seed), { owner: profile })
      total += report.pointsBanked
      if (report.survived) completed += 1
    }
    const result = { loadout: best, mean: total / this.flySeeds.length, completed: completed / this.flySeeds.length }
    this.known.set(key, result)
    return result
  }

  value(profile: Profile, moduleId: string, week: Week): PurchaseValue {
    const offer = this.lab.offer(profile, ModuleCatalog.shared.get(moduleId))
    const without = this.nextFlight(profile, week)
    const bought = this.nextFlight(this.lab.buy(profile, moduleId), week)
    const after = bought.mean >= without.mean ? bought : without
    return { moduleId, mark: offer.mark ?? 0, weekId: week.id, without, with: after, gain: without.mean > 0 ? after.mean / without.mean - 1 : after.mean > 0 ? Number.POSITIVE_INFINITY : 0 }
  }
}
