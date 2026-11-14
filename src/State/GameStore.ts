import { create } from 'zustand'
import type { Language } from '../I18n/Language'
import { Translator } from '../I18n/Translator'
import { Screen } from './Screen'

interface GameState {
  screen: Screen
  language: Language
  worldReady: boolean
  setLanguage(language: Language): void
  markWorldReady(): void
}

export const useGameStore = create<GameState>((set) => ({
  screen: Screen.Home,
  language: Translator.detect(),
  worldReady: false,
  setLanguage: (language) => set({ language }),
  markWorldReady: () => set({ worldReady: true }),
}))
