export class UtcDate {
  private static readonly zoned = /(Z|[+-]\d\d:\d\d)$/

  static parse(text: string): number {
    if (typeof text !== 'string' || !UtcDate.zoned.test(text)) throw new Error(`A date needs a time zone, such as a trailing Z: ${text}`)
    const time = Date.parse(text)
    if (Number.isNaN(time)) throw new Error(`Not a date: ${text}`)
    return time
  }
}
