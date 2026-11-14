import type { DesignField } from '../Design/DesignField'

export type TraceParams = Readonly<Record<string, string | number>>

export class TraceLink {
  constructor(
    readonly key: string,
    readonly params: TraceParams = {},
    readonly field?: DesignField,
  ) {}

  get isDecision(): boolean {
    return this.field !== undefined
  }
}

export enum TraceSeverity {
  Fatal = 'Fatal',
  Degraded = 'Degraded',
}

export class FailureTrace {
  constructor(
    readonly headline: TraceLink,
    readonly causes: readonly TraceLink[],
    readonly severity: TraceSeverity,
    readonly year?: number,
  ) {}

  get rootDecision(): TraceLink | undefined {
    return [...this.causes].reverse().find((link) => link.isDecision)
  }
}
