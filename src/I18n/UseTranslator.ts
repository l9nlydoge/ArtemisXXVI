import { useMemo } from 'react'
import { useGameStore } from '../State/GameStore'
import { Translator } from './Translator'

export function useTranslator(): Translator {
  const language = useGameStore((state) => state.language)
  return useMemo(() => new Translator(language), [language])
}
