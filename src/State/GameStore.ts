import { create } from 'zustand'
import { Catalog } from '../Engine/Catalog/Catalog'
import { Difficulty } from '../Engine/Design/Difficulty'
import type { DesignField } from '../Engine/Design/DesignField'
import type { DesignSlices, SliceKey } from '../Engine/Design/DesignSlices'
import { MissionDesign } from '../Engine/Design/MissionDesign'
import type { Role } from '../Engine/Design/Role'
import { MissionSimulator } from '../Engine/Simulation/MissionSimulator'
import { SeededRandom } from '../Engine/Simulation/SeededRandom'
import type { SimulationResult } from '../Engine/Simulation/SimulationResult'
import type { Language } from '../I18n/Language'
import { Translator } from '../I18n/Translator'
import { RoomPhase } from '../Sync/RoomState'
import { RoomSyncFactory } from '../Sync/RoomSyncFactory'
import { TeamSession } from '../Sync/TeamSession'
import { Screen } from './Screen'

interface GameState {
  screen: Screen
  language: Language
  difficulty: Difficulty
  scenarioId: string
  design: MissionDesign
  seed: number
  result?: SimulationResult
  focusField?: DesignField
  session?: TeamSession
  sessionTick: number
  setLanguage(language: Language): void
  setDifficulty(difficulty: Difficulty): void
  startSolo(scenarioId: string): void
  edit<K extends SliceKey>(key: K, patch: Partial<DesignSlices[K]>): void
  launch(): void
  finishFlight(): void
  retry(field?: DesignField): void
  backToMenu(): void
  hostTeam(scenarioId: string): Promise<void>
  joinTeam(code: string): Promise<void>
  claimRole(role: Role, name: string): Promise<void>
}

const Simulator = new MissionSimulator()

export const useGameStore = create<GameState>((set, get) => {
  const simulate = (): SimulationResult => {
    const { scenarioId, design, seed, difficulty } = get()
    return Simulator.run({ scenario: Catalog.shared.scenarios.get(scenarioId), design, seed, difficulty })
  }

  const followSession = (session: TeamSession) => {
    let previous: RoomPhase | undefined
    session.subscribe((current) => {
      const room = current.state
      if (!room) return
      set({ design: current.design, scenarioId: room.scenarioId, seed: room.seed, difficulty: room.difficulty, sessionTick: get().sessionTick + 1 })
      if (room.phase === RoomPhase.Flight && previous !== RoomPhase.Flight) set({ result: simulate(), screen: Screen.Flight })
      if (room.phase === RoomPhase.Design && previous && previous !== RoomPhase.Design) {
        set({ result: undefined, screen: current.isHost ? Screen.Host : Screen.Join })
      }
      previous = room.phase
    })
  }

  return {
    screen: Screen.Menu,
    language: Translator.detect(),
    difficulty: Difficulty.Normal,
    scenarioId: Catalog.shared.scenarios.ids[0],
    design: MissionDesign.starter(),
    seed: SeededRandom.randomSeed(),
    sessionTick: 0,

    setLanguage: (language) => set({ language }),
    setDifficulty: (difficulty) => set({ difficulty }),

    startSolo: (scenarioId) => set({ scenarioId, design: MissionDesign.starter(), screen: Screen.Build, result: undefined, session: undefined }),

    edit: (key, patch) => {
      set({ design: get().design.with(key, patch), focusField: undefined })
      void get().session?.edit(key, patch)
    },

    launch: () => {
      const session = get().session
      if (session) {
        void session.launch()
        return
      }
      set({ seed: SeededRandom.randomSeed() })
      set({ result: simulate(), screen: Screen.Flight })
    },

    finishFlight: () => {
      const session = get().session
      if (session?.isHost) void session.finishFlight()
      set({ screen: Screen.Debrief })
    },

    retry: (field) => {
      const session = get().session
      set({ focusField: field })
      if (session) {
        if (session.isHost) void session.redesign()
        else set({ screen: Screen.Join })
        return
      }
      set({ screen: Screen.Build, result: undefined })
    },

    backToMenu: () => set({ screen: Screen.Menu, session: undefined, result: undefined, focusField: undefined }),

    hostTeam: async (scenarioId) => {
      const session = await TeamSession.host(await RoomSyncFactory.create(), scenarioId, get().difficulty)
      set({ session, scenarioId, screen: Screen.Host, design: MissionDesign.starter() })
      followSession(session)
    },

    joinTeam: async (code) => {
      const session = TeamSession.join(await RoomSyncFactory.create(), code)
      set({ session, screen: Screen.Join })
      followSession(session)
      const remembered = TeamSession.remembered()
      if (session.role && remembered) await session.claim(session.role, remembered.name)
    },

    claimRole: async (role, name) => {
      await get().session?.claim(role, name)
      set({ sessionTick: get().sessionTick + 1 })
    },
  }
})
