import { test } from 'vitest'
import { GameData } from '../../src/Data/GameData'
import { Campaign, type CampaignFlight } from '../../src/Engine/Bots/Campaign'
import { CautiousBot } from '../../src/Engine/Bots/CautiousBot'
import { GreedyBot } from '../../src/Engine/Bots/GreedyBot'
import { PlannerBot } from '../../src/Engine/Bots/PlannerBot'
import { PurchaseStudy } from '../../src/Engine/Bots/PurchaseStudy'
import { Rank } from '../../src/Engine/Progress/Rank'
import { Flight } from '../../src/Engine/Flight/Flight'

const campaigns = Number(process.env.CAMPAIGNS ?? 30)
const flySeeds = Array.from({ length: Number(process.env.FLY ?? 40) }, (_, index) => 5000 + index)
const pct = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`

function summarise(name: string, logs: CampaignFlight[][]): void {
  const weeks = GameData.weeks.all
  console.log(`\n== ${name}: ${logs.length} campaigns, thresholds ${Rank.thresholds.join('/')}, weeks ${weeks.map((week) => `${week.id}@${week.minRank}`).join(' ')}`)
  for (let flight = 0; flight < logs[0].length; flight++) {
    const rows = logs.map((log) => log[flight])
    const banked = rows.map((row) => row.banked)
    const byWeek = new Map<string, number>()
    rows.forEach((row) => byWeek.set(row.weekId, (byWeek.get(row.weekId) ?? 0) + 1))
    const lost = rows.filter((row) => !row.survived).length
    const ranks = new Map<number, number>()
    rows.forEach((row) => ranks.set(row.rank, (ranks.get(row.rank) ?? 0) + 1))
    console.log(`flight ${flight + 1}: banked mean ${(banked.reduce((a, b) => a + b, 0) / banked.length).toFixed(0)} min ${Math.min(...banked)} max ${Math.max(...banked)} | lost ${lost} | weeks ${[...byWeek].map(([id, n]) => `${id}:${n}`).join(' ')} | rank after ${[...ranks].sort((a, b) => a[0] - b[0]).map(([r, n]) => `${r}:${n}`).join(' ')} | lifetime mean ${(rows.reduce((a, row) => a + row.lifetime, 0) / rows.length).toFixed(0)}`)
  }
  for (const week of weeks) {
    const opens = logs.map((log) => {
      if (week.minRank <= 1) return 1
      const index = log.findIndex((row) => row.rank >= week.minRank)
      return index < 0 ? 99 : index + 2
    })
    const counts = new Map<number, number>()
    opens.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
    console.log(`${week.id} first flyable on flight: ${[...counts].sort((a, b) => a[0] - b[0]).map(([f, n]) => `${f === 99 ? '>6' : f}:${n}`).join(' ')}`)
  }
  const sample = logs[0]
  for (const row of sample) console.log(`  e.g. ${row.flight} ${row.weekId} ${row.banked}${row.survived ? '' : ' LOST'} r${row.rank} [${row.loadout}] bought ${row.bought.join(', ')}`)
}

test('campaigns and purchases', () => {
  GameData.install()
  const careful = new PlannerBot()
  const cautious = new CautiousBot()
  const greedy = new GreedyBot()
  const carefulLogs: CampaignFlight[][] = []
  const carelessLogs: CampaignFlight[][] = []
  const flights = Number(process.env.FLIGHTS ?? 5)
  const carefulCampaign = (seed: number) => new Campaign(careful, { flights, seed, searchSeeds: [1, 2, 3], priorities: Campaign.carefulPriorities, weekChoice: Campaign.newestShieldedWeek, scout: cautious, shortlist: 5 }, GameData.weeks)
  const carelessCampaign = (seed: number) => new Campaign(greedy, { flights, seed, searchSeeds: [1, 2], priorities: Campaign.defaultPriorities, weekChoice: Campaign.newestWeek }, GameData.weeks)
  for (let seed = 1; seed <= campaigns; seed++) {
    carefulLogs.push(carefulCampaign(seed).run())
    carelessLogs.push(carelessCampaign(seed).run())
  }
  summarise('Careful (Planner flies, buys radar then shield, avoids May without a shield)', carefulLogs)
  summarise('Careless (Greedy flies, default priorities, always newest week)', carelessLogs)

  const may = GameData.weeks.get('MayTwentyFour')
  const maySeeds = Array.from({ length: 100 }, (_, index) => 9000 + index)
  const firstMay = carefulLogs.map((log) => log.find((row) => row.weekId === may.id)).filter((row) => row !== undefined)
  const fits = new Map<string, { count: number; loadout: CampaignFlight['fitted'] }>()
  firstMay.forEach((row) => fits.set(row.loadout, { count: (fits.get(row.loadout)?.count ?? 0) + 1, loadout: row.fitted }))
  console.log(`\n== First May flight of each careful campaign: ${firstMay.length} flown, ${firstMay.filter((row) => !row.survived).length} lost, mean banked ${(firstMay.reduce((a, row) => a + row.banked, 0) / Math.max(1, firstMay.length)).toFixed(0)}, on flight ${firstMay.map((row) => row.flight).join(',')}`)
  const carelessFirstMay = carelessLogs.map((log) => log.find((row) => row.weekId === may.id)).filter((row) => row !== undefined)
  console.log(`== First May flight of each careless campaign: ${carelessFirstMay.length} flown, ${carelessFirstMay.filter((row) => !row.survived).length} lost, mean banked ${(carelessFirstMay.reduce((a, row) => a + row.banked, 0) / Math.max(1, carelessFirstMay.length)).toFixed(0)}`)
  for (const [fit, { count, loadout }] of fits) {
    const cells = [careful, cautious, greedy].map((bot) => {
      const reports = maySeeds.map((seed) => bot.fly(Flight.setup(loadout, may, seed)).report)
      return `${bot.constructor.name} ${(reports.reduce((a, r) => a + r.pointsBanked, 0) / reports.length).toFixed(0)} pts ${((reports.filter((r) => r.survived).length / reports.length) * 100).toFixed(0)}% done`
    })
    console.log(`  ${count}x [${fit}] ${cells.join(' | ')}`)
  }
  if (process.env.PURCHASES === '0') return
  const studyCareful = new PurchaseStudy(careful, cautious, [1, 2, 3, 4], flySeeds, 8)
  const studyCareless = new PurchaseStudy(greedy, greedy, [1, 2, 3, 4], flySeeds, 8)
  const median = (logs: CampaignFlight[][], index: number) => [...logs].sort((a, b) => a[index].lifetime - b[index].lifetime)[Math.floor(logs.length / 2)][index]
  for (const index of (process.env.AFTER ?? '0,1').split(',').map(Number)) {
    const row = median(carefulLogs, index)
    const profile = row.earned
    console.log(`\n== Purchases after flight ${index + 1} (median careful profile: ${profile.points} points, rank ${profile.rank})`)
    const open = GameData.weeks.availableAt(profile.rank)
    for (const offer of studyCareful.offers(profile)) {
      const cells = open.map((week) => {
        const a = studyCareful.value(profile, offer.card.id, week)
        const b = studyCareless.value(profile, offer.card.id, week)
        return `${week.id} careful ${a.without.mean.toFixed(0)}→${a.with.mean.toFixed(0)} ${pct(a.gain)} (done ${(a.without.completed * 100).toFixed(0)}→${(a.with.completed * 100).toFixed(0)}%) careless ${pct(b.gain)} (done ${(b.without.completed * 100).toFixed(0)}→${(b.with.completed * 100).toFixed(0)}%)`
      })
      console.log(`${offer.card.id} ${offer.mark} (${offer.cost}): ${cells.join(' | ')}`)
    }
  }
})
