import { AmbiencePlace } from '../Ambience/AmbienceMixer'
import type { CueParams } from '../Cue'
import type { CueName } from '../CueLibrary'
import type { FlightSnapshot, GameSnapshot } from './GameSnapshot'

export type SoundEvent =
  | { kind: 'Cue'; name: CueName; params: CueParams; delay: number }
  | { kind: 'Ambience'; place: AmbiencePlace }
  | { kind: 'Orbit'; speed: number }
  | { kind: 'Storm'; level: number }
  | { kind: 'Launch' }

const ScreenOrder = ['Home', 'Logbook', 'Sources', 'Week', 'Hangar', 'Flight', 'Debrief', 'Lab']

const ModuleCues: Readonly<Record<string, CueName>> = {
  Camera: 'Camera',
  Spectrometer: 'Spectrometer',
  Radar: 'Radar',
  ParticleDetector: 'ParticleDetector',
  HighEnergyDetector: 'HighEnergyDetector',
  MagneticShield: 'ShieldEngage',
  Thrusters: 'Thrusters',
  RepairDrone: 'RepairDrone',
}

export class CueRules {
  static readonly travelSeconds = 2.6
  static readonly lowCharge = 0.2

  static placeFor(snapshot: GameSnapshot): AmbiencePlace {
    switch (snapshot.screen) {
      case 'Hangar':
        return AmbiencePlace.Hangar
      case 'Flight':
        return snapshot.flight?.storm ? AmbiencePlace.Storm : AmbiencePlace.Flight
      case 'Debrief':
        return AmbiencePlace.Debrief
      case 'Lab':
        return AmbiencePlace.Lab
      default:
        return AmbiencePlace.Home
    }
  }

  static orbitSpeedFor(flight?: FlightSnapshot): number {
    if (!flight) return 0.3
    switch (flight.phase) {
      case 'Encounter':
        return Math.min(0.85, 0.55 + 0.06 * flight.turnsPlayed)
      case 'EncounterDone':
        return 0.4
      case 'Completed':
      case 'Lost':
        return 0.15
      default:
        return 0.3
    }
  }

  static stormFor(flight?: FlightSnapshot): number {
    if (!flight || !flight.storm) return 0
    return Math.max(0.15, Math.min(1, flight.radiation / 10))
  }

  static opening(snapshot: GameSnapshot): SoundEvent[] {
    return [
      { kind: 'Orbit', speed: CueRules.orbitSpeedFor(snapshot.flight) },
      { kind: 'Storm', level: CueRules.stormFor(snapshot.flight) },
      { kind: 'Ambience', place: CueRules.placeFor(snapshot) },
    ]
  }

  static derive(before: GameSnapshot, after: GameSnapshot): SoundEvent[] {
    const events: SoundEvent[] = []
    const cue = (name: CueName, delay = 0, params: CueParams = {}) => events.push({ kind: 'Cue', name, params, delay })
    const launched = after.flight !== undefined && (before.flight === undefined || before.flight.seed !== after.flight.seed) && after.screen === 'Flight' && after.flight.commands === 0

    if (launched) events.push({ kind: 'Launch' })
    else if (before.screen !== after.screen) cue(CueRules.isForward(before.screen, after.screen) ? 'ScreenForward' : 'ScreenBack')

    if (after.rank > before.rank) cue('RankUp', before.screen !== after.screen ? 0.7 : 0.1)

    const purchased = after.points < before.points && after.lifetimePoints === before.lifetimePoints && after.owned !== before.owned
    if (purchased) cue('Purchase')

    if (before.screen === 'Hangar' && after.screen === 'Hangar') CueRules.loadoutCues(before, after, cue)

    const sameFlight = before.flight !== undefined && after.flight !== undefined && before.flight.seed === after.flight.seed
    if (sameFlight && after.flight!.commands === before.flight!.commands) {
      for (const key of after.plan) if (!before.plan.includes(key)) cue('CardOn')
      for (const key of before.plan) if (!after.plan.includes(key)) cue('CardOff')
    }
    if (sameFlight && after.flight!.commands > before.flight!.commands) CueRules.commandCues(before.flight!, after.flight!, cue)
    if (launched) cue('ContactFound', 7.2, { amount: after.flight!.contacts })

    const speed = CueRules.orbitSpeedFor(after.flight)
    if (speed !== CueRules.orbitSpeedFor(before.flight)) events.push({ kind: 'Orbit', speed })
    const storm = CueRules.stormFor(after.flight)
    if (storm !== CueRules.stormFor(before.flight)) events.push({ kind: 'Storm', level: storm })
    const place = CueRules.placeFor(after)
    if (place !== CueRules.placeFor(before)) events.push({ kind: 'Ambience', place })
    return events
  }

  private static isForward(from: string, to: string): boolean {
    if (from === 'Lab') return to === 'Hangar'
    return ScreenOrder.indexOf(to) > ScreenOrder.indexOf(from)
  }

  private static loadoutCues(before: GameSnapshot, after: GameSnapshot, cue: (name: CueName, delay?: number, params?: CueParams) => void): void {
    let changed = false
    for (const [key, mark] of after.modules) {
      const was = before.modules.get(key)
      if (was === undefined) {
        cue('ModuleFit')
        changed = true
      } else if (was !== mark) {
        cue('MarkChange', 0, { direction: mark > was ? 1 : -1 })
        changed = true
      }
    }
    for (const key of before.modules.keys()) {
      if (!after.modules.has(key)) {
        cue('ModuleRemove')
        changed = true
      }
    }
    if (changed && after.overLimit && !before.overLimit) cue('OverLimit', 0.16)
  }

  private static commandCues(before: FlightSnapshot, after: FlightSnapshot, cue: (name: CueName, delay?: number, params?: CueParams) => void): void {
    const command = after.lastCommand
    if (!command) return
    switch (command.type) {
      case 'Survey':
        cue('ScannerPing')
        cue('ContactFound', 0.55, { amount: after.contacts })
        return
      case 'Choose':
        cue('Approach')
        return
      case 'Chase':
        cue('Thrusters')
        cue('Approach', 0.35)
        return
      case 'Hold':
      case 'Continue':
        if (after.phase === 'Completed') {
          cue('FlightComplete', 0.15)
          return
        }
        cue('Travel', 0, { duration: CueRules.travelSeconds })
        cue('ScannerPing', CueRules.travelSeconds)
        cue('ContactFound', CueRules.travelSeconds + 0.45, { amount: after.contacts })
        return
      case 'Commit':
        CueRules.turnCues(before, after, command.keys ?? [], cue)
        return
    }
  }

  private static turnCues(before: FlightSnapshot, after: FlightSnapshot, keys: readonly string[], cue: (name: CueName, delay?: number, params?: CueParams) => void): void {
    cue('EndTurn')
    let delay = 0.14
    const fired = new Set<CueName>()
    for (const key of [...keys].sort()) {
      const name = ModuleCues[key.split('#')[0]]
      if (!name || fired.has(name)) continue
      fired.add(name)
      cue(name, delay)
      delay += 0.16
    }
    const outcome = after.outcome
    if (!outcome) return
    let at = Math.max(0.45, delay + 0.05)
    if (outcome.blocked > 0) {
      cue('ShieldDeflect', at, { amount: outcome.blocked })
      at += 0.12
    }
    if (outcome.incoming > 0) {
      cue('RadiationHit', at, { amount: outcome.incoming })
      at += 0.3
    }
    if (outcome.gains > 0) cue('DataRecorded', at + 0.1, { amount: outcome.gains })
    if (outcome.lost || after.phase === 'Lost') {
      cue('SpacecraftLost', at + 0.6)
      return
    }
    const wasLow = before.capacity > 0 && before.charge / before.capacity < CueRules.lowCharge
    const isLow = after.capacity > 0 && after.charge / after.capacity < CueRules.lowCharge
    if (isLow && !wasLow && after.inEncounter) cue('PowerLow', at + 0.5)
  }
}
