export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  between(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  integer(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1))
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0)
    let remaining = this.next() * total
    for (const item of items) {
      remaining -= weight(item)
      if (remaining < 0) return item
    }
    return items[items.length - 1]
  }

  static derive(seed: number, ...salts: number[]): SeededRandom {
    let mixed = seed >>> 0
    for (const salt of salts) {
      mixed = Math.imul(mixed ^ (salt + 0x9e3779b9), 0x85ebca6b) >>> 0
      mixed = (mixed ^ (mixed >>> 13)) >>> 0
    }
    return new SeededRandom(mixed)
  }

  static hashText(text: string): number {
    let value = 2166136261
    for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619) >>> 0
    return value
  }

  static isSeed(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 2 ** 32
  }

  static randomSeed(): number {
    return Math.floor(Math.random() * 2 ** 31)
  }
}
