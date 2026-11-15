import { AmbienceMixer, AmbiencePlace } from '../Ambience/AmbienceMixer'
import type { CueParams } from '../Cue'
import { CueLibrary, type CueName } from '../CueLibrary'
import { LaunchHandle } from '../Cues/LaunchCues'
import { SoundEngine } from '../SoundEngine'
import { SoundMeter, type SoundMeasure } from './SoundMeter'

export interface BenchResult {
  name: string
  kind: string
  description: string
  measure: SoundMeasure
  wav: string
  spectrogram?: { columns: number; rows: number; seconds: number; lowHz: number; highHz: number; cells: string }
}

type SessionStep = [number, CueName | 'Launch' | `Ambience:${string}` | `Orbit:${number}` | `Storm:${number}`, CueParams?]

export class SoundBench {
  static readonly sampleRate = 48000
  static readonly cueParams: Partial<Record<CueName, CueParams>> = {
    DataRecorded: { amount: 6 },
    RadiationHit: { amount: 5 },
    ShieldDeflect: { amount: 4 },
    ContactFound: { amount: 3 },
    ObjectPass: { duration: 3 },
    Travel: { duration: 3 },
    MarkChange: { direction: 1 },
  }

  static readonly session: SessionStep[] = [
    [0, 'Ambience:Home'],
    [1.2, 'Hover'], [1.6, 'Press'], [1.7, 'ScreenForward'],
    [3.1, 'Hover'], [3.5, 'Press'], [3.6, 'ScreenForward'], [3.6, 'Ambience:Hangar'],
    [5.0, 'Press'], [5.1, 'ModuleFit'], [6.1, 'Press'], [6.2, 'MarkChange', { direction: 1 }], [7.1, 'Press'], [7.2, 'ModuleRemove'],
    [8.0, 'Press'], [8.1, 'ModuleFit'], [8.26, 'OverLimit'], [9.1, 'Press'], [9.2, 'ModuleRemove'],
    [10.4, 'Press'], [10.5, 'Launch'], [10.5, 'Ambience:Flight'], [10.5, 'Orbit:0.3'],
    [17.7, 'ContactFound', { amount: 3 }],
    [19.2, 'Hover'], [19.5, 'Press'], [19.6, 'Approach'], [19.6, 'Orbit:0.55'],
    [21.8, 'Press'], [21.9, 'CardOn'], [22.5, 'Press'], [22.6, 'CardOn'],
    [23.5, 'Press'], [23.6, 'EndTurn'], [23.74, 'Camera'], [23.9, 'Spectrometer'], [24.4, 'DataRecorded', { amount: 4 }], [24.4, 'Orbit:0.61'],
    [26.0, 'CardOn'], [26.5, 'CardOff'], [27.0, 'CardOn'],
    [28.0, 'EndTurn'], [28.14, 'Radar'], [28.5, 'RadiationHit', { amount: 2 }], [28.9, 'DataRecorded', { amount: 7 }],
    [30.0, 'Press'], [30.1, 'Travel', { duration: 2.6 }], [30.1, 'Orbit:0.3'], [31.0, 'Storm:0.6'], [31.0, 'Ambience:Storm'],
    [32.7, 'ScannerPing'], [33.15, 'ContactFound', { amount: 2 }],
    [35.0, 'Press'], [35.1, 'Approach'], [35.1, 'Orbit:0.55'],
    [37.0, 'CardOn'], [37.5, 'CardOn'],
    [38.5, 'EndTurn'], [38.64, 'ShieldEngage'], [38.8, 'ParticleDetector'], [39.2, 'ShieldDeflect', { amount: 4 }], [39.32, 'RadiationHit', { amount: 6 }], [39.7, 'DataRecorded', { amount: 3 }], [40.2, 'PowerLow'], [40.0, 'Storm:0.9'],
    [41.6, 'Thrusters'], [42.2, 'ObjectPass', { duration: 4 }],
    [44.0, 'TimerTick'], [45.0, 'TimerTick'], [46.0, 'TimerUrgent'], [47.0, 'TimerUrgent'],
    [47.6, 'CardOn'], [48.0, 'EndTurn'], [48.14, 'HighEnergyDetector'], [48.3, 'RepairDrone'], [49.2, 'DataRecorded', { amount: 12 }],
    [51.0, 'Press'], [51.1, 'Travel', { duration: 2.6 }], [51.1, 'Orbit:0.3'], [52.0, 'Ambience:Flight'],
    [53.8, 'ScannerPing'], [55.0, 'FlightComplete'], [55.0, 'Orbit:0.15'],
    [58.0, 'Press'], [58.1, 'ScreenForward'], [58.1, 'Ambience:Debrief'], [58.8, 'RankUp'],
    [61.5, 'Press'], [61.6, 'ScreenForward'], [61.6, 'Ambience:Lab'], [62.4, 'Hover'], [62.9, 'Press'], [63.0, 'Purchase'],
    [64.5, 'TimeOut'],
  ]

  static get cueNames(): string[] {
    return new CueLibrary().all.map((cue) => cue.name)
  }

  static async renderCue(name: CueName, params: CueParams = SoundBench.cueParams[name] ?? {}): Promise<BenchResult> {
    const library = new CueLibrary()
    const cue = library.get(name)!
    const seconds = cue.lengthFor(params) + 2.6
    const { context, engine } = SoundBench.engine(seconds, 11)
    cue.play(engine, 0.05, params)
    return SoundBench.finish(name, 'Cue', cue.description, await context.startRendering())
  }

  static async renderLaunch(): Promise<BenchResult> {
    const library = new CueLibrary()
    const { context, engine } = SoundBench.engine(LaunchHandle.timeline.end + 2, 12)
    new LaunchHandle(engine, { ignition: library.get('Ignition')!, separation: library.get('StageSeparation')!, fairing: library.get('FairingRelease')!, deploy: library.get('Deploy')! }, 0.05, true)
    return SoundBench.finish('Launch', 'Cue', 'The whole launch as one cue: ignition, roar that thins as it climbs, stage separation, fairing release, deployment chime.', await context.startRendering(), true)
  }

  static async renderAmbience(place: AmbiencePlace, seconds = 30): Promise<BenchResult> {
    const { context, engine } = SoundBench.engine(seconds, 13)
    const mixer = new AmbienceMixer(engine)
    mixer.setStorm(0.6, 0)
    mixer.setOrbitSpeed(0.2, 0)
    mixer.set(place, 0, 1.2)
    if (place === AmbiencePlace.Flight || place === AmbiencePlace.Storm) {
      for (const [at, speed] of [[8, 0.6], [16, 0.9], [24, 0.3]] as const) mixer.setOrbitSpeed(speed, at)
    }
    mixer.tick(seconds)
    return SoundBench.finish(`Ambience${place}`, 'Ambience', `Thirty seconds of the ${place} bed${place === AmbiencePlace.Flight || place === AmbiencePlace.Storm ? ', orbit speed moving 0.2, 0.6, 0.9, 0.3' : ''}.`, await context.startRendering())
  }

  static async renderSession(): Promise<BenchResult> {
    const seconds = 68
    const { context, engine } = SoundBench.engine(seconds, 14)
    const library = new CueLibrary()
    const mixer = new AmbienceMixer(engine)
    for (const [at, step, params] of SoundBench.session) {
      if (step === 'Launch') {
        new LaunchHandle(engine, { ignition: library.get('Ignition')!, separation: library.get('StageSeparation')!, fairing: library.get('FairingRelease')!, deploy: library.get('Deploy')! }, at, true)
      } else if (step.startsWith('Ambience:')) {
        mixer.tick(at)
        mixer.set(step.slice(9) as AmbiencePlace, at)
      } else if (step.startsWith('Orbit:')) {
        mixer.setOrbitSpeed(Number(step.slice(6)), at)
      } else if (step.startsWith('Storm:')) {
        mixer.setStorm(Number(step.slice(6)), at)
      } else {
        library.get(step as CueName)?.play(engine, at, params ?? {})
      }
    }
    mixer.tick(seconds)
    const rendered = await context.startRendering()
    return SoundBench.finish('Session', 'Session', 'About a minute of a first flight: menus, Hangar edits, launch, three encounters, a storm leg, cruise, debrief and Lab.', rendered, true)
  }

  private static engine(seconds: number, seed: number): { context: OfflineAudioContext; engine: SoundEngine } {
    const context = new OfflineAudioContext(2, Math.ceil(seconds * SoundBench.sampleRate), SoundBench.sampleRate)
    return { context, engine: new SoundEngine(context, { seed, voiceLimit: 4000 }) }
  }

  private static finish(name: string, kind: string, description: string, buffer: AudioBuffer, withSpectrogram = false): BenchResult {
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const result: BenchResult = { name, kind, description, measure: SoundMeter.measure(left, right, buffer.sampleRate), wav: SoundBench.wav(left, right, buffer.sampleRate) }
    if (withSpectrogram) {
      const picture = SoundMeter.spectrogram(left, right, buffer.sampleRate, Math.min(1600, Math.ceil(buffer.duration * 40)), 240)
      result.spectrogram = { ...picture, cells: SoundBench.base64(picture.cells) }
    }
    return result
  }

  private static wav(left: Float32Array, right: Float32Array, sampleRate: number): string {
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
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 4, true)
    view.setUint16(32, 4, true)
    view.setUint16(34, 16, true)
    text(36, 'data')
    view.setUint32(40, frames * 4, true)
    for (let index = 0; index < frames; index++) {
      view.setInt16(44 + index * 4, Math.round(Math.max(-1, Math.min(1, left[index])) * 32767), true)
      view.setInt16(46 + index * 4, Math.round(Math.max(-1, Math.min(1, right[index])) * 32767), true)
    }
    return SoundBench.base64(bytes)
  }

  private static base64(bytes: Uint8Array): string {
    let text = ''
    const chunk = 0x8000
    for (let index = 0; index < bytes.length; index += chunk) text += String.fromCharCode(...bytes.subarray(index, index + chunk))
    return btoa(text)
  }
}

declare global {
  interface Window {
    SoundBench?: typeof SoundBench
  }
}

window.SoundBench = SoundBench
