import { useEffect, useRef, useState } from 'react'
import { CommandType } from '../../Engine/Flight/FlightCommand'
import { FlightPhase, type Flight } from '../../Engine/Flight/Flight'
import type { TurnPlan } from '../../Engine/Flight/TurnPlan'
import { MotionPreference } from '../Shared/MotionPreference'
import { EncounterPart } from './EncounterPart'
import { FlightScene } from './FlightScene'

const BreakUpMs = 1300

export function useEncounterScene(flight: Flight | undefined, plan: TurnPlan, tick: number): boolean {
  const scene = FlightScene.shared
  const part = useRef<EncounterPart | undefined>(undefined)
  const seenTick = useRef(tick)
  const [endShown, setEndShown] = useState(!flight?.isOver)
  const encounter = flight?.encounter

  useEffect(() => {
    if (!flight || !encounter) {
      scene.setPart('Contact', undefined)
      part.current = undefined
      return
    }
    if (!part.current) part.current = new EncounterPart(flight.craft)
    scene.setPart('Contact', part.current)
    part.current.sync(encounter, plan.keys, scene.now)
  }, [flight, encounter, encounter?.turnIndex, encounter?.isOver, plan, tick])

  useEffect(() => {
    if (tick === seenTick.current) return
    seenTick.current = tick
    const last = flight?.log[flight.log.length - 1]
    const outcome = flight?.lastOutcome
    if (!flight || !last || last.type !== CommandType.Commit || !outcome) return
    part.current?.committed(scene, outcome, last.keys, scene.now)
  }, [tick])

  const lost = flight?.phase === FlightPhase.Lost
  useEffect(() => {
    if (!flight?.isOver) {
      setEndShown(false)
      return
    }
    if (!lost || MotionPreference.reduced) {
      setEndShown(true)
      return
    }
    scene.craft.breakUp(scene.now)
    const timer = window.setTimeout(() => setEndShown(true), BreakUpMs)
    return () => clearTimeout(timer)
  }, [flight?.isOver, lost])

  return endShown
}
