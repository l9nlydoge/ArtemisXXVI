export interface ScienceSlice {
  instrumentIds: string[]
  designLifeYears: number
}

export interface SpacecraftSlice {
  busId: string
  arrayTypeId: string
  arrayAreaM2: number
  batteryWh: number
  shielded: boolean
}

export interface OperationsSlice {
  orbitId: string
  commsId: string
  groundStations: number
}

export interface ProgramSlice {
  launchVehicleId: string
  copies: number
}

export interface DesignSlices {
  Science: ScienceSlice
  Spacecraft: SpacecraftSlice
  Operations: OperationsSlice
  Program: ProgramSlice
}

export type SliceKey = keyof DesignSlices
