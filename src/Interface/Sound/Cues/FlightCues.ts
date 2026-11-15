import { Cue, type CueParams } from '../Cue'
import { NoiseColour } from '../NoiseBank'
import type { Voice } from '../Voice'

export class ScannerPingCue extends Cue {
  override readonly level = 0.8
  readonly name = 'ScannerPing'
  readonly description = 'The scanner sweeps for contacts: a soft sonar ping with a fainter echo.'
  override readonly reverb = 0.4
  override readonly length = 2.2
  override readonly gap = 0.4

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(30)
    voice.bell({ frequency: 1318 * pitch, ratio: 2, index: 0.2, decay: 1.1, peak: 0.2 })
    voice.tone({ type: 'sine', frequency: 659 * pitch, envelope: { attack: 0.005, release: 0.6, peak: 0.06 } })
    voice.bell({ frequency: 1318 * pitch, ratio: 2, index: 0.15, start: 0.42, decay: 0.8, peak: 0.06, pan: 0.3 })
  }
}

export class ContactFoundCue extends Cue {
  readonly name = 'ContactFound'
  readonly description = 'Contacts appear on the scanner: one soft rising blip per contact.'
  override readonly reverb = 0.25
  override readonly length = 1.4

  protected build(voice: Voice, params: CueParams): void {
    const count = Math.max(1, Math.min(5, Math.round(Cue.amount(params, 3))))
    const scale = [880, 1046.5, 1174.7, 1318.5, 1568]
    for (let index = 0; index < count; index++) {
      const start = index * 0.085 + voice.random.time(0.012)
      const pan = (index / Math.max(1, count - 1) - 0.5) * 0.6
      voice.tone({ type: 'triangle', frequency: scale[index], start, pan, envelope: { attack: 0.003, release: 0.12, peak: 0.12 } })
      voice.tone({ type: 'sine', frequency: scale[index] * 2, start, pan, envelope: { attack: 0.003, release: 0.08, peak: 0.03 } })
    }
  }
}

export class ApproachCue extends Cue {
  readonly name = 'Approach'
  readonly description = 'The spacecraft closes on a chosen contact: a rising thruster breath and a two-tone lock.'
  override readonly reverb = 0.3
  override readonly length = 1.8

  protected build(voice: Voice): void {
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.35, hold: 0.1, release: 0.5, peak: 0.26 }, filter: { type: 'bandpass', frequency: 500, to: 1800, time: 0.6, q: 1.2 } })
    voice.tone({ type: 'sine', frequency: 587.3, start: 0.55, envelope: { attack: 0.01, hold: 0.06, release: 0.3, peak: 0.1 } })
    voice.tone({ type: 'sine', frequency: 880, start: 0.67, envelope: { attack: 0.01, hold: 0.08, release: 0.5, peak: 0.1 } })
    voice.tone({ type: 'triangle', frequency: 440, start: 0.67, envelope: { attack: 0.01, release: 0.3, peak: 0.04 } })
  }
}

export class EndTurnCue extends Cue {
  readonly name = 'EndTurn'
  readonly description = 'The turn is committed: a firm low-mid thunk with a click on top.'
  override readonly length = 0.6

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(25)
    voice.noise({ envelope: { attack: 0.001, release: 0.015, peak: 0.2 }, filter: { type: 'bandpass', frequency: 2600, q: 1.5 } })
    voice.tone({ type: 'triangle', frequency: 330 * pitch, to: 220 * pitch, glide: 0.08, envelope: { attack: 0.003, release: 0.16, peak: 0.3 } })
    voice.tone({ type: 'sine', frequency: 660 * pitch, envelope: { attack: 0.003, release: 0.09, peak: 0.1 } })
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.002, release: 0.07, peak: 0.2 }, filter: { type: 'bandpass', frequency: 800, q: 0.8 } })
  }
}

export class DataRecordedCue extends Cue {
  readonly name = 'DataRecorded'
  readonly description = 'Data is banked: one rising tick per unit, so bigger hauls run longer and climb higher.'
  override readonly reverb = 0.18
  override readonly length = 1.6

  protected build(voice: Voice, params: CueParams): void {
    const units = Math.max(1, Math.min(16, Math.round(Cue.amount(params, 3))))
    const scale = [0, 2, 4, 7, 9]
    const spacing = units > 8 ? 0.045 : 0.06
    for (let index = 0; index < units; index++) {
      const step = scale[index % 5] + 12 * Math.floor(index / 5)
      const frequency = 784 * Math.pow(2, step / 12)
      const start = index * spacing
      voice.tone({ type: 'triangle', frequency, start, envelope: { attack: 0.002, release: 0.05, peak: 0.1 } })
      voice.noise({ start, envelope: { attack: 0.001, release: 0.006, peak: 0.05 }, filter: { type: 'highpass', frequency: 3500 } })
    }
    const top = 784 * Math.pow(2, (scale[(units - 1) % 5] + 12 * Math.floor((units - 1) / 5)) / 12)
    voice.bell({ frequency: Math.min(top * 1.5, 3200), ratio: 2, index: 0.8, start: units * spacing, decay: 0.6, peak: 0.08 })
  }
}

export class CameraCue extends Cue {
  readonly name = 'Camera'
  readonly description = 'The camera fires: a two-blade shutter with a tiny wind-on whirr.'
  override readonly length = 0.6
  override readonly level = 2.6

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(30)
    voice.noise({ envelope: { attack: 0.001, release: 0.012, peak: 0.3 }, filter: { type: 'bandpass', frequency: 3600 * pitch, q: 1.5 } })
    voice.tone({ type: 'triangle', frequency: 1900 * pitch, envelope: { attack: 0.001, release: 0.015, peak: 0.08 } })
    voice.noise({ start: 0.07, envelope: { attack: 0.001, release: 0.018, peak: 0.24 }, filter: { type: 'bandpass', frequency: 2500 * pitch, q: 1.5 } })
    voice.noise({ colour: NoiseColour.Pink, start: 0.1, envelope: { attack: 0.02, hold: 0.08, release: 0.06, peak: 0.07 }, filter: { type: 'bandpass', frequency: 1400 * pitch, to: 1900 * pitch, time: 0.15, q: 4 } })
  }
}

export class SpectrometerCue extends Cue {
  override readonly level = 0.75
  readonly name = 'Spectrometer'
  readonly description = 'The spectrometer reads light: a glassy shimmer of high partials fanning upward.'
  override readonly reverb = 0.35
  override readonly length = 1.4

  protected build(voice: Voice): void {
    const base = 1250 * voice.random.pitch(40)
    const ratios = [1, 1.26, 1.5, 1.89, 2.24, 2.83]
    ratios.forEach((ratio, index) => {
      const start = index * 0.045 + voice.random.time(0.02)
      voice.tone({ type: 'sine', frequency: base * ratio, to: base * ratio * 1.03, glide: 0.4, start, pan: (index % 2 === 0 ? -1 : 1) * 0.35, envelope: { attack: 0.03, hold: 0.05, release: 0.35, peak: 0.055 } })
    })
    voice.noise({ envelope: { attack: 0.08, release: 0.3, peak: 0.05 }, filter: { type: 'bandpass', frequency: 3000, to: 4500, time: 0.3, q: 3 } })
  }
}

export class RadarCue extends Cue {
  override readonly level = 0.6
  readonly name = 'Radar'
  readonly description = 'The radar fires: an upward chirp and, a moment later, its softer return.'
  override readonly reverb = 0.25
  override readonly length = 1.1

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(30)
    voice.tone({ type: 'sine', frequency: 600 * pitch, to: 2400 * pitch, glide: 0.12, envelope: { attack: 0.005, hold: 0.09, release: 0.04, peak: 0.16 } })
    voice.tone({ type: 'triangle', frequency: 600 * pitch, to: 2400 * pitch, glide: 0.12, envelope: { attack: 0.005, hold: 0.09, release: 0.04, peak: 0.04 } })
    voice.tone({ type: 'sine', frequency: 2300 * pitch, to: 700 * pitch, glide: 0.14, start: 0.34, pan: 0.25, envelope: { attack: 0.01, hold: 0.08, release: 0.08, peak: 0.07 }, filter: { type: 'lowpass', frequency: 1800 } })
  }
}

export class ParticleDetectorCue extends Cue {
  override readonly level = 1.8
  readonly name = 'ParticleDetector'
  readonly description = 'The particle detector counts hits: an irregular Geiger crackle.'
  override readonly length = 0.9

  protected build(voice: Voice): void {
    let at = 0
    for (let index = 0; index < 18 && at < 0.55; index++) {
      at += -Math.log(1 - voice.random.next()) * 0.03
      const peak = voice.random.range(0.08, 0.28)
      voice.noise({ start: at, envelope: { attack: 0.0005, release: 0.004, peak }, filter: { type: 'bandpass', frequency: voice.random.range(1800, 3400), q: 1.2 }, pan: voice.random.spread(0.4) })
    }
    voice.tone({ type: 'triangle', frequency: 1200, envelope: { attack: 0.002, release: 0.02, peak: 0.05 } })
  }
}

export class HighEnergyDetectorCue extends Cue {
  override readonly level = 1.3
  readonly name = 'HighEnergyDetector'
  readonly description = 'The high-energy detector triggers: a tight, fast burst of bright clicks and a falling zap.'
  override readonly length = 0.8

  protected build(voice: Voice): void {
    const clicks = 12
    for (let index = 0; index < clicks; index++) {
      const start = index * 0.016 + voice.random.time(0.004)
      const peak = 0.18 * (1 - index / clicks) + 0.04
      voice.tone({ type: 'square', frequency: 3100 + voice.random.spread(200), start, envelope: { attack: 0.0005, release: 0.004, peak: peak * 0.35 } })
      voice.noise({ start, envelope: { attack: 0.0005, release: 0.003, peak }, filter: { type: 'highpass', frequency: 3000 } })
    }
    voice.tone({ type: 'sine', frequency: 1900, to: 700, glide: 0.18, start: 0.02, envelope: { attack: 0.005, release: 0.2, peak: 0.08 } })
  }
}

export class PowerLowCue extends Cue {
  override readonly level = 0.7
  readonly name = 'PowerLow'
  readonly description = 'Charge has run low: a gentle falling pair through a closing filter.'
  override readonly length = 0.9
  override readonly gap = 1.5

  protected build(voice: Voice): void {
    for (const [start, frequency] of [[0, 659.25], [0.18, 493.9]] as const) {
      voice.tone({ type: 'triangle', frequency, start, envelope: { attack: 0.01, hold: 0.07, release: 0.18, peak: 0.18 }, filter: { type: 'lowpass', frequency: 2600, to: 900, time: 0.25 } })
    }
  }
}

export class RadiationHitCue extends Cue {
  override readonly level = 1.4
  readonly name = 'RadiationHit'
  readonly description = 'Radiation reaches the hull: a dull impact plus crackle; more damage, heavier hit and more crackle.'
  override readonly reverb = 0.2
  override readonly length = 1.4

  protected build(voice: Voice, params: CueParams): void {
    const damage = Cue.clamp(Cue.amount(params, 3) / 10, 0.1, 1)
    const weight = 0.45 + 0.55 * damage
    voice.tone({ type: 'sine', frequency: 150, to: 65, glide: 0.25, envelope: { attack: 0.003, release: 0.28, peak: 0.18 * weight } })
    voice.tone({ type: 'triangle', frequency: 340, to: 180, glide: 0.15, envelope: { attack: 0.003, release: 0.2, peak: 0.34 * weight } })
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.002, release: 0.2, peak: 0.36 * weight }, filter: { type: 'lowpass', frequency: 900 + 700 * damage } })
    const grains = Math.round(6 + 22 * damage)
    let at = 0.02
    for (let index = 0; index < grains; index++) {
      at += -Math.log(1 - voice.random.next()) * (0.03 - 0.012 * damage)
      voice.noise({ start: at, envelope: { attack: 0.0005, release: voice.random.range(0.003, 0.009), peak: voice.random.range(0.06, 0.22) * weight }, filter: { type: 'bandpass', frequency: voice.random.range(1800, 4200), q: 1.2 }, pan: voice.random.spread(0.6) })
    }
  }
}

export class ShieldEngageCue extends Cue {
  readonly name = 'ShieldEngage'
  readonly description = 'The magnetic shield comes up: a rising electrical hum that settles into a soft lock.'
  override readonly reverb = 0.25
  override readonly length = 1.3

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(20)
    for (const detune of [-9, 9]) {
      voice.tone({ type: 'sawtooth', frequency: 220 * pitch, detune, envelope: { attack: 0.25, hold: 0.15, release: 0.35, peak: 0.07 }, filter: { type: 'lowpass', frequency: 400, to: 2200, time: 0.35, q: 4 } })
    }
    voice.tone({ type: 'sine', frequency: 440 * pitch, to: 660 * pitch, glide: 0.3, envelope: { attack: 0.2, hold: 0.1, release: 0.3, peak: 0.08 } })
    voice.bell({ frequency: 1320 * pitch, ratio: 1.41, index: 0.7, start: 0.38, decay: 0.5, peak: 0.06 })
  }
}

export class ShieldDeflectCue extends Cue {
  readonly name = 'ShieldDeflect'
  readonly description = 'The shield turns radiation away: a bright metallic ring with a glancing swish.'
  override readonly reverb = 0.3
  override readonly length = 1.1

  protected build(voice: Voice, params: CueParams): void {
    const strength = Cue.clamp(Cue.amount(params, 3) / 8, 0.3, 1)
    const pitch = voice.random.pitch(40)
    voice.bell({ frequency: 1560 * pitch, ratio: 1.41, index: 1.6, decay: 0.7, peak: 0.14 * strength + 0.04 })
    voice.noise({ envelope: { attack: 0.004, release: 0.22, peak: 0.16 * strength }, filter: { type: 'bandpass', frequency: 4200, to: 1400, time: 0.25, q: 2 }, pan: 0.3 })
  }
}

export class ThrustersCue extends Cue {
  readonly name = 'Thrusters'
  readonly description = 'A thruster burn: a breathy whoosh with a soft low body.'
  override readonly reverb = 0.22
  override readonly length = 1.3

  protected build(voice: Voice): void {
    const pitch = voice.random.pitch(60)
    voice.noise({ colour: NoiseColour.Pink, envelope: { attack: 0.07, hold: 0.3, release: 0.45, peak: 0.34 }, filter: { type: 'bandpass', frequency: 800 * pitch, to: 1500 * pitch, time: 0.3, q: 0.9 } })
    voice.noise({ colour: NoiseColour.Brown, envelope: { attack: 0.06, hold: 0.25, release: 0.4, peak: 0.1 }, filter: { type: 'lowpass', frequency: 600 } })
  }
}

export class RepairDroneCue extends Cue {
  readonly name = 'RepairDrone'
  readonly description = 'The repair drone works: a small servo whirring up and down and a few welding ticks.'
  override readonly reverb = 0.15
  override readonly length = 1.5

  protected build(voice: Voice): void {
    const steps = [[0, 520, 700], [0.22, 700, 600], [0.4, 600, 760]] as const
    for (const [start, from, to] of steps) {
      voice.tone({ type: 'triangle', frequency: from, to, glide: 0.16, start, envelope: { attack: 0.02, hold: 0.1, release: 0.06, peak: 0.08 }, filter: { type: 'lowpass', frequency: 2200 } })
    }
    for (let index = 0; index < 7; index++) {
      const start = 0.62 + index * 0.07 + voice.random.time(0.03)
      voice.noise({ start, envelope: { attack: 0.001, release: 0.012, peak: voice.random.range(0.08, 0.16) }, filter: { type: 'bandpass', frequency: voice.random.range(2500, 4000), q: 2 } })
    }
    voice.bell({ frequency: 1760, ratio: 2, index: 0.5, start: 1.15, decay: 0.3, peak: 0.05 })
  }
}

export class ObjectPassCue extends Cue {
  readonly name = 'ObjectPass'
  readonly description = 'An object slides past: a slow doppler whoosh moving left to right, falling in pitch.'
  override readonly reverb = 0.3
  override readonly length = 1

  protected build(voice: Voice, params: CueParams): void {
    const seconds = Math.max(1, Math.min(8, params.duration ?? 3))
    const pan = voice.sweepPan(-0.8, 0.8, 0, seconds)
    const half = seconds / 2
    voice.noise({ colour: NoiseColour.Pink, into: pan, envelope: { attack: half, release: half, peak: 0.32 }, filter: { type: 'bandpass', frequency: 700, to: 1900, time: half, q: 1.1 } })
    voice.tone({ type: 'sine', frequency: 470, to: 400, glide: seconds, into: pan, envelope: { attack: half, release: half, peak: 0.07 } })
    voice.tone({ type: 'triangle', frequency: 235, to: 200, glide: seconds, into: pan, envelope: { attack: half, release: half, peak: 0.05 } })
  }
}

export class TravelCue extends Cue {
  readonly name = 'Travel'
  readonly description = 'The cruise between encounters: a swelling rush that speeds up, then settles on arrival.'
  override readonly reverb = 0.35
  override readonly length = 1.6

  protected build(voice: Voice, params: CueParams): void {
    const seconds = Math.max(1, Math.min(5, params.duration ?? 3))
    const rise = seconds * 0.78
    const settle = seconds - rise + 0.6
    const flutter = voice.gain(1)
    voice.lfo(flutter.gain, 1.5, 0.35, 0, rise + settle, 11)
    voice.noise({ colour: NoiseColour.Pink, into: flutter, envelope: { attack: rise, release: settle, peak: 0.36 }, filter: { type: 'bandpass', frequency: 320, to: 2400, time: rise, q: 1.3 } })
    voice.noise({ colour: NoiseColour.Brown, envelope: { attack: rise, release: settle * 0.8, peak: 0.08 }, filter: { type: 'lowpass', frequency: 400, to: 1000, time: rise } })
    voice.tone({ type: 'sine', frequency: 392, to: 587, glide: rise, envelope: { attack: rise * 0.8, hold: rise * 0.2, release: settle, peak: 0.04 } })
    voice.bell({ frequency: 880, ratio: 2, index: 0.6, start: rise + 0.05, decay: 1.2, peak: 0.08 })
  }
}

export class TimerTickCue extends Cue {
  readonly name = 'TimerTick'
  readonly description = 'One second of the last ten on the turn timer: a soft wooden tick.'
  override readonly reverb = 0.05
  override readonly length = 0.3
  override readonly gap = 0.2

  protected build(voice: Voice): void {
    voice.tone({ type: 'triangle', frequency: 1500 * voice.random.pitch(15), envelope: { attack: 0.001, release: 0.03, peak: 0.12 } })
    voice.noise({ envelope: { attack: 0.0005, release: 0.006, peak: 0.06 }, filter: { type: 'bandpass', frequency: 2600, q: 2 } })
  }
}

export class TimerUrgentCue extends Cue {
  readonly name = 'TimerUrgent'
  readonly description = 'One second of the last five: a brighter double tick.'
  override readonly reverb = 0.05
  override readonly length = 0.3
  override readonly gap = 0.2

  protected build(voice: Voice): void {
    for (const start of [0, 0.075]) {
      voice.tone({ type: 'triangle', frequency: 1980 * voice.random.pitch(10), start, envelope: { attack: 0.001, release: 0.035, peak: 0.15 } })
      voice.tone({ type: 'sine', frequency: 990, start, envelope: { attack: 0.001, release: 0.04, peak: 0.06 } })
    }
  }
}

export class TimeOutCue extends Cue {
  readonly name = 'TimeOut'
  readonly description = 'The turn timer ran out: three soft falling notes over a low thunk.'
  override readonly reverb = 0.2
  override readonly length = 1.2

  protected build(voice: Voice): void {
    ;[784, 659.25, 523.25].forEach((frequency, index) => {
      voice.tone({ type: 'triangle', frequency, start: index * 0.11, envelope: { attack: 0.004, hold: 0.04, release: index === 2 ? 0.45 : 0.12, peak: 0.16 } })
    })
    voice.tone({ type: 'triangle', frequency: 220, to: 160, glide: 0.1, start: 0.22, envelope: { attack: 0.003, release: 0.2, peak: 0.2 } })
  }
}

export class FlightCompleteCue extends Cue {
  readonly name = 'FlightComplete'
  readonly description = 'All six legs flown: a slow, warm, resolving arpeggio.'
  override readonly reverb = 0.4
  override readonly length = 3.6

  protected build(voice: Voice): void {
    const notes = [392, 493.9, 587.3, 740, 784]
    notes.forEach((frequency, index) => {
      const start = index * 0.2
      voice.bell({ frequency, ratio: 2, index: 0.4, start, decay: 1.6, peak: 0.1, pan: (index - 2) * 0.12 })
      voice.tone({ type: 'triangle', frequency, start, envelope: { attack: 0.02, hold: 0.1, release: 1.2, peak: 0.05 } })
    })
    for (const frequency of [196, 293.7, 392]) voice.tone({ type: 'sine', frequency, detune: voice.random.spread(5), start: 0.3, envelope: { attack: 0.6, hold: 0.8, release: 1.6, peak: 0.045 } })
  }
}

export class SpacecraftLostCue extends Cue {
  readonly name = 'SpacecraftLost'
  readonly description = 'The spacecraft is lost: the telemetry carrier sags, a breath of static, then quiet.'
  override readonly reverb = 0.35
  override readonly length = 3.4

  protected build(voice: Voice): void {
    voice.tone({ type: 'sine', frequency: 880, to: 830, glide: 1.1, envelope: { attack: 0.02, hold: 0.9, release: 0.25, peak: 0.12 } })
    voice.tone({ type: 'triangle', frequency: 440, to: 415, glide: 1.1, envelope: { attack: 0.02, hold: 0.9, release: 0.25, peak: 0.06 } })
    voice.noise({ start: 1.05, envelope: { attack: 0.03, hold: 0.25, release: 0.9, peak: 0.12 }, filter: { type: 'bandpass', frequency: 2400, to: 900, time: 1.1, q: 0.9 } })
    voice.tone({ type: 'sine', frequency: 293.7, start: 1.2, envelope: { attack: 0.5, hold: 0.4, release: 1.4, peak: 0.07 } })
    voice.tone({ type: 'sine', frequency: 220, start: 1.2, envelope: { attack: 0.5, hold: 0.4, release: 1.4, peak: 0.06 } })
  }
}
