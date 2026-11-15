import { Variation } from './Variation'

export enum NoiseColour {
  White = 'White',
  Pink = 'Pink',
  Brown = 'Brown',
}

export class NoiseBank {
  private readonly buffers = new Map<NoiseColour, AudioBuffer>()
  readonly impulse: AudioBuffer

  constructor(context: BaseAudioContext, seconds = 4) {
    const random = new Variation(26)
    const length = Math.floor(context.sampleRate * seconds)
    for (const colour of [NoiseColour.White, NoiseColour.Pink, NoiseColour.Brown]) {
      const buffer = context.createBuffer(2, length, context.sampleRate)
      for (let channel = 0; channel < 2; channel++) NoiseBank.fill(buffer.getChannelData(channel), colour, random)
      this.buffers.set(colour, buffer)
    }
    this.impulse = NoiseBank.makeImpulse(context, random)
  }

  get(colour: NoiseColour): AudioBuffer {
    return this.buffers.get(colour)!
  }

  private static fill(target: Float32Array, colour: NoiseColour, random: Variation): void {
    const fade = Math.min(4096, Math.floor(target.length / 8))
    const data = new Float32Array(target.length + fade)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let index = 0; index < data.length; index++) {
      const white = random.next() * 2 - 1
      if (colour === NoiseColour.White) {
        data[index] = white * 0.5
      } else if (colour === NoiseColour.Pink) {
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        data[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      } else {
        last = (last + 0.02 * white) / 1.02
        data[index] = last * 3.5
      }
    }
    for (let index = 0; index < fade; index++) {
      const weight = index / fade
      target[index] = data[index] * weight + data[target.length + index] * (1 - weight)
    }
    for (let index = fade; index < target.length; index++) target[index] = data[index]
    let mean = 0
    for (let index = 0; index < target.length; index++) mean += target[index]
    mean /= target.length
    for (let index = 0; index < target.length; index++) target[index] -= mean
  }

  private static makeImpulse(context: BaseAudioContext, random: Variation): AudioBuffer {
    const seconds = 3.4
    const length = Math.floor(context.sampleRate * seconds)
    const buffer = context.createBuffer(2, length, context.sampleRate)
    const predelay = Math.floor(context.sampleRate * 0.018)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let smooth = 0
      for (let index = predelay; index < length; index++) {
        const t = (index - predelay) / context.sampleRate
        const decay = Math.exp(-t * 2.1)
        const darkness = 0.55 + 0.4 * Math.min(1, t / 2.5)
        smooth = smooth * darkness + (random.next() * 2 - 1) * (1 - darkness)
        data[index] = smooth * decay * 1.6
      }
      for (let index = length - 512; index < length; index++) data[index] *= (length - index) / 512
    }
    return buffer
  }
}
