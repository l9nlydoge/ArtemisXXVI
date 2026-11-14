import { Role } from './Role'
import type { SliceKey } from './DesignSlices'

export enum DesignField {
  Instruments = 'Instruments',
  DesignLife = 'DesignLife',
  Bus = 'Bus',
  ArrayType = 'ArrayType',
  ArrayArea = 'ArrayArea',
  Battery = 'Battery',
  Shielding = 'Shielding',
  Orbit = 'Orbit',
  Comms = 'Comms',
  GroundStations = 'GroundStations',
  LaunchVehicle = 'LaunchVehicle',
  Copies = 'Copies',
}

export class FieldOwnership {
  private static readonly sliceOf: Record<DesignField, SliceKey> = {
    [DesignField.Instruments]: 'Science',
    [DesignField.DesignLife]: 'Science',
    [DesignField.Bus]: 'Spacecraft',
    [DesignField.ArrayType]: 'Spacecraft',
    [DesignField.ArrayArea]: 'Spacecraft',
    [DesignField.Battery]: 'Spacecraft',
    [DesignField.Shielding]: 'Spacecraft',
    [DesignField.Orbit]: 'Operations',
    [DesignField.Comms]: 'Operations',
    [DesignField.GroundStations]: 'Operations',
    [DesignField.LaunchVehicle]: 'Program',
    [DesignField.Copies]: 'Program',
  }

  private static readonly ownerOfSlice: Record<SliceKey, Role> = {
    Science: Role.PrincipalInvestigator,
    Spacecraft: Role.SpacecraftEngineer,
    Operations: Role.MissionOps,
    Program: Role.ProgramManager,
  }

  static slice(field: DesignField): SliceKey {
    return FieldOwnership.sliceOf[field]
  }

  static owner(field: DesignField): Role {
    return FieldOwnership.ownerOfSlice[FieldOwnership.sliceOf[field]]
  }

  static sliceFor(role: Role): SliceKey {
    const entry = Object.entries(FieldOwnership.ownerOfSlice).find(([, owner]) => owner === role)
    return entry![0] as SliceKey
  }

  static fieldsOf(role: Role): DesignField[] {
    const slice = FieldOwnership.sliceFor(role)
    return (Object.keys(FieldOwnership.sliceOf) as DesignField[]).filter((field) => FieldOwnership.sliceOf[field] === slice)
  }
}
