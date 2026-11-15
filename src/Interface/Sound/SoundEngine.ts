import { NoiseBank } from './NoiseBank'
import { Variation } from './Variation'
import { Voice } from './Voice'

export enum Bus {
  Ambience = 'Ambience',
  Effects = 'Effects',
  Interface = 'Interface',
}

export interface VoiceRequest {
  bus: Bus
  at: number
  level?: number
  pan?: number
  reverb?: number
  into?: AudioNode
}

export class SoundEngine {
  static readonly maxVoices = 28
  static readonly masterLevel = 0.72
  readonly noise: NoiseBank
  readonly master: GainNode
  readonly reverbInput: GainNode
  readonly random: Variation
  private readonly buses = new Map<Bus, GainNode>()
  private voices = 0

  private readonly voiceLimit: number

  constructor(readonly context: BaseAudioContext, options: { seed?: number; voiceLimit?: number } = {}) {
    this.random = new Variation(options.seed)
    this.voiceLimit = options.voiceLimit ?? SoundEngine.maxVoices
    this.noise = new NoiseBank(context)
    this.master = context.createGain()
    this.master.gain.value = SoundEngine.masterLevel

    const glue = context.createDynamicsCompressor()
    glue.threshold.value = -20
    glue.knee.value = 12
    glue.ratio.value = 2.2
    glue.attack.value = 0.012
    glue.release.value = 0.28

    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -4
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.12

    const clip = context.createWaveShaper()
    clip.curve = SoundEngine.softClip()
    clip.oversample = '2x'

    const trim = context.createGain()
    trim.gain.value = 0.89

    this.master.connect(glue)
    glue.connect(limiter)
    limiter.connect(clip)
    clip.connect(trim)
    trim.connect(context.destination)

    const levels: Record<Bus, number> = { [Bus.Ambience]: 0.36, [Bus.Effects]: 0.9, [Bus.Interface]: 0.55 }
    for (const bus of [Bus.Ambience, Bus.Effects, Bus.Interface]) {
      const gain = context.createGain()
      gain.gain.value = levels[bus]
      gain.connect(this.master)
      this.buses.set(bus, gain)
    }

    this.reverbInput = context.createGain()
    this.reverbInput.gain.value = 1
    const lowCut = context.createBiquadFilter()
    lowCut.type = 'highpass'
    lowCut.frequency.value = 180
    const convolver = context.createConvolver()
    convolver.normalize = true
    convolver.buffer = this.noise.impulse
    const wet = context.createGain()
    wet.gain.value = 0.55
    this.reverbInput.connect(lowCut)
    lowCut.connect(convolver)
    convolver.connect(wet)
    wet.connect(this.master)
  }

  get now(): number {
    return this.context.currentTime
  }

  bus(bus: Bus): GainNode {
    return this.buses.get(bus)!
  }

  get activeVoices(): number {
    return this.voices
  }

  voice(request: VoiceRequest): Voice | undefined {
    if (this.voices >= this.voiceLimit) return undefined
    this.voices += 1
    return new Voice(
      this,
      Math.max(request.at, this.context.currentTime),
      this.random,
      request.into ?? this.bus(request.bus),
      request.level ?? 1,
      request.pan ?? 0,
      request.reverb ?? 0,
      () => {
        this.voices = Math.max(0, this.voices - 1)
      },
    )
  }

  setBusLevel(bus: Bus, level: number, seconds = 0.3): void {
    const param = this.bus(bus).gain
    param.cancelScheduledValues(this.now)
    param.setTargetAtTime(level, this.now, seconds / 3)
  }

  private static softClip(): Float32Array<ArrayBuffer> {
    const size = 2048
    const curve = new Float32Array(size)
    for (let index = 0; index < size; index++) {
      const x = (index / (size - 1)) * 2 - 1
      curve[index] = Math.abs(x) < 0.6 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh((Math.abs(x) - 0.6) / 0.4))
    }
    return curve
  }
}
