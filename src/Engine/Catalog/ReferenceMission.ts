export interface ReferenceFact {
  label: string
  value: string
  source?: string
}

export class ReferenceMission {
  constructor(
    readonly name: string,
    readonly facts: readonly ReferenceFact[],
    readonly lesson: string,
  ) {}
}
