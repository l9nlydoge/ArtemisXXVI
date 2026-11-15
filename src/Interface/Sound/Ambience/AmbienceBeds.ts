import { NoiseColour } from '../NoiseBank'
import { AmbienceBed } from './AmbienceBed'

export class HomeBed extends AmbienceBed {
  protected readonly level = 0.3

  protected build(): void {
    const warmth = this.filter('lowpass', 900, 0.9)
    this.wander(warmth.frequency, 650, 1300, 6, 14)
    this.drone('sine', 110, 0.045, warmth)
    this.drone('sine', 164.8, 0.045, warmth)
    this.drone('triangle', 220, 0.06, warmth)
    this.drone('sine', 277.2, 0.04, warmth, 8)
    this.drone('sine', 329.6, 0.04, warmth, 8)
    this.drone('sine', 440, 0.016, warmth, 8)
    this.drone('sine', 659.3, 0.007, warmth, 10)
    const air = this.noise(NoiseColour.Pink, 'bandpass', 700, 0.8, 0.09)
    this.wander(air.filter.frequency, 450, 1300, 5, 11)
    this.shimmer([1318.5, 1760, 1975.5, 2637], 9, 18, 0.03)
  }
}

export class HangarBed extends AmbienceBed {
  protected readonly level = 0.7

  protected build(): void {
    const room = this.noise(NoiseColour.Pink, 'bandpass', 900, 0.45, 0.11)
    this.wander(room.gain.gain, 0.08, 0.12, 4, 9)
    this.noise(NoiseColour.Brown, 'lowpass', 400, 0.6, 0.025)
    const vent = this.noise(NoiseColour.Pink, 'bandpass', 700, 2, 0.03)
    this.wander(vent.filter.frequency, 500, 950, 6, 13)
    this.wander(vent.gain.gain, 0.01, 0.045, 5, 11)
    const hum = this.filter('lowpass', 900, 0.7)
    this.drone('sine', 100, 0.012, hum, 1)
    this.drone('sine', 200, 0.014, hum, 1)
    this.drone('sine', 300, 0.014, hum, 1)
    this.drone('triangle', 600, 0.005, hum, 2)
    this.shimmer([2093, 2349], 14, 26, 0.012)
  }
}

export class OrbitBed extends AmbienceBed {
  protected readonly level: number = 0.5
  protected speedFilter!: BiquadFilterNode
  protected air!: BiquadFilterNode
  protected airGain!: GainNode
  protected darkness = 1
  private speed = 0.35

  protected build(): void {
    const motion = this.filter('lowpass', 1800, 1.6)
    this.wander(motion.frequency, 900, 2600, 5, 12)
    this.speedFilter = this.filter('lowpass', this.cutoff(this.speed), 0.8, motion)
    this.drone('sawtooth', 55, 0.012, this.speedFilter, 4)
    this.drone('triangle', 110, 0.035, this.speedFilter, 6)
    this.drone('sine', 164.8, 0.035, this.speedFilter, 7)
    this.drone('sawtooth', 220.6, 0.02, this.speedFilter, 9)
    this.drone('triangle', 329.6, 0.03, this.speedFilter, 9)
    this.drone('sine', 440, 0.014, this.speedFilter, 9)
    const air = this.noise(NoiseColour.Pink, 'bandpass', this.airCentre(this.speed), 0.7, this.airLevel(this.speed))
    this.air = air.filter
    this.airGain = air.gain
    this.shimmer([1174.7, 1568, 1760, 2349], 10, 20, 0.025)
  }

  override setOrbitSpeed(speed: number, at: number): void {
    this.speed = Math.max(0, Math.min(1, speed))
    if (!this.speedFilter) return
    this.speedFilter.frequency.setTargetAtTime(this.cutoff(this.speed), at, 0.6)
    this.air.frequency.setTargetAtTime(this.airCentre(this.speed), at, 0.6)
    this.airGain.gain.setTargetAtTime(this.airLevel(this.speed), at, 0.6)
  }

  private cutoff(speed: number): number {
    return (260 + 1500 * speed) * this.darkness
  }

  private airCentre(speed: number): number {
    return (350 + 1300 * speed) * this.darkness
  }

  private airLevel(speed: number): number {
    return 0.05 + 0.08 * speed
  }
}

export class StormBed extends OrbitBed {
  protected override readonly level = 0.5
  protected override darkness = 0.6
  private crackle!: BiquadFilterNode
  private storm = 0.4

  protected override build(): void {
    super.build()
    const rumble = this.noise(NoiseColour.Brown, 'lowpass', 420, 0.8, 0.05)
    this.wander(rumble.gain.gain, 0.03, 0.06, 3, 7)
    const whistle = this.noise(NoiseColour.White, 'bandpass', 900, 9, 0.03)
    this.wander(whistle.filter.frequency, 600, 1500, 3, 8)
    this.wander(whistle.gain.gain, 0.0, 0.05, 3, 8)
    this.crackle = this.filter('bandpass', 2600, 0.9)
  }

  override setStorm(level: number): void {
    this.storm = Math.max(0, Math.min(1, level))
  }

  protected override grains(from: number, until: number): void {
    if (!this.crackle) return
    let at = from
    for (let count = 0; count < 400; count++) {
      const density = 2 + 26 * this.storm
      at += -Math.log(1 - this.random.next()) / density
      if (at >= until) break
      this.grainSource(at, this.random.range(0.002, 0.012), this.random.range(0.04, 0.16) * (0.5 + this.storm), this.crackle)
    }
  }
}

export class DebriefBed extends AmbienceBed {
  protected readonly level = 0.33

  protected build(): void {
    const soft = this.filter('lowpass', 1300, 0.7)
    this.wander(soft.frequency, 900, 1600, 6, 14)
    this.drone('sine', 146.8, 0.045, soft)
    this.drone('sine', 220, 0.05, soft)
    this.drone('triangle', 293.7, 0.045, soft)
    this.drone('sine', 370, 0.03, soft, 8)
    this.drone('sine', 440, 0.016, soft, 8)
    this.noise(NoiseColour.Pink, 'bandpass', 650, 0.6, 0.05)
    this.shimmer([1174.7, 1480, 1760], 12, 22, 0.022)
  }
}

export class LabBed extends AmbienceBed {
  protected readonly level = 0.45

  protected build(): void {
    const soft = this.filter('lowpass', 1700, 0.7)
    this.wander(soft.frequency, 1100, 2100, 6, 14)
    this.drone('sine', 196, 0.04, soft)
    this.drone('triangle', 293.7, 0.04, soft)
    this.drone('sine', 493.9, 0.025, soft, 8)
    this.drone('sine', 98, 0.02, soft)
    this.noise(NoiseColour.Pink, 'bandpass', 900, 0.5, 0.06)
    this.shimmer([1568, 1975.5, 2349, 2960], 8, 16, 0.02)
  }
}
