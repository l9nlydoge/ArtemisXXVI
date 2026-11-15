import type { CueName } from './CueLibrary'

export class TurnTimer {
  static readonly quietUntil = 10
  static readonly urgentFrom = 5
  private lastWhole: number

  constructor(readonly seconds = 30) {
    this.lastWhole = Math.ceil(seconds)
  }

  cuesAt(elapsed: number): CueName[] {
    const remaining = Math.max(0, this.seconds - elapsed)
    const whole = Math.ceil(remaining)
    const cues: CueName[] = []
    while (this.lastWhole > whole) {
      this.lastWhole -= 1
      const left = this.lastWhole
      if (left === 0) cues.push('TimeOut')
      else if (left <= TurnTimer.urgentFrom) cues.push('TimerUrgent')
      else if (left <= TurnTimer.quietUntil) cues.push('TimerTick')
    }
    return cues
  }

  get finished(): boolean {
    return this.lastWhole <= 0
  }
}
