import type { FlightReport } from '../Flight/FlightReport'
import type { Mark } from '../Modules/MarkSpec'
import { ModuleCatalog } from '../Modules/ModuleCatalog'
import { Loadout, type LoadoutJson } from '../Spacecraft/Loadout'
import type { Ownership } from '../Spacecraft/LoadoutIssue'
import { Rank } from './Rank'

export type OwnedMark = 0 | Mark

export interface LogbookMark {
  recorded: boolean
  complete: boolean
  bestPoints: number
}

export interface ProfileJson {
  version: 1
  points: number
  lifetimePoints: number
  ownedMarks: Record<string, OwnedMark>
  logbook: Record<string, LogbookMark>
  flights: number
  lastLoadout?: LoadoutJson
  hintsSeen: string[]
}

export class Profile implements Ownership {
  static readonly version = 1

  private constructor(private readonly data: ProfileJson) {}

  static starter(catalog: ModuleCatalog = ModuleCatalog.shared): Profile {
    const ownedMarks: Record<string, OwnedMark> = {}
    for (const card of catalog.starters) ownedMarks[card.id] = 1
    return new Profile({ version: 1, points: 0, lifetimePoints: 0, ownedMarks, logbook: {}, flights: 0, hintsSeen: [] })
  }

  static fromJson(json: unknown, catalog: ModuleCatalog = ModuleCatalog.shared): Profile {
    const starter = Profile.starter(catalog)
    if (!Profile.isRecord(json) || json.version !== Profile.version) return starter
    const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0)

    const ownedMarks: Record<string, OwnedMark> = { ...starter.data.ownedMarks }
    if (Profile.isRecord(json.ownedMarks)) {
      for (const [id, mark] of Object.entries(json.ownedMarks)) {
        if (catalog.has(id) && catalog.get(id).isObtainable && (mark === 1 || mark === 2 || mark === 3)) ownedMarks[id] = Math.max(ownedMarks[id] ?? 0, mark) as OwnedMark
      }
    }
    const logbook: Record<string, LogbookMark> = {}
    if (Profile.isRecord(json.logbook)) {
      for (const [id, entry] of Object.entries(json.logbook)) {
        if (id !== '__proto__' && Profile.isRecord(entry)) logbook[id] = { recorded: entry.recorded === true, complete: entry.complete === true, bestPoints: count(entry.bestPoints) }
      }
    }
    const lifetimePoints = count(json.lifetimePoints)
    return new Profile({
      version: 1,
      points: Math.min(count(json.points), lifetimePoints),
      lifetimePoints,
      ownedMarks,
      logbook,
      flights: count(json.flights),
      lastLoadout: Profile.isRecord(json.lastLoadout) && Array.isArray(json.lastLoadout.modules) ? Loadout.fromJson(json.lastLoadout, catalog).toJson() : undefined,
      hintsSeen: Array.isArray(json.hintsSeen) ? json.hintsSeen.filter((hint): hint is string => typeof hint === 'string') : [],
    })
  }

  toJson(): ProfileJson {
    return JSON.parse(JSON.stringify(this.data)) as ProfileJson
  }

  get points(): number {
    return this.data.points
  }

  get lifetimePoints(): number {
    return this.data.lifetimePoints
  }

  get rank(): number {
    return Rank.of(this.data.lifetimePoints)
  }

  get flights(): number {
    return this.data.flights
  }

  get lastLoadout(): LoadoutJson | undefined {
    return this.data.lastLoadout
  }

  ownedMark(moduleId: string): OwnedMark {
    return Object.hasOwn(this.data.ownedMarks, moduleId) ? this.data.ownedMarks[moduleId] : 0
  }

  owns(moduleId: string, mark: number = 1): boolean {
    return this.ownedMark(moduleId) >= mark
  }

  logged(eventId: string): LogbookMark {
    return Object.hasOwn(this.data.logbook, eventId) ? this.data.logbook[eventId] : { recorded: false, complete: false, bestPoints: 0 }
  }

  hasSeen(hint: string): boolean {
    return this.data.hintsSeen.includes(hint)
  }

  withHintSeen(hint: string): Profile {
    return this.hasSeen(hint) ? this : new Profile({ ...this.data, hintsSeen: [...this.data.hintsSeen, hint] })
  }

  withLoadout(loadout: Loadout): Profile {
    return new Profile({ ...this.data, lastLoadout: loadout.toJson() })
  }

  afterFlight(report: FlightReport, loadout: Loadout): Profile {
    const logbook = { ...this.data.logbook }
    for (const encounter of report.encounters) {
      if (!encounter.anyRecorded) continue
      const before = this.logged(encounter.eventId)
      logbook[encounter.eventId] = {
        recorded: true,
        complete: before.complete || encounter.complete,
        bestPoints: Math.max(before.bestPoints, encounter.points),
      }
    }
    return new Profile({
      ...this.data,
      points: this.data.points + report.pointsBanked,
      lifetimePoints: this.data.lifetimePoints + report.pointsBanked,
      logbook,
      flights: this.data.flights + 1,
      lastLoadout: loadout.toJson(),
    })
  }

  afterUnlock(moduleId: string, mark: Mark, cost: number): Profile {
    if (cost > this.data.points) throw new Error(`Not enough points for ${moduleId}`)
    return new Profile({ ...this.data, points: this.data.points - cost, ownedMarks: { ...this.data.ownedMarks, [moduleId]: mark } })
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
