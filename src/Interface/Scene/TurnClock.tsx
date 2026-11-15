import { useEffect, useRef, useState } from 'react'
import { useWording } from '../../I18n/UseTranslator'
import { Sound } from '../Sound/Sound'
import { SceneClock } from './SceneClock'
import { TurnSeconds, TurnTimer } from './TurnTimer'

const Cells = 10
const SoundLead = 0.2

export function useTurnTimer(turnKey: string, paused: boolean, onExpire: () => void): TurnTimer {
  const timer = useRef(new TurnTimer())
  const key = useRef(turnKey)
  const pausedNow = useRef(paused)
  const expire = useRef(onExpire)
  const [, setSeconds] = useState(TurnSeconds)
  pausedNow.current = paused
  expire.current = onExpire
  const voiced = useRef(false)
  if (key.current !== turnKey) {
    key.current = turnKey
    timer.current = new TurnTimer()
  }

  useEffect(() => {
    const clock = SceneClock.shared
    const silence = () => {
      if (voiced.current) Sound.stopTurnTimer()
      voiced.current = false
    }
    const onVisibility = () => document.hidden && silence()
    let voicedTimer = timer.current
    const stop = clock.listen((now) => {
      const current = timer.current
      const fired = current.update(now, pausedNow.current)
      setSeconds(current.seconds)
      if (current !== voicedTimer) {
        silence()
        voicedTimer = current
      }
      if (fired) {
        silence()
        Sound.play('TimeOut')
        expire.current()
        return
      }
      const running = !pausedNow.current && !current.expired && !document.hidden
      if (running && !voiced.current) {
        Sound.startTurnTimer(current.remaining / 1000 + SoundLead)
        voiced.current = true
      } else if (!running) silence()
    })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      silence()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return timer.current
}

export function TurnClock({ timer, paused }: { timer: TurnTimer; paused: boolean }) {
  const wording = useWording()
  const lit = Math.ceil(timer.share * Cells)
  return (
    <div className={`TurnClock Is${timer.tone} ${paused ? 'IsPaused' : ''}`} role="timer" aria-label={wording.t('Timer.Label')} aria-live="off">
      <span className="TurnClockText">{wording.t('Timer.Seconds', { seconds: timer.seconds })}</span>
      <span className="TurnClockCells" aria-hidden="true">
        {Array.from({ length: Cells }, (_, at) => <span key={at} className={`TurnClockCell ${at < lit ? 'IsOn' : ''}`} />)}
      </span>
    </div>
  )
}
