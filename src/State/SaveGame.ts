import type { FlightCommand } from '../Engine/Flight/FlightCommand'
import type { FlightSetup } from '../Engine/Flight/FlightSetup'
import { Profile } from '../Engine/Progress/Profile'
import { Language } from '../I18n/Language'

export interface SavedFlight {
  setup: FlightSetup
  log: FlightCommand[]
}

export class SaveGame {
  private static readonly profileKey = 'Artemis26.Profile.v1'
  private static readonly flightKey = 'Artemis26.Flight.v1'
  private static readonly languageKey = 'Artemis26.Language'

  static loadProfile(): Profile {
    return Profile.fromJson(SaveGame.read(SaveGame.profileKey))
  }

  static saveProfile(profile: Profile): void {
    SaveGame.write(SaveGame.profileKey, profile.toJson())
  }

  static loadFlight(): SavedFlight | undefined {
    const saved = SaveGame.read(SaveGame.flightKey)
    if (typeof saved !== 'object' || saved === null) return undefined
    const { setup, log } = saved as Partial<SavedFlight>
    return setup && Array.isArray(log) ? { setup, log } : undefined
  }

  static saveFlight(flight: SavedFlight): void {
    SaveGame.write(SaveGame.flightKey, flight)
  }

  static clearFlight(): void {
    SaveGame.remove(SaveGame.flightKey)
  }

  static loadLanguage(): Language | undefined {
    const saved = SaveGame.read(SaveGame.languageKey)
    return saved === Language.English || saved === Language.Turkish ? saved : undefined
  }

  static saveLanguage(language: Language): void {
    SaveGame.write(SaveGame.languageKey, language)
  }

  static eraseAll(): void {
    SaveGame.remove(SaveGame.profileKey)
    SaveGame.remove(SaveGame.flightKey)
  }

  private static read(key: string): unknown {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? undefined : JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  private static write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      return
    }
  }

  private static remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  }
}
