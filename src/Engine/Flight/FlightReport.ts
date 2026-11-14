import { Rules } from '../Core/Rules'
import type { EncounterResult } from './EncounterResult'

export enum FlightOutcome {
  Completed = 'Completed',
  Lost = 'Lost',
}

export interface FlightLoss {
  legIndex: number
  eventId: string
  radiation: number
  shielding: number
  hadActiveShield: boolean
}

export interface ModuleMiss {
  moduleId: string
  points: number
  count: number
}

export class FlightReport {
  readonly pointsEarned: number
  readonly pointsBanked: number
  readonly misses: readonly ModuleMiss[]

  constructor(
    readonly outcome: FlightOutcome,
    readonly encounters: readonly EncounterResult[],
    readonly hullLeft: number,
    readonly legsFlown: number,
    readonly loss?: FlightLoss,
  ) {
    this.pointsEarned = encounters.reduce((sum, encounter) => sum + encounter.points, 0)
    this.pointsBanked = outcome === FlightOutcome.Completed ? this.pointsEarned : Math.floor(this.pointsEarned * Rules.lostShare)
    const byModule = new Map<string, ModuleMiss>()
    for (const encounter of encounters) {
      for (const missed of encounter.missed) {
        const entry = byModule.get(missed.moduleId) ?? { moduleId: missed.moduleId, points: 0, count: 0 }
        byModule.set(missed.moduleId, { moduleId: missed.moduleId, points: entry.points + missed.points, count: entry.count + 1 })
      }
    }
    this.misses = [...byModule.values()].sort((a, b) => b.points - a.points)
  }

  get survived(): boolean {
    return this.outcome === FlightOutcome.Completed
  }

  get biggestMiss(): ModuleMiss | undefined {
    return this.misses[0]
  }

  get pointsMissed(): number {
    return this.misses.reduce((sum, miss) => sum + miss.points, 0)
  }

  get completeCount(): number {
    return this.encounters.filter((encounter) => encounter.complete).length
  }
}
