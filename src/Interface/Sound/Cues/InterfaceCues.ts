import { Cue, InterfaceCue } from '../Cue'
import { NoiseColour } from '../NoiseBank'
import type { Voice } from '../Voice'

export class HoverCue extends InterfaceCue {
  readonly name = 'Hover'
  readonly description = 'Pointer enters a control: a barely-there high tick.'
  override readonly gap = 0.05
  override readonly reverb = 0.03

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(60)
    voice.tone({ type: 'sine', frequency: 2350 * pitch, to: 2150 * pitch, glide: 0.02, envelope: { attack: 0.002, release: 0.035, peak: 0.05 } })
  }
}

export class PressCue extends InterfaceCue {
  readonly name = 'Press'
  readonly description = 'Pointer goes down on a control: a short soft tick.'

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(40)
    voice.tone({ type: 'triangle', frequency: 940 * pitch, to: 720 * pitch, glide: 0.03, envelope: { attack: 0.002, release: 0.05, peak: 0.16 } })
    voice.noise({ envelope: { attack: 0.001, release: 0.012, peak: 0.08 }, filter: { type: 'highpass', frequency: 2600 } })
  }
}

export class ReleaseCue extends InterfaceCue {
  readonly name = 'Release'
  readonly description = 'Pointer comes up on a control that did nothing louder: a lighter, higher tick.'

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(40)
    voice.tone({ type: 'triangle', frequency: 1250 * pitch, to: 1180 * pitch, glide: 0.02, envelope: { attack: 0.002, release: 0.04, peak: 0.11 } })
  }
}

export class CardOnCue extends InterfaceCue {
  readonly name = 'CardOn'
  readonly description = 'A module card is switched on for this turn: a click and a small rising power-up.'
  override readonly length = 0.6

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(25)
    voice.noise({ envelope: { attack: 0.001, release: 0.015, peak: 0.12 }, filter: { type: 'bandpass', frequency: 3200, q: 1.2 } })
    voice.tone({ type: 'triangle', frequency: 660 * pitch, start: 0.005, envelope: { attack: 0.004, hold: 0.03, release: 0.07, peak: 0.16 } })
    voice.tone({ type: 'triangle', frequency: 990 * pitch, start: 0.055, envelope: { attack: 0.004, hold: 0.02, release: 0.16, peak: 0.15 } })
    voice.tone({ type: 'sine', frequency: 300 * pitch, to: 900 * pitch, glide: 0.12, start: 0.01, envelope: { attack: 0.03, release: 0.12, peak: 0.05 } })
  }
}

export class CardOffCue extends InterfaceCue {
  readonly name = 'CardOff'
  readonly description = 'A module card is switched off: a duller falling click.'
  override readonly length = 0.5

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(25)
    voice.noise({ envelope: { attack: 0.001, release: 0.012, peak: 0.08 }, filter: { type: 'bandpass', frequency: 2200, q: 1.2 } })
    voice.tone({ type: 'triangle', frequency: 880 * pitch, start: 0.005, envelope: { attack: 0.004, hold: 0.02, release: 0.06, peak: 0.13 }, filter: { type: 'lowpass', frequency: 2400 } })
    voice.tone({ type: 'triangle', frequency: 587 * pitch, start: 0.05, envelope: { attack: 0.004, release: 0.13, peak: 0.13 }, filter: { type: 'lowpass', frequency: 1800 } })
  }
}

export class DeniedCue extends InterfaceCue {
  readonly name = 'Denied'
  readonly description = 'The player tried something the rules do not allow: two soft low taps, not a buzzer.'
  override readonly gap = 0.18
  override readonly length = 0.5

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(20)
    for (const [start, frequency] of [[0, 392], [0.1, 330]] as const) {
      voice.tone({ type: 'triangle', frequency: frequency * pitch, start, envelope: { attack: 0.004, hold: 0.025, release: 0.08, peak: 0.15 }, filter: { type: 'lowpass', frequency: 1600 } })
      voice.tone({ type: 'sine', frequency: frequency * 2 * pitch, start, envelope: { attack: 0.004, release: 0.05, peak: 0.04 } })
    }
  }
}

export class ScreenChangeCue extends InterfaceCue {
  readonly description: string
  override readonly reverb = 0.22
  override readonly length = 0.9
  override readonly gap = 0.15

  constructor(readonly name: string, private readonly forward: boolean) {
    super()
    this.description = forward ? 'Moving on to the next screen: a soft upward whoosh.' : 'Going back a screen: a soft downward whoosh.'
  }

  protected build(voice: Voice): void {
    const low = 520 * voice.random.pitch(80)
    const high = 2700 * voice.random.pitch(80)
    const [from, to] = this.forward ? [low, high] : [high, low]
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.16, release: 0.32, peak: 0.42 }, filter: { type: 'bandpass', frequency: from, to, time: 0.42, q: 1.6 }, pan: this.forward ? 0.15 : -0.15 })
    voice.tone({ type: 'sine', frequency: this.forward ? 392 : 523, to: this.forward ? 523 : 392, glide: 0.35, start: 0.05, envelope: { attack: 0.12, release: 0.28, peak: 0.035 } })
  }
}

export class PurchaseCue extends Cue {
  readonly name = 'Purchase'
  readonly description = 'A module or mark is bought in the Lab: a short two-note bell and a register click.'
  override readonly reverb = 0.25
  override readonly length = 1.6

  protected build(voice: Voice): void {
    voice.noise({ envelope: { attack: 0.001, release: 0.02, peak: 0.14 }, filter: { type: 'bandpass', frequency: 2800, q: 2 } })
    voice.tone({ type: 'triangle', frequency: 300, to: 200, glide: 0.06, envelope: { attack: 0.002, release: 0.07, peak: 0.16 } })
    voice.bell({ frequency: 784, ratio: 3.5, index: 1.4, start: 0.05, decay: 0.9, peak: 0.16 })
    voice.bell({ frequency: 1175, ratio: 3.5, index: 1.2, start: 0.15, decay: 1.1, peak: 0.15 })
  }
}

export class RankUpCue extends Cue {
  readonly name = 'RankUp'
  readonly description = 'The one celebration: a short rising bell figure over a warm swell.'
  override readonly reverb = 0.35
  override readonly length = 2.8

  protected build(voice: Voice): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      const last = index === notes.length - 1
      voice.bell({ frequency, ratio: 2, index: last ? 1.6 : 1.1, start: index * 0.11, decay: last ? 1.8 : 0.7, peak: last ? 0.2 : 0.15 })
      voice.tone({ type: 'triangle', frequency, start: index * 0.11, envelope: { attack: 0.005, hold: 0.04, release: last ? 0.9 : 0.25, peak: 0.07 } })
    })
    for (const frequency of [261.63, 392, 523.25]) {
      voice.tone({ type: 'sine', frequency, detune: voice.random.spread(6), start: 0.2, envelope: { attack: 0.35, hold: 0.4, release: 1.4, peak: 0.05 } })
    }
  }
}
