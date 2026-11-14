import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { EngineConstants } from '../EngineConstants'
import { Budget, BudgetKind, type BudgetLine } from './Budget'
import { SubsystemModel } from './SubsystemModel'

export class MassBudget extends Budget {
  readonly kind = BudgetKind.Mass
  readonly unit = 'kg'

  constructor(
    readonly lines: readonly BudgetLine[],
    readonly dryKg: number,
    readonly contingencyKg: number,
    readonly propellantKg: number,
    readonly payloadKg: number,
    readonly maxPayloadKg: number,
    readonly capacityKg: number,
    readonly spacecraftPerLaunch: number,
    readonly launches: number,
  ) {
    super()
  }

  get launchMassKg(): number {
    return this.dryKg + this.contingencyKg + this.propellantKg
  }

  get payloadFits(): boolean {
    return this.payloadKg <= this.maxPayloadKg
  }

  get reachable(): boolean {
    return this.capacityKg > 0
  }

  get canLaunch(): boolean {
    return this.reachable && this.payloadFits && this.spacecraftPerLaunch > 0
  }

  get overweightKg(): number {
    return Math.max(0, this.launchMassKg - this.capacityKg)
  }

  get margin(): number {
    if (!this.reachable) return -1
    const loaded = this.launchMassKg * Math.max(1, this.spacecraftPerLaunch)
    return this.capacityKg / loaded - 1
  }
}

export class MassModel extends SubsystemModel<MassBudget> {
  evaluate(design: ResolvedDesign): MassBudget {
    const lines: BudgetLine[] = [
      { label: design.bus.name, amount: design.bus.massKg, field: DesignField.Bus },
      ...design.instruments.map((instrument) => ({ label: instrument.name, amount: instrument.massKg, field: DesignField.Instruments })),
      { label: design.comms.name, amount: design.comms.massKg, field: DesignField.Comms },
      { label: design.arrayType.name, amount: design.arrayType.massKg(design.arrayAreaM2), field: DesignField.ArrayArea },
      { label: 'Battery', amount: design.batteryWh / EngineConstants.batteryWhPerKg, field: DesignField.Battery },
    ]
    const unshielded = lines.reduce((sum, line) => sum + line.amount, 0)
    if (design.shielded) lines.push({ label: 'Radiation shielding', amount: unshielded * EngineConstants.shieldingMassFraction, field: DesignField.Shielding })
    const dryKg = lines.reduce((sum, line) => sum + line.amount, 0)
    const contingencyKg = dryKg * design.difficulty.massContingency
    const propellantKg = this.propellantKg(design, dryKg + contingencyKg)
    lines.push({ label: 'Propellant', amount: propellantKg, field: DesignField.DesignLife })

    const capacityKg = design.vehicle.capacityFor(design.orbit)
    const launchMassKg = dryKg + contingencyKg + propellantKg
    const sharesRide = design.vehicle.pricing.sharesRide
    const perLaunch = launchMassKg > capacityKg ? 0 : sharesRide ? design.copies : Math.min(design.copies, Math.floor(capacityKg / launchMassKg))
    const launches = perLaunch === 0 ? Number.POSITIVE_INFINITY : Math.ceil(design.copies / perLaunch)

    return new MassBudget(lines, dryKg, contingencyKg, propellantKg, design.payloadMassKg, design.bus.maxPayloadKg, capacityKg, perLaunch, launches)
  }

  private propellantKg(design: ResolvedDesign, dryKg: number): number {
    const { insertionDvMs, keepingDvMsPerYear } = design.orbit.spec
    const deltaV = insertionDvMs + keepingDvMsPerYear * design.designLifeYears * EngineConstants.propellantReserve
    const exhaustVelocity = EngineConstants.propellantIspSeconds * EngineConstants.standardGravity
    return dryKg * (Math.exp(deltaV / exhaustVelocity) - 1)
  }
}
