import type { Flight } from '../../../Engine/Flight/Flight'
import type { Profile } from '../../../Engine/Progress/Profile'
import type { Loadout } from '../../../Engine/Spacecraft/Loadout'
import { LoadoutIssueKind } from '../../../Engine/Spacecraft/LoadoutIssue'
import type { TurnPlan } from '../../../Engine/Flight/TurnPlan'

export interface TurnSnapshot {
  gains: number
  incoming: number
  blocked: number
  repaired: number
  lost: boolean
  encounterOver: boolean
}

export interface FlightSnapshot {
  seed: number
  phase: string
  leg: number
  storm: boolean
  commands: number
  lastCommand?: { type: string; keys?: readonly string[] }
  contacts: number
  inEncounter: boolean
  turnsPlayed: number
  hull: number
  maxHull: number
  charge: number
  capacity: number
  radiation: number
  outcome?: TurnSnapshot
}

export interface GameSnapshot {
  screen: string
  modules: ReadonlyMap<string, number>
  overLimit: boolean
  plan: readonly string[]
  rank: number
  points: number
  lifetimePoints: number
  owned: string
  flight?: FlightSnapshot
}

export interface SnapshotSource {
  screen: string
  loadout: Loadout
  profile: Profile
  plan: TurnPlan
  flight?: Flight
}

export class SnapshotReader {
  static read(state: SnapshotSource): GameSnapshot {
    const issues = state.loadout.issues(state.profile)
    return {
      screen: state.screen,
      modules: new Map(state.loadout.installed.map((module) => [module.key, module.mark])),
      overLimit: issues.some((issue) => issue.kind === LoadoutIssueKind.OverBudget || issue.kind === LoadoutIssueKind.OverBay),
      plan: state.plan.list.sort(),
      rank: state.profile.rank,
      points: state.profile.points,
      lifetimePoints: state.profile.lifetimePoints,
      owned: JSON.stringify(state.profile.toJson().ownedMarks),
      flight: state.flight ? SnapshotReader.flight(state.flight) : undefined,
    }
  }

  private static flight(flight: Flight): FlightSnapshot {
    const encounter = flight.encounter
    const outcome = flight.lastOutcome
    const last = flight.log[flight.log.length - 1]
    return {
      seed: flight.setup.seed,
      phase: flight.phase,
      leg: flight.legIndex,
      storm: flight.isStormLeg,
      commands: flight.log.length,
      lastCommand: last ? { type: last.type, keys: 'keys' in last ? [...last.keys] : undefined } : undefined,
      contacts: flight.contacts.filter((contact) => !contact.played).length,
      inEncounter: encounter !== undefined && !encounter.isOver,
      turnsPlayed: encounter?.turnsPlayed ?? 0,
      hull: flight.state.hull,
      maxHull: flight.craft.maxHull,
      charge: flight.state.charge,
      capacity: flight.craft.capacity,
      radiation: encounter && !encounter.isOver ? encounter.current.radiation : 0,
      outcome: outcome
        ? {
            gains: [...outcome.gains.values()].reduce((sum, gain) => sum + gain, 0),
            incoming: outcome.incoming,
            blocked: outcome.blocked,
            repaired: outcome.repaired,
            lost: outcome.lost,
            encounterOver: outcome.encounterOver,
          }
        : undefined,
    }
  }
}
