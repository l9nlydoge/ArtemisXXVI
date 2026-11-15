import type { Cue } from './Cue'
import {
  ApproachCue,
  CameraCue,
  ContactFoundCue,
  DataRecordedCue,
  EndTurnCue,
  FlightCompleteCue,
  HighEnergyDetectorCue,
  ObjectPassCue,
  ParticleDetectorCue,
  PowerLowCue,
  RadarCue,
  RadiationHitCue,
  RepairDroneCue,
  ScannerPingCue,
  ShieldDeflectCue,
  ShieldEngageCue,
  SpacecraftLostCue,
  SpectrometerCue,
  ThrustersCue,
  TimeOutCue,
  TimerTickCue,
  TimerUrgentCue,
  TravelCue,
} from './Cues/FlightCues'
import { MarkChangeCue, ModuleFitCue, ModuleRemoveCue, OverLimitCue } from './Cues/HangarCues'
import { CardOffCue, CardOnCue, DeniedCue, HoverCue, PressCue, PurchaseCue, RankUpCue, ReleaseCue, ScreenChangeCue } from './Cues/InterfaceCues'
import { DeployCue, FairingReleaseCue, IgnitionCue, StageSeparationCue } from './Cues/LaunchCues'

export const CueNames = [
  'Hover',
  'Press',
  'Release',
  'CardOn',
  'CardOff',
  'Denied',
  'ScreenForward',
  'ScreenBack',
  'Purchase',
  'RankUp',
  'ModuleFit',
  'ModuleRemove',
  'MarkChange',
  'OverLimit',
  'Ignition',
  'StageSeparation',
  'FairingRelease',
  'Deploy',
  'ScannerPing',
  'ContactFound',
  'Approach',
  'EndTurn',
  'DataRecorded',
  'Camera',
  'Spectrometer',
  'Radar',
  'ParticleDetector',
  'HighEnergyDetector',
  'PowerLow',
  'RadiationHit',
  'ShieldEngage',
  'ShieldDeflect',
  'Thrusters',
  'RepairDrone',
  'ObjectPass',
  'Travel',
  'TimerTick',
  'TimerUrgent',
  'TimeOut',
  'FlightComplete',
  'SpacecraftLost',
] as const

export type CueName = (typeof CueNames)[number]

export class CueLibrary {
  private readonly cues = new Map<CueName, Cue>()

  constructor() {
    const all: Cue[] = [
      new HoverCue(),
      new PressCue(),
      new ReleaseCue(),
      new CardOnCue(),
      new CardOffCue(),
      new DeniedCue(),
      new ScreenChangeCue('ScreenForward', true),
      new ScreenChangeCue('ScreenBack', false),
      new PurchaseCue(),
      new RankUpCue(),
      new ModuleFitCue(),
      new ModuleRemoveCue(),
      new MarkChangeCue(),
      new OverLimitCue(),
      new IgnitionCue(),
      new StageSeparationCue(),
      new FairingReleaseCue(),
      new DeployCue(),
      new ScannerPingCue(),
      new ContactFoundCue(),
      new ApproachCue(),
      new EndTurnCue(),
      new DataRecordedCue(),
      new CameraCue(),
      new SpectrometerCue(),
      new RadarCue(),
      new ParticleDetectorCue(),
      new HighEnergyDetectorCue(),
      new PowerLowCue(),
      new RadiationHitCue(),
      new ShieldEngageCue(),
      new ShieldDeflectCue(),
      new ThrustersCue(),
      new RepairDroneCue(),
      new ObjectPassCue(),
      new TravelCue(),
      new TimerTickCue(),
      new TimerUrgentCue(),
      new TimeOutCue(),
      new FlightCompleteCue(),
      new SpacecraftLostCue(),
    ]
    for (const cue of all) this.cues.set(cue.name as CueName, cue)
  }

  get(name: CueName): Cue | undefined {
    return this.cues.get(name)
  }

  get all(): readonly Cue[] {
    return [...this.cues.values()]
  }

  static isName(name: string): name is CueName {
    return (CueNames as readonly string[]).includes(name)
  }
}
