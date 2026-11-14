import type { Difficulty } from '../Engine/Design/Difficulty'
import type { DesignSlices } from '../Engine/Design/DesignSlices'
import type { Role } from '../Engine/Design/Role'

export enum RoomPhase {
  Lobby = 'Lobby',
  Design = 'Design',
  Flight = 'Flight',
  Debrief = 'Debrief',
}

export enum Vote {
  Go = 'Go',
  NoGo = 'NoGo',
}

export interface Seat {
  playerId: string
  name: string
  connected: boolean
}

export interface Ballot {
  vote: Vote
  reason?: string
}

export interface RoomState {
  code: string
  scenarioId: string
  difficulty: Difficulty
  seed: number
  phase: RoomPhase
  createdAt: number
  design: DesignSlices
  seats?: Partial<Record<Role, Seat>>
  ballots?: Partial<Record<Role, Ballot>>
}
