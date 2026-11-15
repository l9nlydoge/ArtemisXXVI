import { useEffect, useRef, useState } from 'react'
import type { Flight } from '../../Engine/Flight/Flight'
import { MotionPreference } from '../Shared/MotionPreference'
import { Orbit, OrbitPace } from './Orbit'
import { SceneClock } from './SceneClock'
import { TravelBeat, TravelUsual } from './TravelBeat'

export interface Travel {
  gain: number
  full: boolean
  skip: () => void
}

export function useTravelBeat(flight: Flight | undefined): Travel | undefined {
  const leg = flight?.legIndex ?? 0
  const lastLeg = useRef(leg)
  const lastCharge = useRef(flight?.state.charge ?? 0)
  const [travel, setTravel] = useState<{ gain: number; full: boolean; started: number } | undefined>(undefined)

  useEffect(() => {
    const charge = flight?.state.charge ?? 0
    if (flight && leg > lastLeg.current && !flight.isOver && !MotionPreference.reduced) {
      setTravel({ gain: Math.max(0, charge - lastCharge.current), full: charge >= flight.craft.capacity, started: SceneClock.shared.now })
    }
    lastLeg.current = leg
    lastCharge.current = charge
  })

  useEffect(() => {
    if (!travel) return
    const orbit = Orbit.shared
    const beat = new TravelBeat(TravelUsual, OrbitPace.Travel, OrbitPace.Scan)
    const finish = () => {
      orbit.hold(undefined)
      orbit.aim(OrbitPace.Scan)
      setTravel(undefined)
    }
    const stop = SceneClock.shared.listen((now) => {
      const elapsed = now - travel.started
      if (beat.done(elapsed)) {
        finish()
        return
      }
      orbit.hold(beat.pace(elapsed))
    })
    const skip = (event: Event) => {
      event.preventDefault()
      finish()
    }
    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    return () => {
      stop()
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
      orbit.hold(undefined)
    }
  }, [travel])

  return travel && { gain: travel.gain, full: travel.full, skip: () => setTravel(undefined) }
}
