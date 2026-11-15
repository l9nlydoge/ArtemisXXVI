import { useEffect, useRef, useState } from 'react'
import { useWording } from '../../I18n/UseTranslator'
import { SceneClock } from './SceneClock'
import { TurnSeconds, TurnTimer } from './TurnTimer'

const Cells = 10

export function useTurnTimer(turnKey: string, paused: boolean, onExpire: () => void): TurnTimer {
  const timer = useRef(new TurnTimer())
  const key = useRef(turnKey)
  const pausedNow = useRef(paused)
  const expire = useRef(onExpire)
  const [, setSeconds] = useState(TurnSeconds)
  pausedNow.current = paused
  expire.current = onExpire
  if (key.current !== turnKey) {
    key.current = turnKey
    timer.current = new TurnTimer()
  }

  useEffect(() => {
    const clock = SceneClock.shared
    return clock.listen((now) => {
      const current = timer.current
      const fired = current.update(now, pausedNow.current)
      setSeconds(current.seconds)
      if (fired) expire.current()
    })
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
