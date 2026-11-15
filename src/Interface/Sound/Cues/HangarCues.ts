import { Cue } from '../Cue'
import { NoiseColour } from '../NoiseBank'
import type { Voice } from '../Voice'

export class ModuleFitCue extends Cue {
  readonly name = 'ModuleFit'
  readonly description = 'A module is fitted in the Hangar: a short slide, a latch click and a seated thunk.'
  override readonly length = 0.7
  override readonly reverb = 0.14

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(35)
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.03, release: 0.05, peak: 0.16 }, filter: { type: 'bandpass', frequency: 900 * pitch, to: 2200 * pitch, time: 0.08, q: 1.4 } })
    voice.noise({ start: 0.085, envelope: { attack: 0.001, release: 0.012, peak: 0.24 }, filter: { type: 'bandpass', frequency: 3000, q: 1 } })
    voice.tone({ type: 'triangle', frequency: 1480 * pitch, start: 0.085, envelope: { attack: 0.001, release: 0.025, peak: 0.12 } })
    voice.tone({ type: 'triangle', frequency: 330 * pitch, to: 196 * pitch, glide: 0.07, start: 0.1, envelope: { attack: 0.003, release: 0.11, peak: 0.34 } })
    voice.tone({ type: 'sine', frequency: 170 * pitch, to: 110, glide: 0.08, start: 0.1, envelope: { attack: 0.003, release: 0.1, peak: 0.1 } })
    voice.noise({ colour: NoiseColour.Pink, start: 0.1, envelope: { attack: 0.002, release: 0.06, peak: 0.16 }, filter: { type: 'bandpass', frequency: 700, q: 0.9 } })
  }
}

export class ModuleRemoveCue extends Cue {
  readonly name = 'ModuleRemove'
  readonly description = 'A module is taken out: an unlatch click and a short slide away.'
  override readonly length = 0.6
  override readonly reverb = 0.14

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(35)
    voice.noise({ envelope: { attack: 0.001, release: 0.01, peak: 0.16 }, filter: { type: 'bandpass', frequency: 2800, q: 1.4 } })
    voice.tone({ type: 'triangle', frequency: 1760 * pitch, envelope: { attack: 0.001, release: 0.02, peak: 0.1 } })
    voice.tone({ type: 'triangle', frequency: 262 * pitch, to: 330 * pitch, glide: 0.05, start: 0.012, envelope: { attack: 0.003, release: 0.06, peak: 0.18 } })
    voice.noise({ colour: NoiseColour.Pink, start: 0.04, envelope: { attack: 0.02, release: 0.14, peak: 0.18 }, filter: { type: 'bandpass', frequency: 2000 * pitch, to: 700 * pitch, time: 0.16, q: 1.4 } })
  }
}

export class MarkChangeCue extends Cue {
  readonly name = 'MarkChange'
  readonly description = 'A fitted module changes mark: a quick three-step ratchet, up or down.'
  override readonly length = 0.5
  override readonly reverb = 0.1

  protected build(voice: Voice, params: { direction?: number }): void {
    const up = (params.direction ?? 1) >= 0
    const steps = up ? [880, 1047, 1319] : [1319, 1047, 880]
    steps.forEach((frequency, index) => {
      const start = index * 0.045
      voice.noise({ start, envelope: { attack: 0.001, release: 0.008, peak: 0.16 }, filter: { type: 'bandpass', frequency: 2600, q: 2 } })
      voice.tone({ type: 'triangle', frequency: frequency * voice.random.pitch(15), start, envelope: { attack: 0.002, release: 0.04, peak: 0.1 } })
    })
  }
}

export class OverLimitCue extends Cue {
  override readonly level = 0.75
  readonly name = 'OverLimit'
  readonly description = 'The loadout went over budget or bay space: a soft falling two-note caution.'
  override readonly length = 0.8
  override readonly gap = 0.3

  protected build(voice: Voice): void {
    for (const [start, frequency] of [[0, 523.25], [0.13, 392]] as const) {
      voice.tone({ type: 'triangle', frequency, start, envelope: { attack: 0.006, hold: 0.05, release: 0.16, peak: 0.2 }, filter: { type: 'lowpass', frequency: 2200 } })
      voice.tone({ type: 'sine', frequency: frequency * 1.5, start, envelope: { attack: 0.006, release: 0.12, peak: 0.04 } })
    }
  }
}
