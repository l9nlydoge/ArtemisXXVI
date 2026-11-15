import { test } from 'vitest'
import { GameData } from '../../src/Data/GameData'
import { CautiousBot } from '../../src/Engine/Bots/CautiousBot'
import type { FlightBot } from '../../src/Engine/Bots/FlightBot'
import { GreedyBot } from '../../src/Engine/Bots/GreedyBot'
import { PlannerBot } from '../../src/Engine/Bots/PlannerBot'
import { Flight } from '../../src/Engine/Flight/Flight'
import type { Mark } from '../../src/Engine/Modules/MarkSpec'
import { ModuleCatalog } from '../../src/Engine/Modules/ModuleCatalog'
import { BusCatalog } from '../../src/Engine/Spacecraft/BusCatalog'
import { Loadout } from '../../src/Engine/Spacecraft/Loadout'

const seeds = Array.from({ length: Number(process.env.FLY ?? 150) }, (_, index) => 7000 + index)

function build(busId: string, modules: [string, Mark][]): Loadout {
  return modules.reduce((loadout, [id, mark]) => loadout.install(ModuleCatalog.shared.get(id), mark), new Loadout(BusCatalog.shared.get(busId), []))
}

function measure(bot: FlightBot, loadout: Loadout, weekId: string): string {
  let total = 0
  let done = 0
  for (const seed of seeds) {
    const { report } = bot.fly(Flight.setup(loadout, GameData.weeks.get(weekId), seed))
    total += report.pointsBanked
    if (report.survived) done += 1
  }
  return `${(total / seeds.length).toFixed(1)} (${((done / seeds.length) * 100).toFixed(0)}%)`
}

test('what the flight computer is worth when nothing else changes', () => {
  GameData.install()
  const kits: [string, string, [string, Mark][]][] = [
    ['JulyNineteen', 'SmallSat', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['Spectrometer', 1]]],
    ['AutumnTwentyTwo', 'SmallSat', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['Radar', 1]]],
    ['JulyNineteen', 'Explorer', [['SolarArray', 1], ['SolarArray', 1], ['Battery', 1], ['Battery', 1], ['Camera', 1], ['Spectrometer', 1], ['Radar', 1]]],
    ['AutumnTwentyTwo', 'Explorer', [['SolarArray', 1], ['SolarArray', 1], ['Battery', 1], ['Battery', 1], ['Camera', 1], ['Spectrometer', 1], ['Radar', 1]]],
    ['MayTwentyFour', 'Explorer', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['ParticleDetector', 1], ['HighEnergyDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1]]],
  ]
  const bots: [string, FlightBot][] = [['Planner', new PlannerBot()], ['Cautious', new CautiousBot()], ['Greedy', new GreedyBot()]]
  for (const [weekId, busId, modules] of kits) {
    const base = build(busId, modules)
    const rows = bots.map(([name, bot]) => {
      const cells = [measure(bot, base, weekId)]
      for (const mark of [1, 2, 3] as Mark[]) cells.push(measure(bot, build(busId, [...modules, ['FlightComputer', mark]]), weekId))
      return `${name}: none ${cells[0]} | I ${cells[1]} | II ${cells[2]} | III ${cells[3]}`
    })
    console.log(`\n${weekId} ${busId} ${modules.map(([id]) => id).join(',')}\n  ${rows.join('\n  ')}`)
  }
})
