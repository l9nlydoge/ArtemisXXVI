const HourMs = 3600000

export class DateWindow {
  private readonly start: number
  private readonly end: number

  constructor(readonly startUtc: string, readonly endUtc: string) {
    this.start = Date.parse(startUtc)
    this.end = Date.parse(endUtc)
    if (Number.isNaN(this.start) || Number.isNaN(this.end) || this.end <= this.start) throw new Error(`Bad date window: ${startUtc} to ${endUtc}`)
  }

  contains(dateUtc: string): boolean {
    const time = Date.parse(dateUtc)
    return time >= this.start && time < this.end
  }

  withLead(hours: number): DateWindow {
    return new DateWindow(new Date(this.start - hours * HourMs).toISOString(), this.endUtc)
  }

  get days(): number {
    return (this.end - this.start) / (24 * HourMs)
  }
}
