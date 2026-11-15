import { Bus, type SoundEngine } from './SoundEngine'
import type { Voice } from './Voice'

export interface CueParams {
  amount?: number
  duration?: number
  direction?: number
  remaining?: number
  pan?: number
  level?: number
}

export abstract class Cue {
  abstract readonly name: string
  abstract readonly description: string
  readonly bus: Bus = Bus.Effects
  readonly level: number = 1
  readonly reverb: number = 0.12
  readonly gap: number = 0.03
  readonly length: number = 1
  private lastAt = -1

  play(engine: SoundEngine, at: number, params: CueParams = {}): Voice | undefined {
    if (this.lastAt >= 0 && at - this.lastAt < this.gap && at >= this.lastAt) return undefined
    const voice = engine.voice({
      bus: this.bus,
      at,
      level: this.level * (params.level ?? 1) * engine.random.level(1.2),
      pan: params.pan ?? 0,
      reverb: this.reverb,
    })
    if (!voice) return undefined
    this.lastAt = voice.at
    this.build(voice, params)
    voice.finish()
    return voice
  }

  lengthFor(params: CueParams): number {
    return this.length + (params.duration ?? 0)
  }

  protected abstract build(voice: Voice, params: CueParams): void

  protected static amount(params: CueParams, fallback = 1): number {
    const value = params.amount ?? fallback
    return Number.isFinite(value) ? Math.max(0, value) : fallback
  }

  protected static clamp(value: number, low = 0, high = 1): number {
    return Math.max(low, Math.min(high, value))
  }
}

export abstract class InterfaceCue extends Cue {
  override readonly bus: Bus = Bus.Interface
  override readonly reverb: number = 0.06
  override readonly length: number = 0.4
}
