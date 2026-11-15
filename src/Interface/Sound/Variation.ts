export class Variation {
  private state: number

  constructor(seed = Math.floor(Math.random() * 0x7fffffff)) {
    this.state = seed >>> 0 || 1
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let value = this.state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  range(low: number, high: number): number {
    return low + (high - low) * this.next()
  }

  spread(amount: number): number {
    return (this.next() * 2 - 1) * amount
  }

  pitch(cents: number): number {
    return Math.pow(2, this.spread(cents) / 1200)
  }

  level(decibels: number): number {
    return Math.pow(10, this.spread(decibels) / 20)
  }

  time(seconds: number): number {
    return this.next() * seconds
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))]
  }
}
