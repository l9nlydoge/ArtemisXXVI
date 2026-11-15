import { AmbienceMixer, AmbiencePlace } from './Ambience/AmbienceMixer'
import type { CueParams } from './Cue'
import { CueLibrary, type CueName } from './CueLibrary'
import { LaunchHandle } from './Cues/LaunchCues'
import { SoundEngine } from './SoundEngine'
import { SoundSettings } from './SoundSettings'
import { TurnTimer } from './TurnTimer'

export interface LaunchControl {
  liftoff(): void
  climb(seconds?: number): void
  stageSeparation(): void
  fairingRelease(): void
  deploy(): void
  stop(): void
}

export type DrivenCue = CueName | 'Launch' | 'OrbitSpeed'

export interface CueRecord {
  name: string
  params: CueParams
  at: number
}

class SilentLaunch implements LaunchControl {
  liftoff(): void {}
  climb(): void {}
  stageSeparation(): void {}
  fairingRelease(): void {}
  deploy(): void {}
  stop(): void {}
}

class LiveSound {
  readonly engine: SoundEngine
  readonly mixer: AmbienceMixer
  readonly library = new CueLibrary()

  constructor(readonly context: AudioContext) {
    this.engine = new SoundEngine(context)
    this.mixer = new AmbienceMixer(this.engine)
  }
}

export class SoundSystem {
  private live?: LiveSound
  private failed = false
  private on = SoundSettings.loadEnabled()
  private place = AmbiencePlace.Silent
  private orbitSpeed = 0.35
  private storm = 0.4
  private readonly driven = new Set<DrivenCue>()
  private readonly listeners = new Set<(record: CueRecord) => void>()
  private readonly enabledListeners = new Set<(enabled: boolean) => void>()
  private ticker?: ReturnType<typeof setInterval>
  private timer?: { clock: TurnTimer; started: number; handle: ReturnType<typeof setInterval> }

  get enabled(): boolean {
    return this.on
  }

  get started(): boolean {
    return this.live !== undefined
  }

  get contextState(): string {
    return this.live?.context.state ?? 'none'
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.on) return
    this.on = enabled
    SoundSettings.saveEnabled(enabled)
    for (const listener of this.enabledListeners) listener(enabled)
    this.guard(() => {
      const live = this.live
      if (!live) return
      const now = live.context.currentTime
      live.engine.master.gain.cancelScheduledValues(now)
      live.engine.master.gain.setTargetAtTime(enabled ? SoundEngine.masterLevel : 0, now, 0.08)
      if (enabled) SoundSystem.quietly(live.context.resume())
      else setTimeout(() => this.guard(() => !this.on && SoundSystem.quietly(live.context.suspend())), 400)
    })
  }

  toggle(): void {
    this.setEnabled(!this.on)
  }

  onEnabledChange(listener: (enabled: boolean) => void): () => void {
    this.enabledListeners.add(listener)
    return () => this.enabledListeners.delete(listener)
  }

  unlock(): void {
    if (this.failed) return
    this.guard(() => {
      if (!this.live) {
        const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Context) {
          this.failed = true
          return
        }
        this.live = new LiveSound(new Context({ latencyHint: 'interactive' }))
        if (!this.on) this.live.engine.master.gain.value = 0
        this.live.mixer.setOrbitSpeed(this.orbitSpeed)
        this.live.mixer.setStorm(this.storm)
        this.live.mixer.set(this.place)
        this.ticker = setInterval(() => this.guard(() => this.live?.context.state === 'running' && this.live.mixer.tick()), 1000)
      }
      if (this.on && this.live.context.state === 'suspended' && !document.hidden) SoundSystem.quietly(this.live.context.resume())
    })
  }

  pause(): void {
    this.guard(() => this.live?.context.state === 'running' && SoundSystem.quietly(this.live.context.suspend()))
  }

  resume(): void {
    this.guard(() => this.on && this.live?.context.state === 'suspended' && SoundSystem.quietly(this.live.context.resume()))
  }

  play(name: CueName, params: CueParams = {}, delay = 0): void {
    this.record(name, params)
    this.guard(() => {
      const live = this.ready()
      if (!live) return
      live.library.get(name)?.play(live.engine, live.engine.now + Math.max(0, delay), params)
    })
  }

  ambience(place: AmbiencePlace | keyof typeof AmbiencePlace): void {
    const next = AmbiencePlace[place as keyof typeof AmbiencePlace] ?? AmbiencePlace.Silent
    if (next === this.place) return
    this.place = next
    this.record(`Ambience:${next}`, {})
    this.guard(() => this.live?.mixer.set(next))
  }

  get currentAmbience(): AmbiencePlace {
    return this.place
  }

  setOrbitSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return
    this.orbitSpeed = Math.max(0, Math.min(1, speed))
    this.guard(() => this.live?.mixer.setOrbitSpeed(this.orbitSpeed))
  }

  setStorm(level: number): void {
    if (!Number.isFinite(level)) return
    this.storm = Math.max(0, Math.min(1, level))
    this.guard(() => this.live?.mixer.setStorm(this.storm))
  }

  launch(options: { manual?: boolean } = {}): LaunchControl {
    this.record('Launch', { amount: options.manual ? 0 : 1 })
    try {
      const live = this.ready()
      if (!live) return new SilentLaunch()
      const parts = {
        ignition: live.library.get('Ignition')!,
        separation: live.library.get('StageSeparation')!,
        fairing: live.library.get('FairingRelease')!,
        deploy: live.library.get('Deploy')!,
      }
      return new LaunchHandle(live.engine, parts, live.engine.now + 0.02, !options.manual)
    } catch {
      return new SilentLaunch()
    }
  }

  startTurnTimer(seconds = 30): void {
    this.stopTurnTimer()
    const clock = new TurnTimer(seconds)
    const started = performance.now()
    const handle = setInterval(() => {
      for (const cue of clock.cuesAt((performance.now() - started) / 1000)) this.play(cue)
      if (clock.finished) this.stopTurnTimer()
    }, 100)
    this.timer = { clock, started, handle }
  }

  stopTurnTimer(): void {
    if (this.timer) clearInterval(this.timer.handle)
    this.timer = undefined
  }

  sceneDrives(cue: DrivenCue, driven = true): void {
    if (driven) this.driven.add(cue)
    else this.driven.delete(cue)
  }

  isDrivenByScene(cue: DrivenCue): boolean {
    return this.driven.has(cue)
  }

  onCue(listener: (record: CueRecord) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    this.stopTurnTimer()
    if (this.ticker) clearInterval(this.ticker)
    this.guard(() => SoundSystem.quietly(this.live?.context.close()))
    this.live = undefined
  }

  private ready(): LiveSound | undefined {
    const live = this.live
    if (!live || !this.on || live.context.state === 'closed') return undefined
    if (typeof document !== 'undefined' && document.hidden) return undefined
    return live
  }

  private record(name: string, params: CueParams): void {
    if (this.listeners.size === 0) return
    const record = { name, params, at: typeof performance === 'undefined' ? 0 : performance.now() }
    for (const listener of this.listeners) listener(record)
  }

  private static quietly(promise?: Promise<unknown>): void {
    promise?.catch(() => undefined)
  }

  private guard(action: () => unknown): void {
    try {
      action()
    } catch {
      return
    }
  }
}

export const Sound = new SoundSystem()
