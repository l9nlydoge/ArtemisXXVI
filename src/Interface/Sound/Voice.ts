import { NoiseColour } from './NoiseBank'
import type { SoundEngine } from './SoundEngine'
import type { Variation } from './Variation'

export interface Envelope {
  attack: number
  hold?: number
  release: number
  peak: number
}

export interface FilterShape {
  type: BiquadFilterType
  frequency: number
  q?: number
  to?: number
  time?: number
}

export interface ToneOptions {
  type?: OscillatorType
  frequency: number
  to?: number
  glide?: number
  start?: number
  envelope: Envelope
  detune?: number
  filter?: FilterShape
  pan?: number
  into?: AudioNode
}

export interface NoiseOptions {
  colour?: NoiseColour
  start?: number
  envelope: Envelope
  filter?: FilterShape
  second?: FilterShape
  rate?: number
  pan?: number
  into?: AudioNode
}

export interface BellOptions {
  frequency: number
  ratio?: number
  index?: number
  start?: number
  decay: number
  peak: number
  pan?: number
  into?: AudioNode
}

export class Voice {
  readonly output: GainNode
  private readonly nodes: AudioNode[] = []
  private readonly sources: AudioScheduledSourceNode[] = []
  private ended = 0
  private last = 0
  private closed = false

  constructor(
    readonly engine: SoundEngine,
    readonly at: number,
    readonly random: Variation,
    destination: AudioNode,
    level: number,
    pan: number,
    reverb: number,
    private readonly onClose: () => void,
  ) {
    const context = engine.context
    this.output = context.createGain()
    this.output.gain.value = level
    const panner = context.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, pan))
    this.output.connect(panner)
    panner.connect(destination)
    this.nodes.push(this.output, panner)
    if (reverb > 0) {
      const send = context.createGain()
      send.gain.value = reverb
      panner.connect(send)
      send.connect(engine.reverbInput)
      this.nodes.push(send)
    }
  }

  get context(): BaseAudioContext {
    return this.engine.context
  }

  time(offset: number): number {
    return this.at + Math.max(0, offset)
  }

  gain(value = 1, into: AudioNode = this.output): GainNode {
    const node = this.context.createGain()
    node.gain.value = value
    node.connect(into)
    this.nodes.push(node)
    return node
  }

  panned(pan: number, into: AudioNode = this.output): AudioNode {
    if (pan === 0) return into
    const node = this.context.createStereoPanner()
    node.pan.value = Math.max(-1, Math.min(1, pan))
    node.connect(into)
    this.nodes.push(node)
    return node
  }

  filter(shape: FilterShape, start: number, into: AudioNode): BiquadFilterNode {
    const node = this.context.createBiquadFilter()
    node.type = shape.type
    node.frequency.setValueAtTime(shape.frequency, this.time(start))
    if (shape.to !== undefined) node.frequency.exponentialRampToValueAtTime(Math.max(20, shape.to), this.time(start + (shape.time ?? 0.2)))
    node.Q.value = shape.q ?? 0.7
    node.connect(into)
    this.nodes.push(node)
    return node
  }

  shape(param: AudioParam, start: number, envelope: Envelope): number {
    const begin = this.time(start)
    const top = begin + Math.max(0.002, envelope.attack)
    const hold = top + (envelope.hold ?? 0)
    const end = hold + Math.max(0.01, envelope.release)
    param.setValueAtTime(0, begin)
    param.linearRampToValueAtTime(envelope.peak, top)
    param.setValueAtTime(envelope.peak, hold)
    param.exponentialRampToValueAtTime(Math.max(0.00002, envelope.peak * 0.0005), end)
    param.linearRampToValueAtTime(0, end + 0.01)
    return end + 0.02
  }

  tone(options: ToneOptions): OscillatorNode {
    const start = options.start ?? 0
    const amp = this.gain(0, this.panned(options.pan ?? 0, options.into ?? this.output))
    const end = this.shape(amp.gain, start, options.envelope)
    const target = options.filter ? this.filter(options.filter, start, amp) : amp
    const oscillator = this.context.createOscillator()
    oscillator.type = options.type ?? 'sine'
    oscillator.frequency.setValueAtTime(options.frequency, this.time(start))
    if (options.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), this.time(start + (options.glide ?? 0.2)))
    if (options.detune) oscillator.detune.value = options.detune
    oscillator.connect(target)
    this.run(oscillator, this.time(start), end)
    return oscillator
  }

  noise(options: NoiseOptions): AudioBufferSourceNode {
    const start = options.start ?? 0
    const amp = this.gain(0, this.panned(options.pan ?? 0, options.into ?? this.output))
    const end = this.shape(amp.gain, start, options.envelope)
    let target: AudioNode = amp
    if (options.second) target = this.filter(options.second, start, target)
    if (options.filter) target = this.filter(options.filter, start, target)
    const source = this.context.createBufferSource()
    source.buffer = this.engine.noise.get(options.colour ?? NoiseColour.White)
    source.loop = true
    source.playbackRate.value = options.rate ?? 1
    source.connect(target)
    const buffer = source.buffer
    this.run(source, this.time(start), end, this.random.time(buffer.duration * 0.9))
    return source
  }

  bell(options: BellOptions): void {
    const start = options.start ?? 0
    const amp = this.gain(0, this.panned(options.pan ?? 0, options.into ?? this.output))
    const end = this.shape(amp.gain, start, { attack: 0.004, release: options.decay, peak: options.peak })
    const carrier = this.context.createOscillator()
    carrier.frequency.value = options.frequency
    const modulator = this.context.createOscillator()
    modulator.frequency.value = options.frequency * (options.ratio ?? 3.5)
    const depth = this.context.createGain()
    const index = (options.index ?? 2) * options.frequency
    depth.gain.setValueAtTime(index, this.time(start))
    depth.gain.exponentialRampToValueAtTime(Math.max(1, index * 0.05), this.time(start) + options.decay * 0.7)
    this.nodes.push(depth)
    modulator.connect(depth)
    depth.connect(carrier.frequency)
    carrier.connect(amp)
    this.run(carrier, this.time(start), end)
    this.run(modulator, this.time(start), end)
  }

  track<T extends AudioNode>(node: T): T {
    this.nodes.push(node)
    return node
  }

  sweepPan(from: number, to: number, start: number, seconds: number, into: AudioNode = this.output): StereoPannerNode {
    const node = this.track(this.context.createStereoPanner())
    node.pan.setValueAtTime(from, this.time(start))
    node.pan.linearRampToValueAtTime(to, this.time(start + seconds))
    node.connect(into)
    return node
  }

  lfo(param: AudioParam, rate: number, depth: number, start: number, seconds: number, rateTo?: number): void {
    const oscillator = this.context.createOscillator()
    oscillator.frequency.setValueAtTime(rate, this.time(start))
    if (rateTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(rateTo, this.time(start + seconds))
    const amount = this.track(this.context.createGain())
    amount.gain.value = depth
    oscillator.connect(amount)
    amount.connect(param)
    this.run(oscillator, this.time(start), this.time(start + seconds))
  }

  run(source: AudioScheduledSourceNode, begin: number, end: number, offset?: number): void {
    this.nodes.push(source)
    this.sources.push(source)
    this.last = Math.max(this.last, end)
    source.onended = () => this.settle()
    if (source instanceof AudioBufferSourceNode && offset !== undefined) source.start(begin, offset)
    else source.start(begin)
    source.stop(end)
  }

  get endsAt(): number {
    return this.last
  }

  stopAt(time: number, fade = 0.08): void {
    const now = Math.max(time, this.context.currentTime)
    this.output.gain.cancelScheduledValues(now)
    this.output.gain.setValueAtTime(this.output.gain.value, now)
    this.output.gain.linearRampToValueAtTime(0, now + fade)
    for (const source of this.sources) {
      try {
        source.stop(now + fade + 0.02)
      } catch {
        continue
      }
    }
  }

  finish(): void {
    if (this.sources.length === 0) this.close()
  }

  private settle(): void {
    this.ended += 1
    if (this.ended >= this.sources.length) this.close()
  }

  private close(): void {
    if (this.closed) return
    this.closed = true
    for (const node of this.nodes) node.disconnect()
    this.onClose()
  }
}
