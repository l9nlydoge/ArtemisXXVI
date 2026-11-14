export class TurnPlan {
  static readonly empty = new TurnPlan([])
  readonly keys: ReadonlySet<string>

  constructor(keys: Iterable<string>) {
    this.keys = new Set(keys)
  }

  has(key: string): boolean {
    return this.keys.has(key)
  }

  toggle(key: string): TurnPlan {
    const next = new Set(this.keys)
    if (!next.delete(key)) next.add(key)
    return new TurnPlan(next)
  }

  with(key: string): TurnPlan {
    return this.has(key) ? this : new TurnPlan([...this.keys, key])
  }

  get list(): string[] {
    return [...this.keys]
  }

  get isEmpty(): boolean {
    return this.keys.size === 0
  }
}
