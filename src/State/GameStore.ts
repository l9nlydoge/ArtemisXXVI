import { create } from 'zustand'
import { SeededRandom } from '../Engine/Core/SeededRandom'
import { Flight } from '../Engine/Flight/Flight'
import { CommandType, type FlightCommand } from '../Engine/Flight/FlightCommand'
import type { FlightReport } from '../Engine/Flight/FlightReport'
import { TurnPlan } from '../Engine/Flight/TurnPlan'
import { Lab } from '../Engine/Progress/Lab'
import { Profile } from '../Engine/Progress/Profile'
import { BusCatalog } from '../Engine/Spacecraft/BusCatalog'
import { Loadout } from '../Engine/Spacecraft/Loadout'
import type { Week } from '../Engine/Weeks/Week'
import { WeekCatalog } from '../Engine/Weeks/WeekCatalog'
import { GameData } from '../Data/GameData'
import type { Language } from '../I18n/Language'
import { Translator } from '../I18n/Translator'
import { SaveGame } from './SaveGame'
import { Screen } from './Screen'

export interface FlightOutcomeSummary {
  report: FlightReport
  weekId: string
  rankBefore: number
  lifetimeBefore: number
}

interface GameState {
  screen: Screen
  language: Language
  profile: Profile
  weekId: string
  loadout: Loadout
  flight?: Flight
  flightTick: number
  plan: TurnPlan
  summary?: FlightOutcomeSummary
  worldReady: boolean
  go(screen: Screen): void
  pickWeek(weekId: string): void
  editLoadout(change: (loadout: Loadout) => Loadout): void
  launch(): void
  send(command: FlightCommand): void
  togglePlan(key: string): void
  clearPlan(): void
  finishFlight(): void
  buy(moduleId: string): void
  markHint(hint: string): void
  setLanguage(language: Language): void
  resetProgress(): void
  markWorldReady(): void
}

GameData.install()
const lab = new Lab()

function loadoutFor(profile: Profile): Loadout {
  const saved = profile.lastLoadout ? Loadout.fromJson(profile.lastLoadout) : Loadout.starter()
  const fitted = saved.withBus(BusCatalog.shared.largestFor(profile.rank))
  return fitted.isValid(profile) ? fitted : Loadout.starter().withBus(BusCatalog.shared.largestFor(profile.rank))
}

function weekFor(profile: Profile, wanted?: string): Week {
  const open = WeekCatalog.shared.availableAt(profile.rank)
  return open.find((week) => week.id === wanted) ?? open[0]
}

function resumeFlight(profile: Profile): Flight | undefined {
  const saved = SaveGame.loadFlight()
  if (!saved) return undefined
  try {
    const flight = Flight.replay(saved.setup, saved.log, { owner: profile })
    return flight
  } catch {
    SaveGame.clearFlight()
    return undefined
  }
}

const startProfile = SaveGame.loadProfile()
const startFlight = resumeFlight(startProfile)

export const useGameStore = create<GameState>((set, get) => ({
  screen: startFlight ? Screen.Flight : Screen.Home,
  language: SaveGame.loadLanguage() ?? Translator.detect(),
  profile: startProfile,
  weekId: startFlight?.week.id ?? weekFor(startProfile).id,
  loadout: startFlight ? startFlight.craft.loadout : loadoutFor(startProfile),
  flight: startFlight,
  flightTick: 0,
  plan: TurnPlan.empty,
  worldReady: false,

  go: (screen) => set({ screen }),

  pickWeek: (weekId) => set({ weekId: weekFor(get().profile, weekId).id, screen: Screen.Hangar }),

  editLoadout: (change) => {
    const loadout = change(get().loadout)
    const profile = get().profile.withLoadout(loadout)
    SaveGame.saveProfile(profile)
    set({ loadout, profile })
  },

  launch: () => {
    const { loadout, profile, weekId } = get()
    if (!loadout.isValid(profile)) return
    const setup = Flight.setup(loadout, WeekCatalog.shared.get(weekId), SeededRandom.randomSeed())
    const flight = Flight.begin(setup, { owner: profile })
    SaveGame.saveFlight({ setup: flight.setup, log: [] })
    set({ flight, flightTick: 0, plan: TurnPlan.empty, summary: undefined, screen: Screen.Flight })
  },

  send: (command) => {
    const { flight } = get()
    if (!flight || !flight.can(command)) return
    flight.apply(command)
    SaveGame.saveFlight({ setup: flight.setup, log: [...flight.log] })
    const keepPlan = command.type === CommandType.Survey
    set({ flightTick: get().flightTick + 1, plan: keepPlan ? get().plan : TurnPlan.empty })
  },

  togglePlan: (key) => {
    const { flight, plan } = get()
    const encounter = flight?.encounter
    if (!encounter || encounter.isOver) return
    if (!plan.has(key) && encounter.problemWith(key, plan)) return
    set({ plan: plan.toggle(key) })
  },

  clearPlan: () => set({ plan: TurnPlan.empty }),

  finishFlight: () => {
    const { flight, profile, loadout } = get()
    if (!flight || !flight.isOver) return
    const report = flight.report()
    const next = profile.afterFlight(report, loadout)
    SaveGame.saveProfile(next)
    SaveGame.clearFlight()
    set({
      profile: next,
      summary: { report, weekId: flight.week.id, rankBefore: profile.rank, lifetimeBefore: profile.lifetimePoints },
      flight: undefined,
      plan: TurnPlan.empty,
      loadout: next.rank > profile.rank ? loadout.withBus(BusCatalog.shared.largestFor(next.rank)) : loadout,
      screen: Screen.Debrief,
    })
  },

  buy: (moduleId) => {
    const { profile } = get()
    if (!lab.canBuy(profile, moduleId)) return
    const next = lab.buy(profile, moduleId)
    SaveGame.saveProfile(next)
    set({ profile: next })
  },

  markHint: (hint) => {
    const next = get().profile.withHintSeen(hint)
    SaveGame.saveProfile(next)
    set({ profile: next })
  },

  setLanguage: (language) => {
    SaveGame.saveLanguage(language)
    set({ language })
  },

  resetProgress: () => {
    SaveGame.eraseAll()
    const profile = Profile.starter()
    set({ profile, loadout: loadoutFor(profile), weekId: weekFor(profile).id, flight: undefined, summary: undefined, plan: TurnPlan.empty, screen: Screen.Home })
  },

  markWorldReady: () => set({ worldReady: true }),
}))
