export const TravelLongest = 8000
export const TravelUsual = 6000
const RiseShare = 0.3
const FallShare = 0.4

export class TravelBeat {
  readonly length: number

  constructor(length = TravelUsual, readonly peak = 220, readonly rest = 8) {
    this.length = Math.max(0, Math.min(TravelLongest, length))
  }

  progress(elapsed: number): number {
    return this.length === 0 ? 1 : Math.max(0, Math.min(1, elapsed / this.length))
  }

  done(elapsed: number): boolean {
    return elapsed >= this.length
  }

  pace(elapsed: number): number {
    const at = this.progress(elapsed)
    if (at < RiseShare) {
      const rise = at / RiseShare
      return this.rest + (this.peak - this.rest) * rise * rise
    }
    if (at > 1 - FallShare) {
      const fall = (1 - at) / FallShare
      return this.rest + (this.peak - this.rest) * (1 - (1 - fall) ** 3)
    }
    return this.peak
  }
}
