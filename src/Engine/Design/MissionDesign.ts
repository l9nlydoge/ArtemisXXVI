import type { DesignSlices, SliceKey } from './DesignSlices'

export class MissionDesign {
  constructor(readonly slices: Readonly<DesignSlices>) {}

  static starter(): MissionDesign {
    return new MissionDesign({
      Science: { instrumentIds: ['CubeCamera'], designLifeYears: 3 },
      Spacecraft: { busId: 'CubeSat6U', arrayTypeId: 'Rigid', arrayAreaM2: 0.2, batteryWh: 40, shielded: false },
      Operations: { orbitId: 'Sso705', commsId: 'SBand', groundStations: 1 },
      Program: { launchVehicleId: 'Rideshare', copies: 1 },
    })
  }

  static fromJson(json: DesignSlices): MissionDesign {
    return new MissionDesign({
      Science: { ...json.Science, instrumentIds: [...(json.Science.instrumentIds ?? [])] },
      Spacecraft: { ...json.Spacecraft },
      Operations: { ...json.Operations },
      Program: { ...json.Program },
    })
  }

  with<K extends SliceKey>(key: K, patch: Partial<DesignSlices[K]>): MissionDesign {
    return new MissionDesign({ ...this.slices, [key]: { ...this.slices[key], ...patch } })
  }

  toJson(): DesignSlices {
    return structuredClone(this.slices) as DesignSlices
  }

  encode(): string {
    return btoa(JSON.stringify(this.slices))
  }

  static decode(encoded: string): MissionDesign {
    return MissionDesign.fromJson(JSON.parse(atob(encoded)) as DesignSlices)
  }
}
