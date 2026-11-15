import type { CueParams } from '../../../src/Interface/Sound/Cue'
import { CueLibrary, type CueName } from '../../../src/Interface/Sound/CueLibrary'
import { LaunchHandle } from '../../../src/Interface/Sound/Cues/LaunchCues'
import { SoundEngine } from '../../../src/Interface/Sound/SoundEngine'
import { Seeded } from '../../../src/Interface/Scene/SpriteImage'
import { Beat } from '../Kit/Motion'

const Rate = 48000
const B = Beat.Length
const Bar = Beat.Bar
const Hit = 21.6
const Back = 22.8

const Chords: number[][] = [
  [50, 53, 57],
  [46, 50, 53],
  [53, 57, 60],
  [48, 52, 55],
]
const Resolve = [50, 54, 57]

function Hz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

class Music {
  private readonly bus: GainNode
  private readonly pulse: PeriodicWave
  private readonly noise: AudioBuffer

  constructor(private readonly context: OfflineAudioContext) {
    this.bus = context.createGain()
    this.bus.gain.value = 0.9
    const glue = context.createDynamicsCompressor()
    glue.threshold.value = -14
    glue.ratio.value = 3
    glue.attack.value = 0.01
    glue.release.value = 0.2
    this.bus.connect(glue)
    glue.connect(context.destination)
    const harmonics = 32
    const real = new Float32Array(harmonics)
    const imag = new Float32Array(harmonics)
    for (let n = 1; n < harmonics; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25)
    this.pulse = context.createPeriodicWave(real, imag)
    this.noise = context.createBuffer(1, Rate * 2, Rate)
    const random = new Seeded(77)
    const data = this.noise.getChannelData(0)
    for (let at = 0; at < data.length; at++) data[at] = random.next() * 2 - 1
  }

  chordAt(time: number): number[] {
    if (time >= 26.4) return Resolve
    return Chords[Math.floor(time / Bar + 1e-6) % Chords.length]
  }

  compose(length: number) {
    for (let bar = 0; bar * Bar < length; bar++) {
      const start = bar * Bar
      if (start >= 26.4) break
      const quiet = start >= Hit && start < Back
      this.pad(start, Bar + 0.3, this.chordAt(start), quiet ? 0.012 : start < 4.8 ? 0.03 : 0.045)
    }
    this.pad(26.4, 3.6, Resolve, 0.05, true)
    for (let step = 0; step * B / 2 < 26.4; step++) {
      const time = step * (B / 2)
      if (time >= Hit && time < Back) continue
      const onBeat = step % 2 === 0
      const sparse = time < 4.8 || (time >= 24.0 && time < 26.4)
      if (time < 1.2) continue
      if (sparse && !onBeat) continue
      const chord = this.chordAt(time)
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
      const note = chord[pattern[step % pattern.length]] + 12
      const lift = time >= 13.2 && time < Hit ? 0.055 : 0.045
      this.pluck(time, note, lift)
      if (time >= 13.2 && time < Hit && step % 4 === 2) this.pluck(time, note + 12, 0.02)
    }
    for (let beat = 0; beat * B < 26.4; beat++) {
      const time = beat * B
      if (time >= 9.6 && (time < Hit || (time >= Back && time < 24.0))) this.bass(time, this.chordAt(time)[0] - 12, beat % 4 === 0 ? 0.16 : 0.11)
      if (time >= 13.2 && (time < Hit || (time >= Back && time < 24.0))) this.kick(time, 0.32)
      if (time >= 16.8 && time < Hit) this.hat(time + B / 2, 0.035)
    }
    this.kick(Hit, 0.7)
    this.kick(9.6, 0.4)
    this.kick(19.2, 0.3)
    this.kick(26.4, 0.45)
    this.riser(19.8, Hit)
    for (const [offset, note] of [[0, 62], [0.15, 66], [0.3, 69], [0.45, 74]] as const) this.pluck(26.4 + offset, note + 12, 0.04, 1.6)
  }

  private envelope(gain: GainNode, at: number, peak: number, attack: number, hold: number, release: number) {
    const g = gain.gain
    g.setValueAtTime(0, at)
    g.linearRampToValueAtTime(peak, at + attack)
    g.setValueAtTime(peak, at + attack + hold)
    g.linearRampToValueAtTime(0, at + attack + hold + release)
  }

  private pad(at: number, length: number, chord: number[], level: number, last = false) {
    for (const note of chord) {
      for (const detune of [-5, 5]) {
        const osc = this.context.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = Hz(note - 12)
        osc.detune.value = detune
        const filter = this.context.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 1400
        const gain = this.context.createGain()
        this.envelope(gain, at, level, last ? 0.08 : 0.5, last ? length - 1.4 : length - 0.9, last ? 1.3 : 0.7)
        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.bus)
        osc.start(at)
        osc.stop(at + length + 0.1)
      }
    }
  }

  private pluck(at: number, note: number, level: number, decay = 0.28) {
    const osc = this.context.createOscillator()
    osc.setPeriodicWave(this.pulse)
    osc.frequency.value = Hz(note)
    const filter = this.context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3200, at)
    filter.frequency.exponentialRampToValueAtTime(700, at + decay)
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(level, at + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    const pan = this.context.createStereoPanner()
    pan.pan.value = ((note % 5) - 2) * 0.12
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(pan)
    pan.connect(this.bus)
    osc.start(at)
    osc.stop(at + decay + 0.05)
  }

  private bass(at: number, note: number, level: number) {
    const osc = this.context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = Hz(note)
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(level, at + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + B * 0.8)
    osc.connect(gain)
    gain.connect(this.bus)
    osc.start(at)
    osc.stop(at + B)
  }

  private kick(at: number, level: number) {
    const osc = this.context.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, at)
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.14)
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(level, at + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
    osc.connect(gain)
    gain.connect(this.bus)
    osc.start(at)
    osc.stop(at + 0.45)
  }

  private hat(at: number, level: number) {
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    const filter = this.context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7000
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(level, at)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.bus)
    source.start(at, (at * 0.37) % 1.5)
    source.stop(at + 0.06)
  }

  private riser(from: number, to: number) {
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = this.context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 4
    filter.frequency.setValueAtTime(300, from)
    filter.frequency.exponentialRampToValueAtTime(5000, to)
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, from)
    gain.gain.linearRampToValueAtTime(0.12, to - 0.02)
    gain.gain.linearRampToValueAtTime(0, to)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.bus)
    source.start(from)
    source.stop(to + 0.05)
  }
}

export const Effects: [number, CueName, CueParams?][] = [
  [Beat.at(2), 'ScannerPing'],
  ...[1, 2, 3, 4, 5, 6].map((beat) => [4.8 + Beat.at(beat), 'ModuleFit'] as [number, CueName]),
  [4.8, 'ScreenForward'],
  [13.2, 'Deploy'],
  [13.4, 'ObjectPass', { duration: 3 }],
  [14.4, 'Camera'],
  [14.55, 'DataRecorded', { amount: 6 }],
  [16.8, 'ContactFound', { amount: 3 }],
  [18.0, 'ContactFound', { amount: 3 }],
  [20.4, 'Travel', { duration: 1.2 }],
  [Hit, 'RadiationHit', { amount: 8 }],
  [22.2, 'ShieldEngage'],
  [22.5, 'ShieldDeflect', { amount: 4 }],
  [24.0, 'ScreenForward'],
  [25.2, 'ModuleFit'],
  [26.4, 'RankUp'],
]

export class Score {
  constructor(private readonly length: number) {}

  async render(): Promise<{ wav: string; peak: number; levels: number[] }> {
    const context = new OfflineAudioContext(2, Math.round(this.length * Rate), Rate)
    const engine = new SoundEngine(context, { seed: 26, voiceLimit: 4000 })
    const library = new CueLibrary()
    const launch = new LaunchHandle(engine, { ignition: library.get('Ignition')!, separation: library.get('StageSeparation')!, fairing: library.get('FairingRelease')!, deploy: library.get('Deploy')! }, 9.6, false)
    const roar = (launch as unknown as { roar: { liftoff(at: number): void; thin(at: number, seconds: number): void } }).roar
    roar.liftoff(10.2)
    roar.thin(11.6, 2.0)
    for (const [at, name, params] of Effects) library.get(name)?.play(engine, at, params ?? {})
    new Music(context).compose(this.length)
    const buffer = await context.startRendering()
    return Score.finish(buffer)
  }

  private static finish(buffer: AudioBuffer): { wav: string; peak: number; levels: number[] } {
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const windows: number[] = []
    const span = Rate / 10
    for (let from = 0; from < left.length; from += span) {
      let most = 0
      for (let at = from; at < Math.min(left.length, from + span); at++) most = Math.max(most, Math.abs(left[at]), Math.abs(right[at]))
      windows.push(most)
    }
    const loud = [...windows].sort((a, b) => a - b)[Math.floor(windows.length * 0.97)]
    const gain = 10 ** (-6 / 20) / Math.max(loud, 1e-6)
    const fadeOut = Math.round(1.4 * Rate)
    const fadeIn = Math.round(0.01 * Rate)
    const frames = left.length
    for (let at = 0; at < frames; at++) {
      let shape = gain
      if (at < fadeIn) shape *= at / fadeIn
      const toEnd = frames - 1 - at
      if (toEnd < fadeOut) shape *= 0.5 - 0.5 * Math.cos((Math.PI * toEnd) / fadeOut)
      left[at] = Score.limit(left[at] * gain) * (shape / gain)
      right[at] = Score.limit(right[at] * gain) * (shape / gain)
    }
    const levels: number[] = []
    const window = Rate / 10
    for (let from = 0; from < frames; from += window) {
      let most = 0
      for (let at = from; at < Math.min(frames, from + window); at++) most = Math.max(most, Math.abs(left[at]), Math.abs(right[at]))
      levels.push(Math.round(20 * Math.log10(Math.max(most, 1e-6)) * 10) / 10)
    }
    return { wav: Score.wav(left, right), peak: Math.max(...levels), levels }
  }

  private static limit(value: number): number {
    const knee = 0.6
    const ceiling = 0.84
    const size = Math.abs(value)
    if (size <= knee) return value
    return Math.sign(value) * (knee + (ceiling - knee) * Math.tanh((size - knee) / (ceiling - knee)))
  }

  private static wav(left: Float32Array, right: Float32Array): string {
    const frames = left.length
    const bytes = new Uint8Array(44 + frames * 4)
    const view = new DataView(bytes.buffer)
    const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
    text(0, 'RIFF')
    view.setUint32(4, 36 + frames * 4, true)
    text(8, 'WAVE')
    text(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 2, true)
    view.setUint32(24, Rate, true)
    view.setUint32(28, Rate * 4, true)
    view.setUint16(32, 4, true)
    view.setUint16(34, 16, true)
    text(36, 'data')
    view.setUint32(40, frames * 4, true)
    for (let index = 0; index < frames; index++) {
      view.setInt16(44 + index * 4, Math.round(Math.max(-1, Math.min(1, left[index])) * 32767), true)
      view.setInt16(46 + index * 4, Math.round(Math.max(-1, Math.min(1, right[index])) * 32767), true)
    }
    let out = ''
    for (let at = 0; at < bytes.length; at += 0x8000) out += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
    return btoa(out)
  }
}
