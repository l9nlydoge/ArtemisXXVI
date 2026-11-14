import { Instrument } from '../Modules/Instrument'
import type { Mark } from '../Modules/MarkSpec'
import type { ModuleCard } from '../Modules/ModuleCard'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import type { Bus } from './Bus'
import { BusCatalog } from './BusCatalog'
import { InstalledModule } from './InstalledModule'
import { LoadoutIssueKind, type LoadoutIssue, type Ownership } from './LoadoutIssue'

export interface LoadoutJson {
  busId: string
  modules: { id: string; mark: Mark; copy: number }[]
}

export class Loadout {
  readonly installed: readonly InstalledModule[]

  constructor(readonly bus: Bus, installed: readonly InstalledModule[], private readonly catalog: ModuleCatalog = ModuleCatalog.shared) {
    this.installed = [...installed].sort((a, b) => catalog.indexOf(a.card.id) - catalog.indexOf(b.card.id) || a.copy - b.copy)
  }

  static starter(modules: ModuleCatalog = ModuleCatalog.shared, buses: BusCatalog = BusCatalog.shared): Loadout {
    return new Loadout(buses.all[0], modules.starters.map((card) => new InstalledModule(card, 1, 1)), modules)
  }

  static fromJson(json: LoadoutJson, modules: ModuleCatalog = ModuleCatalog.shared, buses: BusCatalog = BusCatalog.shared): Loadout {
    const bus = buses.has(json.busId) ? buses.get(json.busId) : buses.all[0]
    const installed = (json.modules ?? [])
      .filter((entry) => modules.has(entry.id) && [1, 2, 3].includes(entry.mark) && Number.isInteger(entry.copy) && entry.copy >= 1)
      .map((entry) => new InstalledModule(modules.get(entry.id), entry.mark, entry.copy))
    return new Loadout(bus, installed, modules)
  }

  toJson(): LoadoutJson {
    return { busId: this.bus.id, modules: this.installed.map((module) => ({ id: module.card.id, mark: module.mark, copy: module.copy })) }
  }

  get costMusd(): number {
    return this.installed.reduce((sum, module) => sum + module.spec.costMusd, 0)
  }

  get bayUsed(): number {
    return this.installed.reduce((sum, module) => sum + module.spec.bayUnits, 0)
  }

  get budgetLeft(): number {
    return this.bus.budgetMusd - this.costMusd
  }

  get bayLeft(): number {
    return this.bus.bayUnits - this.bayUsed
  }

  copiesOf(cardId: string): InstalledModule[] {
    return this.installed.filter((module) => module.card.id === cardId)
  }

  find(key: string): InstalledModule | undefined {
    return this.installed.find((module) => module.key === key)
  }

  has(cardId: string): boolean {
    return this.copiesOf(cardId).length > 0
  }

  canAdd(card: ModuleCard): boolean {
    return card.isObtainable && this.copiesOf(card.id).length < card.maxCopies
  }

  install(card: ModuleCard, mark: Mark): Loadout {
    const taken = new Set(this.copiesOf(card.id).map((module) => module.copy))
    let copy = 1
    while (taken.has(copy)) copy += 1
    return this.replace([...this.installed, new InstalledModule(card, mark, copy)])
  }

  remove(key: string): Loadout {
    return this.replace(this.installed.filter((module) => module.key !== key))
  }

  setMark(key: string, mark: Mark): Loadout {
    return this.replace(this.installed.map((module) => (module.key === key ? module.withMark(mark) : module)))
  }

  withBus(bus: Bus): Loadout {
    return new Loadout(bus, this.installed, this.catalog)
  }

  issues(owner: Ownership): LoadoutIssue[] {
    const found: LoadoutIssue[] = []
    if (this.bus.minRank > owner.rank) found.push({ kind: LoadoutIssueKind.BusLocked, amount: this.bus.minRank })
    if (this.costMusd > this.bus.budgetMusd) found.push({ kind: LoadoutIssueKind.OverBudget, amount: this.costMusd - this.bus.budgetMusd })
    if (this.bayUsed > this.bus.bayUnits) found.push({ kind: LoadoutIssueKind.OverBay, amount: this.bayUsed - this.bus.bayUnits })
    for (const module of this.installed) {
      if (!owner.owns(module.card.id, module.mark)) found.push({ kind: LoadoutIssueKind.NotOwned, moduleId: module.card.id, amount: module.mark })
    }
    for (const cardId of new Set(this.installed.map((module) => module.card.id))) {
      const copies = this.copiesOf(cardId)
      if (copies.length > copies[0].card.maxCopies) found.push({ kind: LoadoutIssueKind.TooManyCopies, moduleId: cardId, amount: copies[0].card.maxCopies })
    }
    if (!this.installed.some((module) => module.card instanceof Instrument)) found.push({ kind: LoadoutIssueKind.NoInstrument })
    return found
  }

  isValid(owner: Ownership): boolean {
    return this.issues(owner).length === 0
  }

  private replace(installed: readonly InstalledModule[]): Loadout {
    return new Loadout(this.bus, installed, this.catalog)
  }
}
