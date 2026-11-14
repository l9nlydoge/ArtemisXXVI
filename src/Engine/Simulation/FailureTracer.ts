import { DesignField } from '../Design/DesignField'
import type { ResolvedDesign } from '../Design/ResolvedDesign'
import type { BudgetLine } from '../Models/Budget'
import type { BudgetSheet } from '../Models/BudgetSheet'
import { Numbers } from '../Numbers'
import { FailureTrace, TraceLink, TraceSeverity } from './TraceLink'


export class FailureTracer {
  constructor(
    private readonly design: ResolvedDesign,
    private readonly budgets: BudgetSheet,
  ) {}

  cancelled(): FailureTrace {
    const { cost } = this.budgets
    const driver = cost.largestLine()
    return this.fatal(
      new TraceLink('Trace.Cancelled', { cost: Numbers.round(cost.totalMusd), budget: cost.budgetMusd }),
      [this.driverLink('Trace.CostDriver', driver, 0), this.decision(driver?.field ?? DesignField.Instruments, driver?.label)],
    )
  }

  unreachable(): FailureTrace {
    return this.fatal(new TraceLink('Trace.Unreachable', { vehicle: this.design.vehicle.name, orbit: this.design.orbit.name }), [
      this.decision(DesignField.LaunchVehicle, this.design.vehicle.name),
    ])
  }

  payloadTooHeavy(): FailureTrace {
    const { mass } = this.budgets
    return this.fatal(
      new TraceLink('Trace.PayloadTooHeavy', { payload: Numbers.round(mass.payloadKg), bus: this.design.bus.name, max: mass.maxPayloadKg }),
      [this.decision(DesignField.Bus, this.design.bus.name)],
    )
  }

  overweight(): FailureTrace {
    const { mass } = this.budgets
    const driver = mass.largestLine()
    return this.fatal(
      new TraceLink('Trace.Overweight', { over: Numbers.round(mass.overweightKg), vehicle: this.design.vehicle.name, capacity: mass.capacityKg }),
      [this.driverLink('Trace.MassDriver', driver, 0), this.decision(DesignField.LaunchVehicle, this.design.vehicle.name)],
    )
  }

  launchFailure(): FailureTrace {
    const vehicle = this.design.vehicle
    return this.fatal(new TraceLink('Trace.LaunchFailure', { vehicle: vehicle.name }), [
      new TraceLink('Trace.LaunchOdds', { vehicle: vehicle.name, chance: Numbers.percent(vehicle.failureChance) }),
      this.decision(DesignField.LaunchVehicle, vehicle.name),
    ], 0)
  }

  launchFailureWithoutReserve(reflightMusd: number): FailureTrace {
    const vehicle = this.design.vehicle
    const reserve = this.budgets.cost.budgetMusd - this.budgets.cost.totalMusd
    return this.fatal(new TraceLink('Trace.LaunchFailure', { vehicle: vehicle.name }), [
      new TraceLink('Trace.LaunchOdds', { vehicle: vehicle.name, chance: Numbers.percent(vehicle.failureChance) }),
      new TraceLink('Trace.NoReflight', { needed: Numbers.round(reflightMusd), reserve: Numbers.round(reserve) }),
      this.decision(DesignField.LaunchVehicle, vehicle.name),
    ], 0)
  }

  reflight(reflightMusd: number): FailureTrace {
    const vehicle = this.design.vehicle
    return new FailureTrace(new TraceLink('Trace.Reflight', { vehicle: vehicle.name, cost: Numbers.round(reflightMusd) }), [
      new TraceLink('Trace.LaunchOdds', { vehicle: vehicle.name, chance: Numbers.percent(vehicle.failureChance) }),
      this.decision(DesignField.LaunchVehicle, vehicle.name),
    ], TraceSeverity.Degraded, 0)
  }

  batteryWornOut(year: number): FailureTrace {
    const { power } = this.budgets
    return this.fatal(new TraceLink('Trace.BatteryWornOut', { year: Numbers.round(year, 1) }), [
      new TraceLink('Trace.DepthOfDischarge', { dod: Numbers.percent(power.depthOfDischarge), safe: Numbers.percent(power.safeDepthOfDischarge) }),
      new TraceLink('Trace.Eclipse', { eclipse: Numbers.round(power.eclipseMin), period: Numbers.round(power.periodMin) }),
      new TraceLink('Trace.Load', { load: Numbers.round(power.loadW) }),
      this.driverLink('Trace.LoadDriver', power.largestLine(), 0),
      this.decision(DesignField.Battery, String(this.design.batteryWh)),
    ], year)
  }

  brownout(year: number, duty: number, availableW: number, arrayFactor: number): FailureTrace {
    const { power } = this.budgets
    const causes = [
      new TraceLink('Trace.ArrayOutput', { area: this.design.arrayAreaM2, available: Numbers.round(availableW) }),
      new TraceLink('Trace.Load', { load: Numbers.round(power.loadW) }),
    ]
    if (arrayFactor < 1) causes.unshift(new TraceLink('Trace.SolarStormDamage', { loss: Numbers.percent(1 - arrayFactor) }))
    causes.push(this.driverLink('Trace.LoadDriver', power.largestLine(), 0), this.decision(DesignField.ArrayArea, String(this.design.arrayAreaM2)))
    return new FailureTrace(new TraceLink('Trace.Brownout', { year: Numbers.round(year, 1), duty: Numbers.percent(duty) }), causes, TraceSeverity.Degraded, year)
  }

  dataBacklog(): FailureTrace {
    const { data } = this.budgets
    return new FailureTrace(new TraceLink('Trace.DataBacklog', { delivered: Numbers.percent(data.deliveredFraction) }), [
      new TraceLink('Trace.DataVolumes', { generated: Numbers.round(data.generatedGbPerDay), downlink: Numbers.round(data.downlinkGbPerDay) }),
      new TraceLink('Trace.Contact', { contact: Numbers.round(data.contactMinPerDay), rate: Numbers.round(data.effectiveRateMbps, 2) }),
      this.driverLink('Trace.DataDriver', data.largestLine(), 0),
      this.decision(DesignField.GroundStations, String(this.design.groundStations)),
    ], TraceSeverity.Degraded)
  }

  radiationFailure(year: number): FailureTrace {
    return this.fatal(new TraceLink('Trace.RadiationFailure', { year: Numbers.round(year, 1) }), [
      new TraceLink('Trace.RadiationEnvironment', { orbit: this.design.orbit.name, life: this.design.orbit.radiationLifeYears(this.design.shielded) }),
      this.decision(DesignField.Shielding, this.design.shielded ? '✓' : '✕'),
    ], year)
  }

  propellantDepleted(year: number, dragEvents: number): FailureTrace {
    return this.fatal(new TraceLink('Trace.PropellantDepleted', { year: Numbers.round(year, 1) }), [
      new TraceLink('Trace.Drag', { events: dragEvents }),
      this.decision(DesignField.Orbit, this.design.orbit.name),
    ], year)
  }

  busWornOut(year: number): FailureTrace {
    return this.fatal(new TraceLink('Trace.BusWornOut', { year: Numbers.round(year, 1), bus: this.design.bus.name, life: this.design.bus.maxDesignLifeYears }), [
      this.decision(DesignField.Bus, this.design.bus.name),
    ], year)
  }

  designLifeShort(year: number): FailureTrace {
    return this.fatal(new TraceLink('Trace.ShortLife', { year: Numbers.round(year, 1), target: this.design.scenario.spec.targetYears }), [
      this.decision(DesignField.DesignLife, String(this.design.designLifeYears)),
    ], year)
  }

  coverageShort(revisitHours: number): FailureTrace {
    return new FailureTrace(new TraceLink('Trace.Coverage', { revisit: Numbers.round(revisitHours, 1), required: this.design.scenario.spec.requiredRevisitHours }), [
      this.decision(DesignField.Copies, String(this.design.copies)),
    ], TraceSeverity.Degraded)
  }

  scienceShortfall(score: number): FailureTrace {
    const scenario = this.design.scenario
    const orbitFit = scenario.orbitFit(this.design.orbit.orbitClass)
    const bestFit = Math.max(0, ...this.design.instruments.map((instrument) => scenario.instrumentFit(instrument.id)))
    const cause = orbitFit < bestFit
      ? [new TraceLink('Trace.OrbitFit', { orbit: this.design.orbit.name, fit: Numbers.percent(orbitFit) }), this.decision(DesignField.Orbit, this.design.orbit.name)]
      : [new TraceLink('Trace.InstrumentFit', { fit: Numbers.percent(bestFit) }), this.decision(DesignField.Instruments, this.design.instruments.map((i) => i.name).join(', ') || 'none')]
    return this.fatal(new TraceLink('Trace.ScienceShortfall', { score: Numbers.round(score), required: scenario.spec.requiredScience }), cause)
  }

  private fatal(headline: TraceLink, causes: TraceLink[], year?: number): FailureTrace {
    return new FailureTrace(headline, causes, TraceSeverity.Fatal, year)
  }

  private driverLink(key: string, line: BudgetLine | undefined, digits: number): TraceLink {
    return new TraceLink(key, { label: line?.label ?? '—', amount: Numbers.round(line?.amount ?? 0, digits) })
  }

  private decision(field: DesignField, value?: string): TraceLink {
    return new TraceLink('Trace.YouChose', { value: value ?? '' }, field)
  }
}
