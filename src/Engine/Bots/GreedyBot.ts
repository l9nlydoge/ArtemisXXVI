import type { Flight } from '../Flight/Flight'
import { FlightBot } from './FlightBot'

export class GreedyBot extends FlightBot {
  protected reserve(): number {
    return 0
  }

  protected shouldSurvey(flight: Flight): boolean {
    return flight.contacts.some((contact) => !contact.identified) && flight.state.charge >= flight.craft.capacity * 0.75
  }
}
