import { Catalog } from '../Engine/Catalog/Catalog'
import type { Orbit } from '../Engine/Catalog/Orbit'

export class ScenarioArt {
  private static readonly art: Record<string, [string, number, number]> = {
    CropWatch: ['Sso705', 2, 5],
    StormChaser: ['Leo450', 6, 3],
  }

  private constructor(
    readonly orbit: Orbit,
    readonly copies: number,
    readonly stations: number,
  ) {}

  static of(scenarioId: string): ScenarioArt {
    const [orbitId, copies, stations] = ScenarioArt.art[scenarioId] ?? ['Leo450', 1, 1]
    return new ScenarioArt(Catalog.shared.orbits.get(orbitId), copies, stations)
  }
}
