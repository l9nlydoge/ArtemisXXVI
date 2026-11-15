import type { EngineOptions } from '../Flight/EngineOptions'
import { Flight } from '../Flight/Flight'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { Lab, OfferState } from '../Progress/Lab'
import { Profile } from '../Progress/Profile'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import type { Loadout } from '../Spacecraft/Loadout'
import type { Week } from '../Weeks/Week'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import type { FlightBot } from './FlightBot'
import { LoadoutSearch } from './LoadoutSearch'

export interface CampaignFlight {
  flight: number
  weekId: string
  loadout: string
  banked: number
  survived: boolean
  lifetime: number
  rank: number
  bought: string[]
}

export interface CampaignSettings {
  flights: number
  seed: number
  searchSeeds: readonly number[]
  priorities: readonly string[]
  weekChoice: (weeks: readonly Week[], profile: Profile) => Week
}

export class Campaign {
  static readonly defaultPriorities = ['Spectrometer', 'Radar', 'MagneticShield', 'FlightComputer', 'HighEnergyDetector', 'SolarArray', 'Battery', 'Camera', 'ParticleDetector', 'RadiationShielding', 'Antenna', 'Thrusters', 'RepairDrone']

  static newestWeek(weeks: readonly Week[]): Week {
    return weeks[weeks.length - 1]
  }

  constructor(
    private readonly bot: FlightBot,
    private readonly settings: CampaignSettings,
    private readonly weeks: WeekCatalog = WeekCatalog.shared,
    private readonly options: EngineOptions = {},
  ) {}

  run(): CampaignFlight[] {
    let profile = Profile.starter()
    const lab = new Lab()
    const log: CampaignFlight[] = []
    let bought: string[] = []
    for (let index = 0; index < this.settings.flights; index++) {
      const week = this.settings.weekChoice(this.weeks.availableAt(profile.rank), profile)
      const loadout = this.bestLoadout(profile, week)
      const { report } = this.bot.fly(Flight.setup(loadout, week, this.settings.seed * 1000 + index), { ...this.options, owner: profile })
      profile = profile.afterFlight(report, loadout)
      log.push({ flight: index + 1, weekId: week.id, loadout: LoadoutSearch.describe(loadout), banked: report.pointsBanked, survived: report.survived, lifetime: profile.lifetimePoints, rank: profile.rank, bought })
      bought = []
      let progress = true
      while (progress) {
        progress = false
        for (const id of this.settings.priorities) {
          const offer = lab.offer(profile, ModuleCatalog.shared.get(id))
          if (offer.state === OfferState.Available) {
            profile = lab.buy(profile, id)
            bought.push(`${id} ${offer.mark}`)
            progress = true
            break
          }
          if (offer.state === OfferState.TooExpensive && offer.ownedMark === 0) break
        }
      }
      if (bought.length > 0) log[log.length - 1].bought = bought
    }
    return log
  }

  bestLoadout(profile: Profile, week: Week): Loadout {
    const bus = BusCatalog.shared.largestFor(profile.rank)
    const search = new LoadoutSearch(profile)
    const candidates = search.candidates(bus)
    let best: { loadout: Loadout; mean: number } | undefined
    for (const loadout of candidates) {
      const score = LoadoutSearch.evaluate(this.bot, loadout, week, this.settings.searchSeeds, this.options)
      if (!best || score.mean > best.mean) best = score
    }
    return best!.loadout
  }
}
