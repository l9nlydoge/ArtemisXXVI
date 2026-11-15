import { useMemo } from 'react'
import type { TextRef } from '../Engine/Core/TextRef'
import { useGameStore } from '../State/GameStore'
import { Translator } from './Translator'

export class Wording {
  constructor(readonly translator: Translator) {}

  t(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    return this.translator.t(key, params)
  }

  text(ref: TextRef): string {
    return this.translator.t(ref.key, ref.params)
  }

  number(value: number): string {
    return this.translator.number(value)
  }

  date(dateUtc: string): string {
    return new Intl.DateTimeFormat(this.translator.language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateUtc))
  }

  dayRange(startUtc: string, endUtc: string): string {
    const format = new Intl.DateTimeFormat(this.translator.language, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    const last = new Date(Date.parse(endUtc) - 1)
    const first = new Date(startUtc)
    const sameDay = first.toISOString().slice(0, 10) === last.toISOString().slice(0, 10)
    return sameDay ? format.format(first) : `${format.format(first)} – ${format.format(last)}`
  }
}

export function useWording(): Wording {
  const language = useGameStore((state) => state.language)
  return useMemo(() => new Wording(new Translator(language)), [language])
}
