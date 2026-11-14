interface Range {
  min: number
  max: number
  step: number
  start: number
}

export class ControlRanges {
  private static readonly arrayAreas: Record<string, Range> = {
    CubeSat6U: { min: 0.05, max: 2, step: 0.05, start: 0.2 },
    SmallSat: { min: 0.5, max: 12, step: 0.1, start: 2 },
    Medium: { min: 1, max: 30, step: 0.5, start: 6 },
    Large: { min: 2, max: 60, step: 0.5, start: 9 },
  }

  private static readonly batteries: Record<string, Range> = {
    CubeSat6U: { min: 10, max: 400, step: 10, start: 40 },
    SmallSat: { min: 50, max: 3000, step: 50, start: 600 },
    Medium: { min: 200, max: 12000, step: 100, start: 2500 },
    Large: { min: 500, max: 20000, step: 100, start: 4000 },
  }

  static arrayArea(busId: string): Range {
    return ControlRanges.arrayAreas[busId] ?? ControlRanges.arrayAreas.Medium
  }

  static battery(busId: string): Range {
    return ControlRanges.batteries[busId] ?? ControlRanges.batteries.Medium
  }

  static fit(value: number, range: Range): number {
    return value < range.min || value > range.max ? range.start : value
  }
}
