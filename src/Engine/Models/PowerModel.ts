import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import { EngineConstants } from '../EngineConstants'
import { Budget, BudgetKind, type BudgetLine } from './Budget'
import { SubsystemModel } from './SubsystemModel'

export class PowerBudget extends Budget {
  readonly kind = BudgetKind.Power
  readonly unit = 'W'

  constructor(
    readonly lines: readonly BudgetLine[],
    readonly loadW: number,
    readonly sunlitArrayW: number,
    readonly availableW: number,
    readonly depthOfDischarge: number,
    readonly safeDepthOfDischarge: number,
    readonly eclipseMin: number,
    readonly periodMin: number,
  ) {
    super()
  }

  get used(): number {
    return this.loadW
  }

  get limit(): number {
    return this.availableW
  }

  get margin(): number {
    return this.loadW === 0 ? Number.POSITIVE_INFINITY : this.availableW / this.loadW - 1
  }

  get batteryOverstressed(): boolean {
    return this.depthOfDischarge > this.safeDepthOfDischarge
  }
}

export class PowerModel extends SubsystemModel<PowerBudget> {
  evaluate(design: ResolvedDesign): PowerBudget {
    const lines: BudgetLine[] = [
      { label: design.bus.name, amount: design.bus.baseLoadW, field: DesignField.Bus },
      ...design.instruments.map((instrument) => ({ label: instrument.name, amount: instrument.powerW, field: DesignField.Instruments })),
      { label: design.comms.name, amount: design.comms.powerW, field: DesignField.Comms },
    ]
    const loadW = lines.reduce((sum, line) => sum + line.amount, 0)
    const sunlitArrayW = this.sunlitArrayW(design, 0, 1)
    const { eclipseMin, periodMin, safeDepthOfDischarge } = design.orbit.spec
    const depthOfDischarge = eclipseMin === 0 ? 0 : design.batteryWh <= 0 ? Number.POSITIVE_INFINITY : (loadW * design.orbit.eclipseHours) / design.batteryWh
    return new PowerBudget(lines, loadW, sunlitArrayW, this.orbitAverageW(design, sunlitArrayW), depthOfDischarge, safeDepthOfDischarge, eclipseMin, periodMin)
  }

  sunlitArrayW(design: ResolvedDesign, year: number, arrayFactor: number): number {
    const degradation = Math.pow(1 - EngineConstants.arrayDegradationPerYear, year)
    return design.arrayAreaM2 * design.arrayType.wattsPerSquareMeter * EngineConstants.arrayLossFactor * degradation * arrayFactor
  }

  orbitAverageW(design: ResolvedDesign, sunlitArrayW: number): number {
    const sunlit = design.orbit.sunlitMin
    const eclipse = design.orbit.spec.eclipseMin
    return (sunlitArrayW * sunlit) / (sunlit + eclipse / EngineConstants.batteryRoundTripEfficiency)
  }

  availableAt(design: ResolvedDesign, year: number, arrayFactor: number): number {
    return this.orbitAverageW(design, this.sunlitArrayW(design, year, arrayFactor))
  }
}
