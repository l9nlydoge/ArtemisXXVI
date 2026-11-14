import { Catalog } from '../Engine/Catalog/Catalog'
import type { Difficulty } from '../Engine/Design/Difficulty'
import type { SliceKey } from '../Engine/Design/DesignSlices'
import { MissionDesign } from '../Engine/Design/MissionDesign'
import { AllRoles, type Role } from '../Engine/Design/Role'
import { SeededRandom } from '../Engine/Simulation/SeededRandom'
import { PlayerIdentity } from './PlayerIdentity'
import type { RoomSync } from './RoomSync'
import { RoomPhase, Vote, type Ballot, type RoomState } from './RoomState'

export class TeamSession {
  private static readonly storageKey = 'GoNoGo.Session'
  state: RoomState | null = null

  private constructor(
    readonly sync: RoomSync,
    readonly isHost: boolean,
    public role?: Role,
  ) {}

  static async host(sync: RoomSync, scenarioId: string, difficulty: Difficulty): Promise<TeamSession> {
    await sync.host({
      scenarioId,
      difficulty,
      seed: SeededRandom.randomSeed(),
      phase: RoomPhase.Design,
      createdAt: Date.now(),
      design: MissionDesign.starter().toJson(),
    })
    return new TeamSession(sync, true)
  }

  static join(sync: RoomSync, code: string): TeamSession {
    sync.join(code)
    const remembered = TeamSession.remembered()
    return new TeamSession(sync, false, remembered?.code === code ? remembered.role : undefined)
  }

  static remembered(): { code: string; role: Role; name: string } | null {
    try {
      const raw = localStorage.getItem(TeamSession.storageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  get code(): string {
    return this.sync.code
  }

  get design(): MissionDesign {
    return MissionDesign.fromJson(this.state?.design ?? MissionDesign.starter().toJson())
  }

  get scenario() {
    return Catalog.shared.scenarios.get(this.state?.scenarioId ?? 'CropWatch')
  }

  subscribe(listener: (session: TeamSession) => void): () => void {
    return this.sync.subscribe((state) => {
      this.state = state
      listener(this)
    })
  }

  async claim(role: Role, name: string): Promise<void> {
    this.role = role
    await this.sync.claimSeat(role, { playerId: PlayerIdentity.id, name, connected: true })
    try {
      localStorage.setItem(TeamSession.storageKey, JSON.stringify({ code: this.code, role, name }))
    } catch {
      /* storage unavailable */
    }
  }

  isSeatFree(role: Role): boolean {
    const seat = this.state?.seats?.[role]
    return !seat || !seat.connected || seat.playerId === PlayerIdentity.id
  }

  async edit<K extends SliceKey>(key: K, patch: Partial<MissionDesign['slices'][K]>): Promise<void> {
    await this.sync.updateSlice(key, patch)
    if (this.state?.ballots) await this.sync.clearBallots()
  }

  vote(ballot: Ballot): Promise<void> {
    if (!this.role) throw new Error('Pick a role first')
    return this.sync.castBallot(this.role, ballot)
  }

  get seatedRoles(): Role[] {
    return AllRoles.filter((role) => this.state?.seats?.[role]?.connected)
  }

  get unanimousGo(): boolean {
    const seated = this.seatedRoles
    return seated.length > 0 && seated.every((role) => this.state?.ballots?.[role]?.vote === Vote.Go)
  }

  async launch(): Promise<void> {
    await this.sync.setPhase(RoomPhase.Flight)
  }

  async finishFlight(): Promise<void> {
    await this.sync.setPhase(RoomPhase.Debrief)
  }

  async redesign(): Promise<void> {
    await this.sync.clearBallots()
    await this.sync.setSeed(SeededRandom.randomSeed())
    await this.sync.setPhase(RoomPhase.Design)
  }
}
