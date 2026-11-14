import { useEffect, useState } from 'react'
import { useTranslator } from '../I18n/UseTranslator'
import { useGameStore } from '../State/GameStore'

const GiveUpMs = 12000
const FadeMs = 1000

export function Veil() {
  const translator = useTranslator()
  const ready = useGameStore((state) => state.worldReady)
  const markWorldReady = useGameStore((state) => state.markWorldReady)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const fallback = window.setTimeout(markWorldReady, GiveUpMs)
    return () => window.clearTimeout(fallback)
  }, [markWorldReady])

  useEffect(() => {
    if (!ready) return
    const done = window.setTimeout(() => setGone(true), FadeMs)
    return () => window.clearTimeout(done)
  }, [ready])

  if (gone) return null
  return (
    <div className={`Veil ${ready ? 'IsLifted' : ''}`} role="status" aria-live="polite">
      <h1>{translator.t('App.Title')}</h1>
      <div className="VeilTrack"><span /></div>
      <p>{translator.t('Veil.Loading')}</p>
    </div>
  )
}
