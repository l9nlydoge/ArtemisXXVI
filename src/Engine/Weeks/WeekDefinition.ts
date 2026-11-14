export interface LegDefinition {
  startUtc: string
  endUtc: string
  pinned?: readonly string[]
}

export interface WeekDefinition {
  id: string
  minRank: number
  legs: readonly LegDefinition[]
}
