import { Catalog } from '../Catalog/Catalog'
import type { Scenario } from '../Catalog/Scenario'
import { Difficulty } from '../Design/Difficulty'
import { MissionDesign } from '../Design/MissionDesign'
import { MissionSimulator } from './MissionSimulator'
import { SeededRandom } from './SeededRandom'
import type { SimulationResult } from './SimulationResult'

export interface DesignSample {
  design: MissionDesign
  result: SimulationResult
}

export class DesignSampler {
  private readonly simulator = new MissionSimulator()

  constructor(
    private readonly scenario: Scenario,
    private readonly catalog: Catalog = Catalog.shared,
    private readonly difficulty: Difficulty = Difficulty.Normal,
  ) {}

  sample(count: number, seed: number): DesignSample[] {
    const random = new SeededRandom(seed)
    return Array.from({ length: count }, () => {
      const design = this.randomDesign(random)
      return { design, result: this.simulator.run({ scenario: this.scenario, design, seed: random.integer(0, 2 ** 31), difficulty: this.difficulty }) }
    })
  }

  randomDesign(random: SeededRandom): MissionDesign {
    const instrumentIds = this.catalog.instruments.ids.filter(() => random.chance(0.3))
    return new MissionDesign({
      Science: { instrumentIds: instrumentIds.length ? instrumentIds : [random.pick(this.catalog.instruments.ids)], designLifeYears: random.integer(1, 10) },
      Spacecraft: {
        busId: random.pick(this.catalog.buses.ids),
        arrayTypeId: random.pick(this.catalog.solarArrays.ids),
        arrayAreaM2: Number(Math.exp(random.between(Math.log(0.05), Math.log(40))).toFixed(2)),
        batteryWh: Math.round(Math.exp(random.between(Math.log(10), Math.log(20000)))),
        shielded: random.chance(0.5),
      },
      Operations: { orbitId: random.pick(this.catalog.orbits.ids), commsId: random.pick(this.catalog.commsBands.ids), groundStations: random.integer(1, 8) },
      Program: { launchVehicleId: random.pick(this.catalog.launchVehicles.ids), copies: random.integer(1, this.scenario.spec.maxCopies) },
    })
  }
}
