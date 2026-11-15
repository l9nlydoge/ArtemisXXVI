import { NoiseColour } from '../NoiseBank'
import { Bus, type SoundEngine } from '../SoundEngine'
import type { Variation } from '../Variation'

interface Walker {
  param: AudioParam
  low: number
  high: number
  shortest: number
  longest: number
  next: number
}

interface Sparkle {
  notes: readonly number[]
  shortest: number
  longest: number
  peak: number
  next: number
}

export interface NoiseLayer {
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
}

export abstract class AmbienceBed {
  readonly output: GainNode
  protected readonly random: Variation
  private readonly nodes: AudioNode[] = []
  private readonly sources: AudioScheduledSourceNode[] = []
  private readonly walkers: Walker[] = []
  private sparkle?: Sparkle
  private scheduledUntil = 0
  private stopped = false

  constructor(protected readonly engine: SoundEngine) {
    this.random = engine.random
    this.output = engine.context.createGain()
    this.output.gain.value = 0
    this.output.connect(engine.bus(Bus.Ambience))
  }

  protected get context(): BaseAudioContext {
    return this.engine.context
  }

  start(at: number, fade: number): void {
    this.build(at)
    for (const source of this.sources) {
      if (source instanceof AudioBufferSourceNode && source.buffer) source.start(at, this.random.time(source.buffer.duration))
      else source.start(at)
    }
    this.output.gain.setValueAtTime(0, at)
    this.output.gain.linearRampToValueAtTime(this.level, at + Math.max(0.05, fade))
    this.scheduledUntil = at
    for (const walker of this.walkers) {
      walker.next = at
      walker.param.setValueAtTime(walker.param.value, at)
    }
    if (this.sparkle) this.sparkle.next = at + this.random.range(this.sparkle.shortest * 0.4, this.sparkle.shortest)
  }

  stop(at: number, fade: number): void {
    if (this.stopped) return
    this.stopped = true
    const param = this.output.gain
    param.cancelScheduledValues(at)
    param.setValueAtTime(param.value, at)
    param.linearRampToValueAtTime(0, at + fade)
    const end = at + fade + 0.05
    for (const source of this.sources) source.stop(end)
    const last = this.sources[0]
    if (last) last.onended = () => this.dispose()
    else this.dispose()
  }

  get isStopped(): boolean {
    return this.stopped
  }

  evolve(until: number): void {
    if (this.stopped || until <= this.scheduledUntil) return
    for (const walker of this.walkers) {
      while (walker.next < until) {
        const step = this.random.range(walker.shortest, walker.longest)
        walker.next += step
        walker.param.linearRampToValueAtTime(this.random.range(walker.low, walker.high), walker.next)
      }
    }
    const sparkle = this.sparkle
    if (sparkle) {
      while (sparkle.next < until) {
        this.ring(sparkle.next, this.random.pick(sparkle.notes), sparkle.peak)
        sparkle.next += this.random.range(sparkle.shortest, sparkle.longest)
      }
    }
    this.grains(this.scheduledUntil, until)
    this.scheduledUntil = until
  }

  setOrbitSpeed(speed: number, at: number): void {
    void speed
    void at
  }

  setStorm(level: number, at: number): void {
    void level
    void at
  }

  protected abstract readonly level: number

  protected abstract build(at: number): void

  protected grains(from: number, until: number): void {
    void from
    void until
  }

  protected track<T extends AudioNode>(node: T): T {
    this.nodes.push(node)
    return node
  }

  protected gain(value: number, into: AudioNode = this.output): GainNode {
    const node = this.track(this.context.createGain())
    node.gain.value = value
    node.connect(into)
    return node
  }

  protected filter(type: BiquadFilterType, frequency: number, q = 0.7, into: AudioNode = this.output): BiquadFilterNode {
    const node = this.track(this.context.createBiquadFilter())
    node.type = type
    node.frequency.value = frequency
    node.Q.value = q
    node.connect(into)
    return node
  }

  protected drone(type: OscillatorType, frequency: number, level: number, into: AudioNode = this.output, drift = 6): OscillatorNode {
    const amp = this.gain(level, into)
    const oscillator = this.track(this.context.createOscillator())
    oscillator.type = type
    oscillator.frequency.value = frequency
    oscillator.detune.value = this.random.spread(drift)
    oscillator.connect(amp)
    this.sources.push(oscillator)
    this.wander(oscillator.detune, -drift, drift, 4, 9)
    this.wander(amp.gain, level * 0.55, level, 5, 12)
    return oscillator
  }

  protected noise(colour: NoiseColour, type: BiquadFilterType, frequency: number, q: number, level: number, into: AudioNode = this.output): NoiseLayer {
    const gain = this.gain(level, into)
    const filter = this.filter(type, frequency, q, gain)
    const source = this.track(this.context.createBufferSource())
    source.buffer = this.engine.noise.get(colour)
    source.loop = true
    source.connect(filter)
    this.sources.push(source)
    this.wander(source.playbackRate, 0.93, 1.07, 3, 7)
    return { source, filter, gain }
  }

  protected wander(param: AudioParam, low: number, high: number, shortest: number, longest: number): void {
    this.walkers.push({ param, low, high, shortest, longest, next: 0 })
  }

  protected shimmer(notes: readonly number[], shortest: number, longest: number, peak: number): void {
    this.sparkle = { notes, shortest, longest, peak, next: 0 }
  }

  protected ring(at: number, frequency: number, peak: number): void {
    const voice = this.engine.voice({ bus: Bus.Ambience, at, into: this.output, level: 1, pan: this.random.spread(0.7), reverb: 0.8 })
    if (!voice) return
    voice.bell({ frequency: frequency * this.random.pitch(8), ratio: this.random.pick([2, 3.5, 1.41]), index: 0.6, decay: this.random.range(2, 3.5), peak })
    voice.finish()
  }

  protected grainSource(at: number, release: number, peak: number, into: AudioNode): void {
    const amp = this.context.createGain()
    amp.gain.setValueAtTime(0, at)
    amp.gain.linearRampToValueAtTime(peak, at + 0.0008)
    amp.gain.exponentialRampToValueAtTime(Math.max(0.00002, peak * 0.001), at + release)
    amp.connect(into)
    const source = this.context.createBufferSource()
    source.buffer = this.engine.noise.get(NoiseColour.White)
    source.connect(amp)
    source.onended = () => {
      source.disconnect()
      amp.disconnect()
    }
    source.start(at, this.random.time(3))
    source.stop(at + release + 0.01)
  }

  private dispose(): void {
    for (const node of this.nodes) node.disconnect()
    this.output.disconnect()
  }
}
