export class Numbers {
  static round(value: number, digits = 0): number {
    return Number(value.toFixed(digits))
  }

  static roundHalfUp(value: number): number {
    return Math.floor(value + 0.5 + 1e-9)
  }

  static clamp(value: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, value))
  }

  static percent(fraction: number): number {
    return Numbers.round(fraction * 100)
  }
}
