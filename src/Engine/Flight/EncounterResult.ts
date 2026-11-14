import type { Channel } from '../Events/Channel'
import type { MissedChannel } from './Scoring'

export interface EncounterResult {
  legIndex: number
  eventId: string
  recorded: ReadonlyMap<Channel, number>
  points: number
  complete: boolean
  anyRecorded: boolean
  missed: readonly MissedChannel[]
  turnsPlayed: number
  damageTaken: number
}
