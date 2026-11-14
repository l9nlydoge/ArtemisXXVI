import type { LoadoutJson } from '../Spacecraft/Loadout'

export interface FlightSetup {
  loadout: LoadoutJson
  weekId: string
  seed: number
  cooldowns?: boolean
  weekSignature?: string
}
