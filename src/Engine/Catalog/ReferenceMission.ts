export enum ReferenceFactKey {
  Mass = 'Mass',
  Orbit = 'Orbit',
  Instruments = 'Instruments',
  Downlink = 'Downlink',
  DesignLife = 'DesignLife',
  Launch = 'Launch',
  Cost = 'Cost',
}

export interface ReferenceFact {
  key: ReferenceFactKey
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
