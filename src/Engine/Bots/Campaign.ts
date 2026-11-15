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
  fitted: Loadout
  banked: number
  survived: boolean
  lifetime: number
  rank: number
  bought: string[]
  earned: Profile
  profile: Profile
}

export interface CampaignSettings {
  flights: number
  seed: number
  searchSeeds: readonly number[]
  priorities: readonly string[]
  weekChoice: (weeks: readonly Week[], profile: Profile) => Week
  scout?: FlightBot
  shortlist?: number
}

export class Campaign {
  static readonly defaultPriorities = ['Spectrometer', 'Radar', 'MagneticShield', 'FlightComputer', 'HighEnergyDetector', 'SolarArray', 'Battery', 'Camera', 'ParticleDetector', 'RadiationShielding', 'Antenna', 'Thrusters', 'RepairDrone']
  static readonly carefulPriorities = ['Radar', 'MagneticShield', 'HighEnergyDetector', 'Camera', 'Spectrometer', 'Battery', 'SolarArray', 'RepairDrone', 'Antenna', 'RadiationShielding', 'ParticleDetector', 'FlightComputer', 'Thrusters']

  private readonly chosen = new Map<string, Loadout>()

  static newestWeek(weeks: readonly Week[]): Week {
    return weeks[weeks.length - 1]
  }

  static newestShieldedWeek(weeks: readonly Week[], profile: Profile): Week {
    const flyable = weeks.filter((week) => !week.legs.some((leg) => leg.storm && leg.storm.turns.some((turn) => turn.radiation >= 8)) || profile.owns('MagneticShield'))
    return flyable[flyable.length - 1] ?? weeks[0]
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
    for (let index = 0; index < this.settings.flights; index++) {
      const week = this.settings.weekChoice(this.weeks.availableAt(profile.rank), profile)
      const loadout = this.bestLoadout(profile, week)
      const { report } = this.bot.fly(Flight.setup(loadout, week, this.settings.seed * 1000 + index), { ...this.options, owner: profile })
      profile = profile.afterFlight(report, loadout)
      const earned = profile
      const bought: string[] = []
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
      log.push({ flight: index + 1, weekId: week.id, loadout: LoadoutSearch.describe(loadout), fitted: loadout, banked: report.pointsBanked, survived: report.survived, lifetime: profile.lifetimePoints, rank: profile.rank, bought, earned, profile })
    }
    return log
  }

  bestLoadout(profile: Profile, week: Week): Loadout {
    const bus = BusCatalog.shared.largestFor(profile.rank)
    const owned = ModuleCatalog.shared.all.map((card) => profile.ownedMark(card.id)).join('')
    const key = `${bus.id}|${week.id}|${profile.rank}|${owned}`
    const known = this.chosen.get(key)
    if (known) return known
    const best = LoadoutSearch.shortlisted(new LoadoutSearch(profile).candidates(bus), this.bot, this.settings.scout ?? this.bot, week, this.settings.searchSeeds, this.settings.shortlist ?? 16, this.options)
    this.chosen.set(key, best)
    return best
  }
}
