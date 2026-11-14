import type { SimulationResult } from '../Engine/Simulation/SimulationResult'

export interface MissionRecord {
  number: number
  scenarioId: string
  scenarioName: string
  orbitId: string
  copies: number
  stars: number
  score: number
  costMusd: number
  seed: number
  flownAt: number
}

export class MissionArchive {
  private static readonly storageKey = 'Artemis26.Missions'
  private static readonly limit = 24

  static all(): MissionRecord[] {
    try {
      const raw = localStorage.getItem(MissionArchive.storageKey)
      return raw ? (JSON.parse(raw) as MissionRecord[]) : []
    } catch {
      return []
    }
  }

  static record(result: SimulationResult): MissionRecord | undefined {
    if (!result.succeeded) return undefined
    const records = MissionArchive.all()
    const existing = records.find((record) => record.seed === result.seed && record.scenarioId === result.design.scenario.id)
    if (existing) return existing
    const record: MissionRecord = {
      number: (records[0]?.number ?? 0) + 1,
      scenarioId: result.design.scenario.id,
      scenarioName: result.design.scenario.name,
      orbitId: result.design.orbit.id,
      copies: result.design.copies,
      stars: result.rating.stars,
      score: Math.round(result.score),
      costMusd: Math.round(result.costMusd),
      seed: result.seed,
      flownAt: Date.now(),
    }
    try {
      localStorage.setItem(MissionArchive.storageKey, JSON.stringify([record, ...records].slice(0, MissionArchive.limit)))
    } catch {
      return record
    }
    return record
  }
}
