import { UtcDate } from '../Core/UtcDate'

const HourMs = 3600000

export class DateWindow {
  private readonly start: number
  private readonly end: number

  constructor(readonly startUtc: string, readonly endUtc: string) {
    this.start = UtcDate.parse(startUtc)
    this.end = UtcDate.parse(endUtc)
    if (this.end <= this.start) throw new Error(`Bad date window: ${startUtc} to ${endUtc}`)
  }

  contains(dateUtc: string): boolean {
    const time = UtcDate.parse(dateUtc)
    return time >= this.start && time < this.end
  }

  withLead(hours: number): DateWindow {
    return new DateWindow(new Date(this.start - hours * HourMs).toISOString(), this.endUtc)
  }

  get days(): number {
    return (this.end - this.start) / (24 * HourMs)
  }
}
