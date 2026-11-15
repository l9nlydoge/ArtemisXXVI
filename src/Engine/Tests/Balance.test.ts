import { beforeAll, describe, expect, test } from 'vitest'
import { GameData } from '../../Data/GameData'
import { Campaign } from '../Bots/Campaign'
import { CautiousBot } from '../Bots/CautiousBot'
import type { FlightBot } from '../Bots/FlightBot'
import { GreedyBot } from '../Bots/GreedyBot'
import { LoadoutSearch, type LoadoutScore } from '../Bots/LoadoutSearch'
import { PlannerBot } from '../Bots/PlannerBot'
import { Flight } from '../Flight/Flight'
import type { FlightReport } from '../Flight/FlightReport'
import type { Mark } from '../Modules/MarkSpec'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import type { Ownership } from '../Spacecraft/LoadoutIssue'
import { BusCatalog } from '../Spacecraft/BusCatalog'
import { Loadout } from '../Spacecraft/Loadout'
import { WeekCatalog } from '../Weeks/WeekCatalog'

const seeds = Array.from({ length: 300 }, (_, index) => index + 1)
const searchSeeds = [101, 102, 103, 104]
const week = (id: string) => GameData.weeks.get(id)
const greedy = new GreedyBot()
const cautious = new CautiousBot()

function fly(bot: FlightBot, loadout: Loadout, weekId: string, count = seeds.length): FlightReport[] {
  return seeds.slice(0, count).map((seed) => bot.fly(Flight.setup(loadout, week(weekId), seed)).report)
}

const mean = (reports: FlightReport[]) => reports.reduce((sum, report) => sum + report.pointsBanked, 0) / reports.length
const completed = (reports: FlightReport[]) => reports.filter((report) => report.survived).length / reports.length

function build(busId: string, modules: [string, Mark][]): Loadout {
  return modules.reduce((loadout, [id, mark]) => loadout.install(ModuleCatalog.shared.get(id), mark), new Loadout(BusCatalog.shared.get(busId), []))
}

function everyMarkOne(rank: number): Ownership {
  return { rank, owns: (_id: string, mark: number) => mark === 1 }
}

const searches: Record<string, { busId: string; rank: number }> = {
  JulyNineteen: { busId: 'SmallSat', rank: 1 },
  AutumnTwentyTwo: { busId: 'SmallSat', rank: 2 },
  MayTwentyFour: { busId: 'Explorer', rank: 4 },
}
const ranked: Record<string, LoadoutScore[]> = {}

function starterAnd(extra: string): Ownership {
  const starters = new Set(ModuleCatalog.shared.starters.map((card) => card.id))
  return { rank: 2, owns: (id: string, mark: number) => mark === 1 && (starters.has(id) || id === extra) }
}

function bestFlown(bot: FlightBot, owner: Ownership, weekId: string): number {
  const candidates = new LoadoutSearch(owner).candidates(BusCatalog.shared.get('SmallSat'))
  const best = candidates.map((loadout) => LoadoutSearch.evaluate(bot, loadout, week(weekId), searchSeeds)).sort((a, b) => b.mean - a.mean)[0]
  return mean(fly(bot, best.loadout, weekId, 60))
}

function instrumentShares(loadout: Loadout, weekId: string): Map<string, number> {
  const byChannel = new Map<string, number>()
  for (const report of fly(cautious, loadout, weekId, 40)) {
    for (const encounter of report.encounters) {
      const event = week(weekId).events.find((each) => each.id === encounter.eventId)
      for (const [channel, amount] of encounter.recorded) byChannel.set(channel, (byChannel.get(channel) ?? 0) + amount * (event?.rarity ?? 1))
    }
  }
  const total = [...byChannel.values()].reduce((sum, value) => sum + value, 0)
  return new Map([...byChannel].map(([channel, value]) => [channel, value / total]))
}

beforeAll(() => {
  GameData.install()
  for (const [weekId, { busId, rank }] of Object.entries(searches)) {
    ranked[weekId] = new LoadoutSearch(everyMarkOne(rank)).best(cautious, BusCatalog.shared.get(busId), week(weekId), searchSeeds)
  }
})

describe('Balance on the real weeks (spec 13.2, as adjusted in GameDesign.md)', () => {
  test('B1: the starter completes July 2019 and banks 90 to 170 points', () => {
    const reports = fly(greedy, Loadout.starter(), 'JulyNineteen')
    expect(completed(reports)).toBeGreaterThanOrEqual(0.95)
    expect(mean(reports)).toBeGreaterThan(90)
    expect(mean(reports)).toBeLessThan(170)
  })

  test('B1a: nothing kills a spacecraft on the calm week, shielded or not', () => {
    const unshielded = build('SmallSat', [['SolarArray', 1], ['Camera', 1], ['Spectrometer', 1], ['Radar', 1]])
    for (const loadout of [Loadout.starter(), unshielded]) expect(completed(fly(greedy, loadout, 'JulyNineteen'))).toBe(1)
  })

  test('B1b: on the first flight, a player who spends power with care earns at least 20% more than one who presses everything', () => {
    const careful = mean(fly(new PlannerBot(), Loadout.starter(), 'JulyNineteen', 60))
    const pressing = mean(fly(greedy, Loadout.starter(), 'JulyNineteen', 60))
    expect(careful).toBeGreaterThan(pressing * 1.2)
  })

  test('B2: the starter is lost in May 2024', () => {
    expect(1 - completed(fly(greedy, Loadout.starter(), 'MayTwentyFour'))).toBeGreaterThanOrEqual(0.9)
  })

  test('B3: the best Explorer without a magnetic shield is lost in May 2024', () => {
    const best = ranked.MayTwentyFour.find((score) => !score.loadout.has('MagneticShield'))!
    expect(1 - completed(fly(cautious, best.loadout, 'MayTwentyFour'))).toBeGreaterThanOrEqual(0.6)
  })

  test('B4: an Explorer with a magnetic shield, flown with care, completes May 2024', () => {
    const kit = build('Explorer', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['ParticleDetector', 1], ['HighEnergyDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1]])
    expect(completed(fly(cautious, kit, 'MayTwentyFour'))).toBeGreaterThanOrEqual(0.85)
  })

  test('B4a: May 2024 is not safe for a player who spends the shield power on instruments', () => {
    const kit = build('Explorer', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['ParticleDetector', 1], ['HighEnergyDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1]])
    expect(completed(fly(greedy, kit, 'MayTwentyFour'))).toBeLessThan(0.6)
  })

  test('B5: the best loadout for each week differs from the best for every other week in at least two modules', () => {
    const best = Object.fromEntries(Object.entries(ranked).map(([weekId, scores]) => [weekId, LoadoutSearch.modules(scores[0].loadout)]))
    const ids = Object.keys(best)
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue
        const differ = [...best[a]].filter((id) => !best[b].has(id)).length + [...best[b]].filter((id) => !best[a].has(id)).length
        expect(differ, `${a} against ${b}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  test('B6: no instrument earns more than 60% of the data in the best Explorer loadout, or 80% on the small spacecraft', () => {
    for (const [weekId, scores] of Object.entries(ranked)) {
      const limit = scores[0].loadout.bus.id === 'SmallSat' ? 0.8 : 0.6
      for (const [channel, share] of instrumentShares(scores[0].loadout, weekId)) expect(share, `${weekId} ${channel}`).toBeLessThanOrEqual(limit)
    }
  })

  test('B7: a player following the greedy bot reaches rank 2 within 2 flights and rank 3 within 5', () => {
    const log = new Campaign(greedy, { flights: 5, seed: 7, searchSeeds: [1, 2], priorities: Campaign.defaultPriorities, weekChoice: Campaign.newestWeek }, WeekCatalog.shared).run()
    expect(log[1].rank).toBeGreaterThanOrEqual(2)
    expect(log[4].rank).toBeGreaterThanOrEqual(3)
  })

  test('B8: every module the lab sells by rank 2 appears in some week\'s top five loadouts', () => {
    const seen = new Set(Object.values(ranked).flatMap((scores) => scores.slice(0, 5).flatMap((score) => [...LoadoutSearch.modules(score.loadout)])))
    const sold = ModuleCatalog.shared.all.filter((card) => card.isObtainable && card.minRank <= 2).map((card) => card.id)
    expect(sold.filter((id) => !seen.has(id))).toEqual([])
  })

  test('B9: buying the radar after flight one earns a careful player at least 15% more on flight two, about one more fully recorded asteroid', () => {
    const planner = new PlannerBot()
    for (const [weekId, margin] of [['AutumnTwentyTwo', 1.15], ['JulyNineteen', 1.05]] as const) {
      const without = bestFlown(planner, starterAnd(''), weekId)
      const withRadar = bestFlown(planner, starterAnd('Radar'), weekId)
      expect(withRadar, weekId).toBeGreaterThan(without * margin)
    }
    expect(bestFlown(greedy, starterAnd('Radar'), 'AutumnTwentyTwo')).toBeGreaterThan(bestFlown(greedy, starterAnd(''), 'AutumnTwentyTwo') * 1.15)
  })
})
