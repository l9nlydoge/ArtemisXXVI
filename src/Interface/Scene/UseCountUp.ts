import { useEffect, useRef, useState } from 'react'
import { MotionPreference } from '../Shared/MotionPreference'
import { SceneClock } from './SceneClock'

const CountMs = 400
const Steps = 8

export function useCountUp(target: number): { value: number; counting: boolean } {
  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    if (target <= shown || MotionPreference.reduced) {
      setShown(target)
      return
    }
    from.current = shown
    const started = SceneClock.shared.now
    const stop = SceneClock.shared.listen((now) => {
      const step = Math.min(Steps, Math.floor(((now - started) / CountMs) * Steps))
      setShown(Math.round(from.current + ((target - from.current) * step) / Steps))
      if (step >= Steps) stop()
    })
    return stop
  }, [target])

  return { value: shown, counting: shown !== target }
}
