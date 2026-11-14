import type { Mark, MarkSpec } from '../Modules/MarkSpec'
import type { ModuleCard } from '../Modules/ModuleCard'

export class InstalledModule {
  constructor(
    readonly card: ModuleCard,
    readonly mark: Mark,
    readonly copy: number,
  ) {}

  get key(): string {
    return `${this.card.id}#${this.copy}`
  }

  get spec(): MarkSpec {
    return this.card.mark(this.mark)
  }

  get value(): number {
    return this.spec.value
  }

  withMark(mark: Mark): InstalledModule {
    return new InstalledModule(this.card, mark, this.copy)
  }
}
