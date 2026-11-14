import type { Instrument } from '../Catalog/Instrument'
import type { Scenario } from '../Catalog/Scenario'
import { Difficulty } from '../Design/Difficulty'
import type { MissionDesign } from '../Design/MissionDesign'
import { ResolvedDesign } from '../Design/ResolvedDesign'
import { EngineConstants } from '../EngineConstants'
import { BudgetSheet } from '../Models/BudgetSheet'
import { PowerModel } from '../Models/PowerModel'
import { ScienceModel } from '../Models/ScienceModel'
import { Numbers } from '../Numbers'
import { FailureTracer } from './FailureTracer'
import { MissionEvent, MissionEventKind } from './MissionEvent'
import { RandomEventDeck } from './RandomEventDeck'
import { SeededRandom } from './SeededRandom'
import { SimulationResult } from './SimulationResult'
import type { FailureTrace } from './TraceLink'
import { Verdict } from './Verdict'

export interface SimulationInput {
  scenario: Scenario
  design: MissionDesign
  seed: number
  difficulty?: Difficulty
}

class FlightState {
  year = 0
  arrayFactor = 1
  science = 0
  dragEvents = 0
  brownoutLogged = false
  targetLogged = false
  fatal?: FailureTrace
  instruments: Instrument[]
  propellantYears: number
  radiationLifeYears: number

  constructor(design: ResolvedDesign, public aliveCopies: number) {
    this.instruments = [...design.instruments]
    this.propellantYears = design.designLifeYears * EngineConstants.propellantReserve
    this.radiationLifeYears = design.orbit.radiationLifeYears(design.shielded)
  }
}

export class MissionSimulator {
  private readonly powerModel = new PowerModel()
  private readonly scienceModel = new ScienceModel()

  run(input: SimulationInput): SimulationResult {
    const design = new ResolvedDesign(input.design, input.scenario, input.difficulty ?? Difficulty.Normal)
    const budgets = BudgetSheet.evaluate(design)
    const tracer = new FailureTracer(design, budgets)
    const coverage = this.scienceModel.coverage(design)
    const finish = (verdict: Verdict, events: MissionEvent[], traces: FailureTrace[], science = 0, life = 0) =>
      new SimulationResult(design, budgets, verdict, events, traces, science, coverage, life, input.seed)

    if (budgets.cost.overBudget) return finish(Verdict.Cancelled, [], [tracer.cancelled()])
    if (!budgets.mass.reachable) return finish(Verdict.Grounded, [], [tracer.unreachable()])
    if (!budgets.mass.payloadFits) return finish(Verdict.Grounded, [], [tracer.payloadTooHeavy()])
    if (!budgets.mass.canLaunch) return finish(Verdict.Grounded, [], [tracer.overweight()])

    const random = new SeededRandom(input.seed)
    const events: MissionEvent[] = [new MissionEvent(0, MissionEventKind.Launch, { vehicle: design.vehicle.name })]
    const traces: FailureTrace[] = []
    const aliveCopies = this.launch(design, budgets, random)
    if (aliveCopies === 0) {
      events.push(new MissionEvent(0, MissionEventKind.LaunchFailure))
      return finish(Verdict.LaunchFailure, events, [tracer.launchFailure()])
    }
    if (aliveCopies < design.copies) traces.push(tracer.launchFailure())
    events.push(new MissionEvent(0, MissionEventKind.OrbitReached, { orbit: design.orbit.name, copies: aliveCopies }))

    const state = new FlightState(design, aliveCopies)
    const deck = new RandomEventDeck(design, random)
    const step = EngineConstants.timeStepYears
    const target = design.scenario.spec.targetYears

    while (state.year < design.designLifeYears - 1e-9 && !state.fatal) {
      const dt = Math.min(step, design.designLifeYears - state.year)
      this.applyRandomEvents(design, deck.draw(dt), state, events, random)
      const availableW = this.powerModel.availableAt(design, state.year, state.arrayFactor)
      const duty = budgets.power.loadW === 0 ? 1 : Math.min(1, availableW / budgets.power.loadW)
      if (duty < 1 && !state.brownoutLogged) {
        state.brownoutLogged = true
        events.push(new MissionEvent(state.year, MissionEventKind.Brownout, { duty: Numbers.percent(duty) }))
        traces.push(tracer.brownout(state.year, duty, availableW, state.arrayFactor))
      }

      const end = state.year + dt
      const death = this.firstDeath(design, budgets, state, end, tracer)
      const flown = (death?.year ?? end) - state.year
      const scienceYears = Math.max(0, Math.min(flown, target - state.year))
      const rate = this.scienceModel.pointsPerYear(design, state.instruments) * (state.aliveCopies / design.copies)
      state.science += rate * budgets.data.deliveredFraction * duty * scienceYears
      state.propellantYears -= flown
      state.year = death?.year ?? end

      if (!state.targetLogged && state.year >= target) {
        state.targetLogged = true
        events.push(new MissionEvent(target, MissionEventKind.TargetReached))
      }
      if (death) {
        state.fatal = death.trace
        events.push(new MissionEvent(death.year, death.kind))
      }
    }

    if (!state.fatal) events.push(new MissionEvent(state.year, MissionEventKind.DesignLifeComplete))
    if (budgets.data.deliveredFraction < 1) traces.push(tracer.dataBacklog())
    if (coverage < 1) traces.push(tracer.coverageShort(this.scienceModel.revisitHours(design)))

    const score = state.science * coverage
    const lifeOk = state.year >= target - 1e-9
    const scienceOk = score >= design.scenario.spec.requiredScience
    if (state.fatal && !lifeOk) return finish(Verdict.Lost, events, [state.fatal, ...traces], state.science, state.year)
    if (!lifeOk) return finish(Verdict.ScienceShortfall, events, [tracer.designLifeShort(state.year), ...traces], state.science, state.year)
    if (!scienceOk) return finish(Verdict.ScienceShortfall, events, [tracer.scienceShortfall(score), ...traces], state.science, state.year)
    return finish(Verdict.Success, events, state.fatal ? [...traces, state.fatal] : traces, state.science, state.year)
  }

  private launch(design: ResolvedDesign, budgets: BudgetSheet, random: SeededRandom): number {
    let alive = design.copies
    for (let launch = 0; launch < budgets.mass.launches; launch++) {
      if (random.chance(design.vehicle.failureChance)) {
        const onboard = Math.min(budgets.mass.spacecraftPerLaunch, design.copies - launch * budgets.mass.spacecraftPerLaunch)
        alive -= onboard
      }
    }
    return Math.max(0, alive)
  }

  private applyRandomEvents(design: ResolvedDesign, kinds: MissionEventKind[], state: FlightState, events: MissionEvent[], random: SeededRandom): void {
    for (const kind of kinds) {
      if (kind === MissionEventKind.SolarStorm) {
        state.arrayFactor *= 0.9
        if (!design.orbit.spec.dragEventsPossible && design.orbit.spec.radiationLifeYears < 15) state.radiationLifeYears -= 1
        events.push(new MissionEvent(state.year, kind))
      } else if (kind === MissionEventKind.Micrometeoroid && state.instruments.length > 0) {
        const hit = random.pick(state.instruments)
        state.instruments = state.instruments.filter((instrument) => instrument !== hit)
        events.push(new MissionEvent(state.year, kind, { instrument: hit.name }))
      } else if (kind === MissionEventKind.HighSolarActivity) {
        state.propellantYears -= 1
        state.dragEvents += 1
        events.push(new MissionEvent(state.year, kind))
      }
    }
  }

  private firstDeath(design: ResolvedDesign, budgets: BudgetSheet, state: FlightState, end: number, tracer: FailureTracer) {
    const candidates = [
      { year: budgets.lifetime.limits.Battery, kind: MissionEventKind.BatteryWornOut, trace: (y: number) => tracer.batteryWornOut(y) },
      { year: state.radiationLifeYears, kind: MissionEventKind.RadiationFailure, trace: (y: number) => tracer.radiationFailure(y) },
      { year: design.bus.maxDesignLifeYears, kind: MissionEventKind.BusWornOut, trace: (y: number) => tracer.busWornOut(y) },
      { year: state.year + state.propellantYears, kind: MissionEventKind.PropellantDepleted, trace: (y: number) => tracer.propellantDepleted(y, state.dragEvents) },
    ]
    const due = candidates.filter((candidate) => candidate.year < end - 1e-9).sort((a, b) => a.year - b.year)[0]
    if (!due) return undefined
    const year = Math.max(state.year, due.year)
    return { year, kind: due.kind, trace: due.trace(year) }
  }
}
