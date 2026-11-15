export const TurnSeconds = 30
export const CautionSeconds = 10
export const DangerSeconds = 5

export enum TimerTone {
  Calm = 'Calm',
  Caution = 'Caution',
  Danger = 'Danger',
}

export class TurnTimer {
  private used = 0
  private last?: number
  private fired = false

  constructor(readonly length = TurnSeconds * 1000) {}

  update(now: number, paused: boolean): boolean {
    if (this.last !== undefined && !paused) this.used = Math.min(this.length, this.used + Math.max(0, now - this.last))
    this.last = now
    if (this.used >= this.length && !this.fired) {
      this.fired = true
      return true
    }
    return false
  }

  get remaining(): number {
    return Math.max(0, this.length - this.used)
  }

  get seconds(): number {
    return Math.ceil(this.remaining / 1000)
  }

  get share(): number {
    return this.remaining / this.length
  }

  get expired(): boolean {
    return this.fired
  }

  get tone(): TimerTone {
    const seconds = this.remaining / 1000
    if (seconds <= DangerSeconds) return TimerTone.Danger
    if (seconds <= CautionSeconds) return TimerTone.Caution
    return TimerTone.Calm
  }
}
