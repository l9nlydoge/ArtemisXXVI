import type { SpaceEvent } from '../Events/SpaceEvent'
import { WeekCatalog } from '../Weeks/WeekCatalog'
import type { LogbookMark, Profile } from './Profile'

export interface LogbookEntry extends LogbookMark {
  event: SpaceEvent
  weekIds: readonly string[]
}

export interface LogbookTotals {
  recorded: number
  complete: number
  total: number
}

export class Logbook {
  readonly entries: readonly LogbookEntry[]

  constructor(profile: Profile, weeks: WeekCatalog = WeekCatalog.shared) {
    const byId = new Map<string, { event: SpaceEvent; weekIds: string[] }>()
    for (const week of weeks.availableAt(profile.rank)) {
      for (const event of week.everything) {
        const entry = byId.get(event.id) ?? { event, weekIds: [] }
        entry.weekIds.push(week.id)
        byId.set(event.id, entry)
      }
    }
    this.entries = [...byId.values()].map((entry) => ({ ...entry, ...profile.logged(entry.event.id) }))
  }

  get totals(): LogbookTotals {
    return {
      recorded: this.entries.filter((entry) => entry.recorded).length,
      complete: this.entries.filter((entry) => entry.complete).length,
      total: this.entries.length,
    }
  }

  inWeek(weekId: string): LogbookEntry[] {
    return this.entries.filter((entry) => entry.weekIds.includes(weekId))
  }
}
