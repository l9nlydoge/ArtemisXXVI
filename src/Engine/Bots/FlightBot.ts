import type { Contact } from '../Flight/Contact'
import type { Encounter } from '../Flight/Encounter'
import type { EngineOptions } from '../Flight/EngineOptions'
import { Flight, FlightPhase } from '../Flight/Flight'
import { Commands, type FlightCommand } from '../Flight/FlightCommand'
import type { FlightReport } from '../Flight/FlightReport'
import type { FlightSetup } from '../Flight/FlightSetup'
import { Scoring } from '../Flight/Scoring'
import { TurnPlan } from '../Flight/TurnPlan'

export interface BotFlight {
  flight: Flight
  report: FlightReport
}

export abstract class FlightBot {
  protected static readonly unknownWorth = 12
  private static readonly commandLimit = 400

  protected abstract reserve(flight: Flight, encounter: Encounter): number
  protected abstract shouldSurvey(flight: Flight): boolean

  fly(setup: FlightSetup, options: EngineOptions = {}): BotFlight {
    const flight = Flight.begin(setup, options)
    for (let step = 0; step < FlightBot.commandLimit && !flight.isOver; step++) flight.apply(this.next(flight))
    if (!flight.isOver) throw new Error('The bot did not finish the flight')
    return { flight, report: flight.report() }
  }

  next(flight: Flight): FlightCommand {
    if (flight.phase === FlightPhase.Scanning) return this.scan(flight)
    if (flight.phase === FlightPhase.Encounter) return Commands.commit(this.plan(flight, flight.encounter!).keys)
    return this.afterEncounter(flight)
  }

  protected worth(flight: Flight, contact: Contact): number {
    if (contact.played) return -1
    const survivable = contact.peakRadiation - flight.craft.passiveShield < flight.state.hull || flight.craft.magneticShield !== undefined
    if (!survivable) return 0
    return contact.identified ? Scoring.potential(contact.event, flight.craft).reachable : FlightBot.unknownWorth
  }

  protected scan(flight: Flight): FlightCommand {
    if (flight.can(Commands.survey) && this.shouldSurvey(flight)) return Commands.survey
    const ranked = flight.contacts.map((contact, index) => ({ index, worth: this.worth(flight, contact) })).sort((a, b) => b.worth - a.worth)
    const best = ranked[0]
    if ((!best || best.worth <= 0) && flight.can(Commands.hold)) return Commands.hold
    return best ? Commands.choose(best.index) : Commands.hold
  }

  protected afterEncounter(flight: Flight): FlightCommand {
    const open = flight.contacts.map((contact, index) => ({ index, worth: this.worth(flight, contact) })).filter((entry) => entry.worth > 0).sort((a, b) => b.worth - a.worth)[0]
    if (open && flight.state.charge >= flight.craft.capacity / 2 && flight.can(Commands.chase(open.index))) return Commands.chase(open.index)
    return Commands.proceed
  }

  protected plan(flight: Flight, encounter: Encounter): TurnPlan {
    const { craft } = flight
    let plan = TurnPlan.empty
    const accept = (key: string): boolean => {
      const candidate = plan.with(key)
      if (!encounter.preview(candidate).valid) return false
      plan = candidate
      return true
    }

    const exposed = encounter.preview(plan)
    const shield = craft.magneticShield
    if (shield && (exposed.incoming >= 3 || exposed.lost)) accept(shield.key)
    const drone = craft.repairDrone
    if (drone && encounter.preview(plan).lost) accept(drone.key)

    const reserve = this.reserve(flight, encounter)
    const instruments = craft.instruments
      .map((module) => ({ module, gain: encounter.yieldOf(module.key)?.gain ?? 0 }))
      .filter((entry) => entry.gain > 0)
      .sort((a, b) => b.gain / b.module.card.powerCost - a.gain / a.module.card.powerCost)
    for (const { module } of instruments) {
      const candidate = encounter.preview(plan.with(module.key))
      if (candidate.valid && candidate.chargeAfter >= reserve) plan = plan.with(module.key)
    }
    return plan
  }
}
