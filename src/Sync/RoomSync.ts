import type { DesignSlices, SliceKey } from '../Engine/Design/DesignSlices'
import type { Role } from '../Engine/Design/Role'
import { RoomCode } from './RoomCode'
import type { Ballot, RoomPhase, RoomState, Seat } from './RoomState'

export type RoomListener = (state: RoomState | null) => void

export abstract class RoomSync {
  abstract readonly transport: string
  private activeCode?: string

  protected abstract put(code: string, path: string, value: unknown): Promise<void>
  protected abstract merge(code: string, path: string, value: object): Promise<void>
  protected abstract remove(code: string, path: string): Promise<void>
  protected abstract watch(code: string, listener: RoomListener): () => void
  protected abstract trackPresence(code: string, role: Role): void

  get code(): string {
    if (!this.activeCode) throw new Error('Not connected to a room')
    return this.activeCode
  }

  async host(initial: Omit<RoomState, 'code'>): Promise<string> {
    const code = RoomCode.generate()
    await this.put(code, '', { ...initial, code })
    this.activeCode = code
    return code
  }

  join(code: string): void {
    this.activeCode = code
  }

  subscribe(listener: RoomListener): () => void {
    return this.watch(this.code, listener)
  }

  async claimSeat(role: Role, seat: Seat): Promise<void> {
    await this.put(this.code, `seats/${role}`, seat)
    this.trackPresence(this.code, role)
  }

  updateSlice<K extends SliceKey>(key: K, patch: Partial<DesignSlices[K]>): Promise<void> {
    return this.merge(this.code, `design/${key}`, patch)
  }

  castBallot(role: Role, ballot: Ballot): Promise<void> {
    return this.put(this.code, `ballots/${role}`, ballot)
  }

  clearBallots(): Promise<void> {
    return this.remove(this.code, 'ballots')
  }

  setPhase(phase: RoomPhase): Promise<void> {
    return this.put(this.code, 'phase', phase)
  }

  setSeed(seed: number): Promise<void> {
    return this.put(this.code, 'seed', seed)
  }
}
