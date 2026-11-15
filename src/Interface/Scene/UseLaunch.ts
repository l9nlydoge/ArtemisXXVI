import { useEffect, useState } from 'react'
import type { Flight } from '../../Engine/Flight/Flight'
import { MotionPreference } from '../Shared/MotionPreference'
import { Sound } from '../Sound/Sound'
import { FlightScene } from './FlightScene'
import { LaunchPart } from './LaunchPart'

export class LaunchCue {
  private static pending = false

  static ask() {
    LaunchCue.pending = true
  }

  static {
    Sound.sceneDrives('Launch')
  }

  static take(): boolean {
    const asked = LaunchCue.pending
    LaunchCue.pending = false
    return asked
  }
}

export function useLaunch(flight: Flight | undefined, firstFlight: boolean): boolean {
  const [launching, setLaunching] = useState(() => {
    const asked = flight !== undefined && flight.log.length === 0 && LaunchCue.take()
    if (asked && MotionPreference.reduced) Sound.play('Deploy')
    return asked && !MotionPreference.reduced
  })

  useEffect(() => {
    if (!launching) return
    const scene = FlightScene.shared
    let part: LaunchPart | undefined
    scene.craft.visible = false
    const begin = requestAnimationFrame(() => {
      part = new LaunchPart(scene.now, firstFlight, () => setLaunching(false))
      scene.craft.visible = false
      scene.setPart('Launch', part)
    })
    const skip = (event: Event) => {
      event.preventDefault()
      part?.finish(scene, true)
      setLaunching(false)
    }
    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    return () => {
      cancelAnimationFrame(begin)
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
      scene.setPart('Launch', undefined)
      scene.craft.visible = true
      scene.craft.unfold = 1
    }
  }, [launching])

  return launching
}
