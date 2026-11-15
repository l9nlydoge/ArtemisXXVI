import { Cue } from '../Cue'
import { NoiseColour } from '../NoiseBank'
import { Bus, type SoundEngine } from '../SoundEngine'
import type { Voice } from '../Voice'

export class StageSeparationCue extends Cue {
  readonly name = 'StageSeparation'
  readonly description = 'Launch: the spent stage lets go, a deep thump with a metallic clank.'
  override readonly reverb = 0.35
  override readonly length = 1.4

  protected build(voice: Voice): void {
    voice.tone({ type: 'sine', frequency: 120, to: 55, glide: 0.3, envelope: { attack: 0.003, release: 0.35, peak: 0.22 } })
    voice.tone({ type: 'triangle', frequency: 330, to: 150, glide: 0.18, envelope: { attack: 0.003, release: 0.25, peak: 0.34 } })
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.002, release: 0.3, peak: 0.4 }, filter: { type: 'lowpass', frequency: 1600 } })
    voice.bell({ frequency: 415, ratio: 1.41, index: 2.2, start: 0.03, decay: 0.7, peak: 0.18 })
    voice.noise({ start: 0.02, envelope: { attack: 0.001, release: 0.03, peak: 0.22 }, filter: { type: 'highpass', frequency: 2000 } })
  }
}

export class FairingReleaseCue extends Cue {
  readonly name = 'FairingRelease'
  readonly description = 'Launch: two pyro pops and the fairing halves falling away.'
  override readonly reverb = 0.3
  override readonly length = 1.2

  protected build(voice: Voice): void {
    for (const [start, pan] of [[0, -0.35], [0.06, 0.35]] as const) {
      voice.noise({ start, pan, envelope: { attack: 0.001, release: 0.04, peak: 0.34 }, filter: { type: 'bandpass', frequency: 1800, q: 0.8 } })
      voice.tone({ type: 'triangle', frequency: 330, to: 180, glide: 0.06, start, pan, envelope: { attack: 0.002, release: 0.07, peak: 0.18 } })
    }
    voice.noise({ colour: NoiseColour.Pink, start: 0.1, envelope: { attack: 0.05, release: 0.6, peak: 0.2 }, filter: { type: 'bandpass', frequency: 2200, to: 500, time: 0.6, q: 1.3 } })
  }
}

export class DeployCue extends Cue {
  readonly name = 'Deploy'
  readonly description = 'Launch: the satellite unfolds, a quiet servo and a three-note chime.'
  override readonly reverb = 0.45
  override readonly length = 2.6

  protected build(voice: Voice): void {
    voice.tone({ type: 'triangle', frequency: 480, to: 640, glide: 0.4, envelope: { attack: 0.05, hold: 0.25, release: 0.1, peak: 0.05 }, filter: { type: 'lowpass', frequency: 1800 } })
    ;[1046.5, 1318.5, 1568].forEach((frequency, index) => {
      voice.bell({ frequency, ratio: 2, index: 0.7, start: 0.42 + index * 0.16, decay: index === 2 ? 1.6 : 0.9, peak: 0.1 })
    })
  }
}

export class IgnitionCue extends Cue {
  readonly name = 'Ignition'
  readonly description = 'Launch: engines light, a crackling rumble that builds.'
  override readonly reverb = 0.2
  override readonly length = 2

  protected build(voice: Voice): void {
    voice.noise({ colour: NoiseColour.Brown, envelope: { attack: 1.1, hold: 0.2, release: 0.5, peak: 0.28 }, filter: { type: 'lowpass', frequency: 200, to: 900, time: 1.2 } })
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 1, hold: 0.2, release: 0.5, peak: 0.24 }, filter: { type: 'bandpass', frequency: 500, to: 1200, time: 1.1, q: 0.8 } })
    let at = 0
    for (let index = 0; index < 40 && at < 1.4; index++) {
      at += -Math.log(1 - voice.random.next()) * 0.035
      voice.noise({ start: at, envelope: { attack: 0.0005, release: 0.006, peak: voice.random.range(0.05, 0.16) * Math.min(1, at + 0.3) }, filter: { type: 'bandpass', frequency: voice.random.range(1200, 3500), q: 1.5 }, pan: voice.random.spread(0.5) })
    }
  }
}

export class RoarVoice {
  private readonly lowpass: BiquadFilterNode
  private readonly highpass: BiquadFilterNode
  private readonly level: GainNode
  private readonly voice?: Voice

  constructor(engine: SoundEngine, at: number, seconds: number) {
    this.voice = engine.voice({ bus: Bus.Effects, at, level: 1, reverb: 0.25 })
    const context = engine.context
    this.level = context.createGain()
    this.level.gain.value = 0
    this.lowpass = context.createBiquadFilter()
    this.lowpass.type = 'lowpass'
    this.lowpass.frequency.value = 1500
    this.highpass = context.createBiquadFilter()
    this.highpass.type = 'highpass'
    this.highpass.frequency.value = 50
    if (!this.voice) return
    const voice = this.voice
    voice.track(this.level)
    voice.track(this.lowpass)
    voice.track(this.highpass)
    this.highpass.connect(this.lowpass)
    this.lowpass.connect(this.level)
    this.level.connect(voice.output)
    const body = voice.gain(1, this.highpass)
    voice.lfo(body.gain, 3.1, 0.18, 0, seconds)
    voice.noise({ colour: NoiseColour.Brown, into: body, envelope: { attack: 0.01, hold: seconds, release: 0.2, peak: 0.42 } })
    voice.noise({ colour: NoiseColour.Pink, into: body, envelope: { attack: 0.01, hold: seconds, release: 0.2, peak: 0.36 }, filter: { type: 'bandpass', frequency: 800, q: 0.6 } })
    voice.finish()
  }

  liftoff(at: number): void {
    const param = this.level.gain
    param.cancelScheduledValues(at)
    param.setValueAtTime(param.value, at)
    param.linearRampToValueAtTime(0.7, at + 0.9)
  }

  thin(at: number, seconds: number): void {
    this.level.gain.setTargetAtTime(0, at, seconds / 3.5)
    this.lowpass.frequency.setTargetAtTime(420, at, seconds / 3)
    this.highpass.frequency.setTargetAtTime(260, at, seconds / 3)
  }

  stop(at: number): void {
    this.voice?.stopAt(at, 0.3)
  }
}

export interface LaunchTimeline {
  liftoff: number
  thin: number
  thinFor: number
  separation: number
  fairing: number
  deploy: number
  end: number
}

export class LaunchHandle {
  static readonly timeline: LaunchTimeline = { liftoff: 1.1, thin: 2.2, thinFor: 4.6, separation: 3.6, fairing: 4.9, deploy: 6.3, end: 9.4 }
  private readonly roar: RoarVoice
  private released = false

  constructor(
    private readonly engine: SoundEngine,
    private readonly parts: { ignition: Cue; separation: Cue; fairing: Cue; deploy: Cue },
    readonly startedAt: number,
    automatic: boolean,
  ) {
    this.roar = new RoarVoice(engine, startedAt, 14)
    parts.ignition.play(engine, startedAt)
    if (!automatic) return
    const plan = LaunchHandle.timeline
    this.roar.liftoff(startedAt + plan.liftoff)
    this.roar.thin(startedAt + plan.thin, plan.thinFor)
    parts.separation.play(engine, startedAt + plan.separation)
    parts.fairing.play(engine, startedAt + plan.fairing)
    parts.deploy.play(engine, startedAt + plan.deploy)
    this.released = true
  }

  liftoff(): void {
    this.roar.liftoff(this.engine.now)
  }

  climb(seconds = 4): void {
    this.roar.thin(this.engine.now, seconds)
  }

  stageSeparation(): void {
    this.parts.separation.play(this.engine, this.engine.now)
  }

  fairingRelease(): void {
    this.parts.fairing.play(this.engine, this.engine.now)
  }

  deploy(): void {
    this.parts.deploy.play(this.engine, this.engine.now)
    if (!this.released) this.roar.thin(this.engine.now, 1.5)
  }

  stop(): void {
    this.roar.stop(this.engine.now)
  }
}
