export class UtcDate {
  private static readonly shape = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

  static parse(text: string): number {
    const parts = typeof text === 'string' ? UtcDate.shape.exec(text) : null
    if (!parts) throw new Error(`A date must look like 2019-07-25T01:22:00Z, with a time zone: ${String(text)}`)
    const [year, month, day, hour, minute] = parts.slice(1, 6).map(Number)
    const calendar = new Date(Date.UTC(year, month - 1, day))
    const realDay = calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day
    const time = Date.parse(text)
    if (!realDay || hour > 23 || minute > 59 || Number(parts[6] ?? 0) > 59 || Number.isNaN(time)) throw new Error(`Not a real date: ${text}`)
    return time
  }
}
