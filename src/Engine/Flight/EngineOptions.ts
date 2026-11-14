import type { Ownership } from '../Spacecraft/LoadoutIssue'
import type { WeekCatalog } from '../Weeks/WeekCatalog'

export interface EngineOptions {
  weeks?: WeekCatalog
  owner?: Ownership
}
