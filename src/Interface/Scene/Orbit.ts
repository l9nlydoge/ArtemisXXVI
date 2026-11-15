import { MotionPreference } from '../Shared/MotionPreference'

export enum OrbitPace {
  Still = 0,
  Calm = 5,
  Scan = 8,
  Cruise = 60,
  Travel = 220,
}

const Easing = 420
export const OrbitRevolution = 1600

export class Orbit {
  static readonly shared = new Orbit()
  private speed = 0
  private target = 0
  private override?: number
  private travelled = 0

  get offset(): number {
    return this.travelled
  }

  get pace(): number {
    return this.override ?? this.speed
  }

  get turn(): number {
    const turn = (this.travelled % OrbitRevolution) / OrbitRevolution
    return turn < 0 ? turn + 1 : turn
  }

  aim(pace: OrbitPace | number) {
    this.target = MotionPreference.reduced ? 0 : pace
  }

  hold(pace: number | undefined) {
    this.override = pace === undefined || MotionPreference.reduced ? undefined : pace
    if (pace === undefined) return
    this.speed = pace
  }

  jump(distance: number) {
    this.travelled += distance
  }

  update(delta: number) {
    if (this.override === undefined) this.speed += (this.target - this.speed) * (1 - Math.exp(-delta / Easing))
    this.travelled += (this.pace * delta) / 1000
  }
}
