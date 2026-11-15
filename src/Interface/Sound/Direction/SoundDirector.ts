import { useGameStore } from '../../../State/GameStore'
import type { SoundSystem } from '../Sound'
import { CueRules, type SoundEvent } from './CueRules'
import { SnapshotReader, type GameSnapshot } from './GameSnapshot'

export class SoundDirector {
  private last?: GameSnapshot
  private unsubscribe?: () => void

  constructor(private readonly sound: SoundSystem) {}

  start(): void {
    if (this.unsubscribe) return
    try {
      this.last = SnapshotReader.read(useGameStore.getState())
      this.apply(CueRules.opening(this.last))
      this.unsubscribe = useGameStore.subscribe((state) => this.observe(state))
    } catch {
      this.stop()
    }
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  private observe(state: ReturnType<typeof useGameStore.getState>): void {
    try {
      const next = SnapshotReader.read(state)
      const before = this.last
      this.last = next
      if (before) this.apply(CueRules.derive(before, next))
    } catch {
      return
    }
  }

  private apply(events: readonly SoundEvent[]): void {
    for (const event of events) {
      switch (event.kind) {
        case 'Cue':
          if (!this.sound.isDrivenByScene(event.name)) this.sound.play(event.name, event.params, event.delay)
          break
        case 'Launch':
          if (!this.sound.isDrivenByScene('Launch')) this.sound.launch()
          break
        case 'Ambience':
          this.sound.ambience(event.place)
          break
        case 'Orbit':
          if (!this.sound.isDrivenByScene('OrbitSpeed')) this.sound.setOrbitSpeed(event.speed)
          break
        case 'Storm':
          this.sound.setStorm(event.level)
          break
      }
    }
  }
}
