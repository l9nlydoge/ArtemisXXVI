import { Catalog } from '../Catalog/Catalog'
import type { Scenario } from '../Catalog/Scenario'
import { Difficulty } from '../Design/Difficulty'
import { MissionDesign } from '../Design/MissionDesign'
import { EngineConstants } from '../EngineConstants'
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

  fly(design: MissionDesign, seed: number): DesignSample {
    return { design, result: this.simulator.run({ scenario: this.scenario, design, seed, difficulty: this.difficulty }) }
  }

  flown(count: number, seed: number, attempts = count * 40): DesignSample[] {
    const random = new SeededRandom(seed)
    const samples: DesignSample[] = []
    for (let attempt = 0; attempt < attempts && samples.length < count; attempt++) {
      const sample = this.fly(this.plausibleDesign(random), random.integer(0, 2 ** 31))
      if (sample.result.flew) samples.push(sample)
    }
    return samples
  }

  plausibleDesign(random: SeededRandom): MissionDesign {
    const { budgetMusd, maxCopies } = this.scenario.spec
    const affordable = <T extends { costMusd: number }>(items: readonly T[], share: number) => {
      const fits = items.filter((item) => item.costMusd * EngineConstants.programOverhead <= budgetMusd * share)
      return fits.length ? fits : [[...items].sort((a, b) => a.costMusd - b.costMusd)[0]]
    }
    const bus = random.pick(affordable(this.catalog.buses.items, 0.6))
    const useful = this.catalog.instruments.items.filter((instrument) => this.scenario.instrumentFit(instrument.id) >= 0.3 && instrument.massKg <= bus.maxPayloadKg)
    const candidates = affordable(useful.length ? useful : this.catalog.instruments.items, 0.75)
    const first = random.pick(candidates)
    const second = random.chance(0.25) ? random.pick(candidates) : first
    const instruments = second !== first && first.massKg + second.massKg <= bus.maxPayloadKg ? [first, second] : [first]

    const suited = this.catalog.orbits.items.filter((candidate) => this.scenario.orbitFit(candidate.orbitClass) >= 0.4)
    const orbit = random.pick(suited.length ? suited : this.catalog.orbits.items)
    const dataGb = instruments.reduce((sum, instrument) => sum + instrument.gigabitsPerDay, 0)
    const capable = this.catalog.commsBands.items.filter((band) => {
      const rate = orbit.effectiveRateMbps(band.id, band.dataMbps) * band.availability
      return (rate * orbit.contactMinutesPerDay(8) * 60) / 1000 >= dataGb * 0.25
    })
    const comms = random.pick(capable.length ? capable : this.catalog.commsBands.items)
    const reachable = this.catalog.launchVehicles.items.filter((vehicle) => vehicle.canReach(orbit))
    const vehicle = random.pick(reachable.length ? reachable : this.catalog.launchVehicles.items)

    const loadW = bus.baseLoadW + comms.powerW + instruments.reduce((sum, instrument) => sum + instrument.powerW, 0)
    const sunlit = orbit.sunlitMin / (orbit.sunlitMin + orbit.spec.eclipseMin / EngineConstants.batteryRoundTripEfficiency)
    const arrayType = random.pick(this.catalog.solarArrays.items)
    const neededArea = loadW / (arrayType.wattsPerSquareMeter * EngineConstants.arrayLossFactor * sunlit)
    const neededBattery = (loadW * orbit.eclipseHours) / orbit.spec.safeDepthOfDischarge
    const unitCost = (bus.costMusd + instruments.reduce((sum, instrument) => sum + instrument.costMusd, 0)) * EngineConstants.programOverhead
    const affordableCopies = Math.max(1, Math.floor((budgetMusd * 0.85) / unitCost))

    const rate = orbit.effectiveRateMbps(comms.id, comms.dataMbps) * comms.availability
    const perStation = (rate * orbit.contactMinutesPerDay(1) * 60) / 1000
    const neededStations = orbit.spec.continuousContact || perStation === 0 ? 1 : Math.ceil(dataGb / perStation)
    const neededCopies = Math.ceil(this.scenario.spec.orbitRevisitHours[orbit.orbitClass] / this.scenario.spec.requiredRevisitHours)
    const target = this.scenario.spec.targetYears
    const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

    return new MissionDesign({
      Science: { instrumentIds: instruments.map((instrument) => instrument.id), designLifeYears: clamp(target + random.integer(-1, 2), 1, 15) },
      Spacecraft: {
        busId: bus.id,
        arrayTypeId: arrayType.id,
        arrayAreaM2: Number(Math.max(0.05, neededArea * random.between(0.75, 1.9)).toFixed(2)),
        batteryWh: Math.max(10, Math.round(neededBattery * random.between(0.8, 1.8))),
        shielded: random.chance(0.4),
      },
      Operations: { orbitId: orbit.id, commsId: comms.id, groundStations: clamp(Math.round(neededStations * random.between(0.5, 1.6)), 1, 10) },
      Program: { launchVehicleId: vehicle.id, copies: clamp(neededCopies + random.integer(-2, 3), 1, Math.min(maxCopies, affordableCopies)) },
    })
  }
}
