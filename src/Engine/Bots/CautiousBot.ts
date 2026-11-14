import type { Encounter } from '../Flight/Encounter'
import type { Flight } from '../Flight/Flight'
import { FlightBot } from './FlightBot'

export class CautiousBot extends FlightBot {
  private static readonly dangerous = 3

  protected reserve(flight: Flight, encounter: Encounter): number {
    const shield = flight.craft.magneticShield
    if (!shield || encounter.turnIndex >= encounter.turnCount - 1) return 0
    const upcoming = encounter.visible.slice(encounter.turnIndex + 1)
    const next = upcoming[0]
    const knownDanger = upcoming.some((condition) => condition !== undefined && condition.radiation - flight.craft.passiveShield >= CautiousBot.dangerous)
    const unseenStorm = flight.isStormLeg && upcoming.some((condition) => condition === undefined)
    if (!knownDanger && !unseenStorm) return 0
    const recharge = next !== undefined && !next.inShadow ? flight.craft.generation : 0
    return Math.max(0, shield.card.powerCost - recharge)
  }

  protected shouldSurvey(flight: Flight): boolean {
    return !flight.isStormLeg && flight.contacts.some((contact) => !contact.identified) && flight.state.charge >= flight.craft.capacity * 0.75
  }
}
