import type { TraceParams } from './TraceLink'

export enum MissionEventKind {
  Launch = 'Launch',
  LaunchFailure = 'LaunchFailure',
  OrbitReached = 'OrbitReached',
  SolarStorm = 'SolarStorm',
  Micrometeoroid = 'Micrometeoroid',
  HighSolarActivity = 'HighSolarActivity',
  Brownout = 'Brownout',
  BatteryWornOut = 'BatteryWornOut',
  RadiationFailure = 'RadiationFailure',
  PropellantDepleted = 'PropellantDepleted',
  BusWornOut = 'BusWornOut',
  TargetReached = 'TargetReached',
  DesignLifeComplete = 'DesignLifeComplete',
}

export class MissionEvent {
  constructor(
    readonly year: number,
    readonly kind: MissionEventKind,
    readonly params: TraceParams = {},
  ) {}

  get isFatal(): boolean {
    return [
      MissionEventKind.LaunchFailure,
      MissionEventKind.BatteryWornOut,
      MissionEventKind.RadiationFailure,
      MissionEventKind.PropellantDepleted,
      MissionEventKind.BusWornOut,
    ].includes(this.kind)
  }
}
