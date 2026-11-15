import { useEffect } from 'react'
import { SoundDirector } from './Direction/SoundDirector'
import { InputFeedback } from './InputFeedback'
import { Sound, type CueRecord } from './Sound'
import { SoundToggle } from './SoundToggle'

declare global {
  interface Window {
    Artemis26Sound?: { log: CueRecord[]; sound: typeof Sound }
  }
}

export function SoundLayer() {
  useEffect(() => {
    const director = new SoundDirector(Sound)
    const feedback = new InputFeedback(Sound)
    const stopLog = import.meta.env.DEV ? SoundLayer.startLog() : undefined
    director.start()
    feedback.start()
    return () => {
      director.stop()
      feedback.stop()
      stopLog?.()
    }
  }, [])
  return <SoundToggle />
}

SoundLayer.startLog = (): (() => void) => {
  const log: CueRecord[] = window.Artemis26Sound?.log ?? []
  window.Artemis26Sound = { log, sound: Sound }
  return Sound.onCue((record) => {
    log.push(record)
    if (log.length > 2000) log.shift()
  })
}
