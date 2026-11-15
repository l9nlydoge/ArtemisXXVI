export const PassEntry = 0
export const PassExit = 1
const Near = 0.18
const Far = 0.82
const PlanningDrift = 0.35

export class PassPath {
  readonly peak: number
  private readonly stops: readonly number[]

  constructor(readonly signals: readonly number[]) {
    if (signals.length === 0) throw new Error('A pass needs at least one turn')
    this.peak = signals.indexOf(Math.max(...signals))
    const count = signals.length
    this.stops = signals.map((_, turn) => {
      if (turn === this.peak) return 0.5
      if (turn < this.peak) return Near + ((0.5 - Near) * turn) / this.peak
      return 0.5 + ((Far - 0.5) * (turn - this.peak)) / (count - 1 - this.peak)
    })
  }

  get turnCount(): number {
    return this.stops.length
  }

  stop(turn: number): number {
    if (turn < 0) return PassEntry
    if (turn >= this.stops.length) return PassExit
    return this.stops[turn]
  }

  planning(turn: number, share: number): number {
    const from = this.stop(turn)
    const to = this.stop(turn + 1)
    return from + (to - from) * PlanningDrift * Math.max(0, Math.min(1, share))
  }

  closeness(position: number): number {
    return 1 - Math.min(1, Math.abs(position - 0.5) * 2)
  }
}
