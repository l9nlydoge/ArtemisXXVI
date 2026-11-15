import { Flight } from '../Flight/Flight'
import type { EngineOptions } from '../Flight/EngineOptions'
import { Instrument } from '../Modules/Instrument'
import type { Mark } from '../Modules/MarkSpec'
import type { ModuleCard } from '../Modules/ModuleCard'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import type { Bus } from '../Spacecraft/Bus'
import { InstalledModule } from '../Spacecraft/InstalledModule'
import { Loadout } from '../Spacecraft/Loadout'
import type { Ownership } from '../Spacecraft/LoadoutIssue'
import type { Week } from '../Weeks/Week'
import type { FlightBot } from './FlightBot'

export interface LoadoutScore {
  loadout: Loadout
  mean: number
  completed: number
}

export class LoadoutSearch {
  constructor(
    private readonly owner: Ownership,
    private readonly catalog: ModuleCatalog = ModuleCatalog.shared,
  ) {}

  static describe(loadout: Loadout): string {
    return loadout.installed.map((module) => `${module.card.id}${['', ' I', ' II', ' III'][module.mark]}`).join(', ')
  }

  static modules(loadout: Loadout): Set<string> {
    return new Set(loadout.installed.map((module) => module.card.id))
  }

  private ownedMarks(card: ModuleCard): Mark[] {
    return ([1, 2, 3] as Mark[]).filter((mark) => this.owner.owns(card.id, mark) && this.owner.rank >= card.minRankFor(mark))
  }

  candidates(bus: Bus, include: (card: ModuleCard) => boolean = () => true): Loadout[] {
    const cards = this.catalog.all.filter((card) => card.isObtainable && include(card) && this.ownedMarks(card).length > 0)
    const slots: { card: ModuleCard; copy: number }[] = cards.flatMap((card) => Array.from({ length: card.maxCopies }, (_, index) => ({ card, copy: index + 1 })))
    const found: Loadout[] = []
    const chosen: InstalledModule[] = []
    const walk = (index: number, cost: number, bay: number) => {
      if (index === slots.length) {
        if (!chosen.some((module) => module.card instanceof Instrument)) return
        if (!this.isMaximal(bus, chosen, cost, bay, slots)) return
        found.push(new Loadout(bus, [...chosen], this.catalog))
        return
      }
      const { card, copy } = slots[index]
      const previous = chosen.find((module) => module.card === card && module.copy === copy - 1)
      if (copy > 1 && !previous) {
        walk(index + 1, cost, bay)
        return
      }
      walk(index + 1, cost, bay)
      for (const mark of this.ownedMarks(card)) {
        if (previous && mark > previous.mark) continue
        const spec = card.mark(mark)
        if (cost + spec.costMusd > bus.budgetMusd || bay + spec.bayUnits > bus.bayUnits) continue
        chosen.push(new InstalledModule(card, mark, copy))
        walk(index + 1, cost + spec.costMusd, bay + spec.bayUnits)
        chosen.pop()
      }
    }
    walk(0, 0, 0)
    return found
  }

  private isMaximal(bus: Bus, chosen: readonly InstalledModule[], cost: number, bay: number, slots: readonly { card: ModuleCard; copy: number }[]): boolean {
    const fits = (extraCost: number, extraBay: number) => cost + extraCost <= bus.budgetMusd && bay + extraBay <= bus.bayUnits
    for (const slot of slots) {
      const here = chosen.find((module) => module.card === slot.card && module.copy === slot.copy)
      if (!here) {
        const before = slot.copy === 1 || chosen.some((module) => module.card === slot.card && module.copy === slot.copy - 1)
        const low = this.ownedMarks(slot.card)[0]
        if (before && fits(slot.card.mark(low).costMusd, slot.card.mark(low).bayUnits)) return false
      }
    }
    return true
  }

  static evaluate(bot: FlightBot, loadout: Loadout, week: Week, seeds: readonly number[], options: EngineOptions = {}, cooldowns = false): LoadoutScore {
    let total = 0
    let completed = 0
    for (const seed of seeds) {
      const { report } = bot.fly(Flight.setup(loadout, week, seed, cooldowns), options)
      total += report.pointsBanked
      if (report.survived) completed += 1
    }
    return { loadout, mean: total / seeds.length, completed: completed / seeds.length }
  }

  best(bot: FlightBot, bus: Bus, week: Week, seeds: readonly number[], options: EngineOptions = {}, include?: (card: ModuleCard) => boolean, cooldowns = false): LoadoutScore[] {
    return this.candidates(bus, include)
      .map((loadout) => LoadoutSearch.evaluate(bot, loadout, week, seeds, options, cooldowns))
      .sort((a, b) => b.mean - a.mean)
  }
}
