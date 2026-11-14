export class Numbers {
  static round(value: number, digits = 0): number {
    return Number(value.toFixed(digits))
  }

  static percent(fraction: number): number {
    return Numbers.round(fraction * 100)
  }
}
