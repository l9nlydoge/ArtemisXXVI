import { describe, expect, it } from 'vitest'
import { GameData } from '../../../Data/GameData'
import { SeededRandom } from '../../../Engine/Core/SeededRandom'
import { Flight } from '../../../Engine/Flight/Flight'
import { Commands } from '../../../Engine/Flight/FlightCommand'
import { TurnPlan } from '../../../Engine/Flight/TurnPlan'
import { Profile } from '../../../Engine/Progress/Profile'
import { Loadout } from '../../../Engine/Spacecraft/Loadout'
import { WeekCatalog } from '../../../Engine/Weeks/WeekCatalog'
import { AmbiencePlace } from '../Ambience/AmbienceMixer'
import { SoundMeter } from '../Bench/SoundMeter'
import { CueLibrary, CueNames } from '../CueLibrary'
import { CueRules, type SoundEvent } from '../Direction/CueRules'
import { SnapshotReader, type FlightSnapshot, type GameSnapshot } from '../Direction/GameSnapshot'
import { TurnTimer } from '../TurnTimer'
import { Variation } from '../Variation'

function game(change: Partial<GameSnapshot> = {}): GameSnapshot {
  return { screen: 'Home', modules: new Map(), overLimit: false, plan: [], rank: 1, points: 100, lifetimePoints: 100, owned: '{}', ...change }
}

function flight(change: Partial<FlightSnapshot> = {}): FlightSnapshot {
  return { seed: 7, phase: 'Scanning', leg: 0, storm: false, commands: 0, contacts: 3, inEncounter: false, turnsPlayed: 0, hull: 10, maxHull: 10, charge: 10, capacity: 10, radiation: 0, ...change }
}

function cues(events: SoundEvent[]): string[] {
  return events.filter((event) => event.kind === 'Cue').map((event) => (event.kind === 'Cue' ? event.name : ''))
}

describe('CueRules', () => {
  it('whooshes forward and back between screens and changes the ambience', () => {
    const forward = CueRules.derive(game({ screen: 'Home' }), game({ screen: 'Week' }))
    expect(cues(forward)).toEqual(['ScreenForward'])
    const back = CueRules.derive(game({ screen: 'Hangar' }), game({ screen: 'Week' }))
    expect(cues(back)).toEqual(['ScreenBack'])
    expect(back).toContainEqual({ kind: 'Ambience', place: AmbiencePlace.Home })
  })

  it('launches instead of whooshing when a new flight starts', () => {
    const events = CueRules.derive(game({ screen: 'Hangar' }), game({ screen: 'Flight', flight: flight() }))
    expect(events.some((event) => event.kind === 'Launch')).toBe(true)
    expect(cues(events)).not.toContain('ScreenForward')
    expect(events).toContainEqual({ kind: 'Ambience', place: AmbiencePlace.Flight })
  })

  it('hears fitting, removing and re-marking modules and going over the limit', () => {
    const before = game({ screen: 'Hangar', modules: new Map([['Camera#1', 1], ['Radar#1', 1]]) })
    const after = game({ screen: 'Hangar', modules: new Map([['Camera#1', 2], ['Battery#1', 1]]), overLimit: true })
    expect(cues(CueRules.derive(before, after))).toEqual(['MarkChange', 'ModuleFit', 'ModuleRemove', 'OverLimit'])
  })

  it('switches cards on and off from the plan without a command', () => {
    const before = game({ screen: 'Flight', flight: flight({ phase: 'Encounter', commands: 1 }), plan: ['Camera#1'] })
    const after = game({ screen: 'Flight', flight: flight({ phase: 'Encounter', commands: 1 }), plan: ['Radar#1'] })
    expect(cues(CueRules.derive(before, after))).toEqual(['CardOn', 'CardOff'])
  })

  it('scores a committed turn: end turn, instruments, shield, damage, data and power', () => {
    const before = game({ screen: 'Flight', flight: flight({ phase: 'Encounter', commands: 1, inEncounter: true, charge: 6 }), plan: ['Camera#1', 'MagneticShield#1'] })
    const after = game({
      screen: 'Flight',
      flight: flight({ phase: 'Encounter', commands: 2, inEncounter: true, charge: 1, lastCommand: { type: 'Commit', keys: ['Camera#1', 'MagneticShield#1'] }, outcome: { gains: 5, incoming: 3, blocked: 2, repaired: 0, lost: false, encounterOver: false } }),
    })
    const events = CueRules.derive(before, after)
    expect(cues(events)).toEqual(['EndTurn', 'Camera', 'ShieldEngage', 'ShieldDeflect', 'RadiationHit', 'DataRecorded', 'PowerLow'])
    expect(events).toContainEqual(expect.objectContaining({ name: 'DataRecorded', params: { amount: 5 } }))
    expect(events).toContainEqual(expect.objectContaining({ name: 'RadiationHit', params: { amount: 3 } }))
    expect(cues(CueRules.derive(before, after)).indexOf('PowerLow')).toBeGreaterThan(0)
  })

  it('loses the spacecraft quietly and completes the flight on the last leg', () => {
    const before = game({ screen: 'Flight', flight: flight({ phase: 'Encounter', commands: 3 }) })
    const lost = game({ screen: 'Flight', flight: flight({ phase: 'Lost', commands: 4, lastCommand: { type: 'Commit', keys: [] }, outcome: { gains: 0, incoming: 9, blocked: 0, repaired: 0, lost: true, encounterOver: true } }) })
    expect(cues(CueRules.derive(before, lost))).toEqual(['EndTurn', 'RadiationHit', 'SpacecraftLost'])
    const done = game({ screen: 'Flight', flight: flight({ phase: 'Completed', commands: 4, leg: 5, lastCommand: { type: 'Continue' } }) })
    expect(cues(CueRules.derive(before, done))).toEqual(['FlightComplete'])
  })

  it('travels between legs and darkens the bed on a storm leg', () => {
    const before = game({ screen: 'Flight', flight: flight({ phase: 'EncounterDone', commands: 3 }) })
    const after = game({ screen: 'Flight', flight: flight({ phase: 'Scanning', commands: 4, leg: 1, storm: true, lastCommand: { type: 'Continue' } }) })
    const events = CueRules.derive(before, after)
    expect(cues(events)).toEqual(['Travel', 'ScannerPing', 'ContactFound'])
    expect(events).toContainEqual({ kind: 'Ambience', place: AmbiencePlace.Storm })
  })

  it('rings for a purchase and celebrates a rank on arrival at the debrief', () => {
    expect(cues(CueRules.derive(game({ screen: 'Lab', points: 300 }), game({ screen: 'Lab', points: 210, owned: '{"Radar":1}' })))).toEqual(['Purchase'])
    expect(cues(CueRules.derive(game({ screen: 'Flight', flight: flight() }), game({ screen: 'Debrief', rank: 2, lifetimePoints: 400 })))).toEqual(['ScreenForward', 'RankUp'])
  })
})

describe('SnapshotReader', () => {
  it('reads a real flight through a choose and a commit', () => {
    GameData.install()
    const profile = Profile.starter()
    const loadout = Loadout.starter()
    const live = Flight.begin(Flight.setup(loadout, WeekCatalog.shared.availableAt(1)[0], SeededRandom.randomSeed()), { owner: profile })
    const read = () => SnapshotReader.read({ screen: 'Flight', loadout, profile, plan: TurnPlan.empty, flight: live })
    const start = read()
    live.apply(Commands.choose(0))
    const chosen = read()
    expect(cues(CueRules.derive(start, chosen))).toEqual(['Approach'])
    live.apply(Commands.commit([]))
    const committed = read()
    expect(cues(CueRules.derive(chosen, committed))[0]).toBe('EndTurn')
    expect(committed.flight?.commands).toBe(2)
  })
})

describe('TurnTimer', () => {
  it('is silent for twenty seconds, ticks ten, hurries five and times out once', () => {
    const timer = new TurnTimer(30)
    expect(timer.cuesAt(19.9)).toEqual([])
    expect(timer.cuesAt(20)).toEqual(['TimerTick'])
    expect(timer.cuesAt(24.5)).toEqual(['TimerTick', 'TimerTick', 'TimerTick', 'TimerTick'])
    expect(timer.cuesAt(25)).toEqual(['TimerUrgent'])
    expect(timer.cuesAt(31)).toEqual(['TimerUrgent', 'TimerUrgent', 'TimerUrgent', 'TimerUrgent', 'TimeOut'])
    expect(timer.cuesAt(40)).toEqual([])
    expect(timer.finished).toBe(true)
  })
})

describe('Variation and library', () => {
  it('repeats for a seed and varies within its spread', () => {
    const a = new Variation(5)
    const b = new Variation(5)
    const values = Array.from({ length: 50 }, () => a.pitch(30))
    expect(values).toEqual(Array.from({ length: 50 }, () => b.pitch(30)))
    expect(Math.max(...values)).toBeLessThanOrEqual(Math.pow(2, 30 / 1200))
    expect(new Set(values).size).toBeGreaterThan(40)
  })

  it('has one cue for every public name', () => {
    const library = new CueLibrary()
    for (const name of CueNames) expect(library.get(name)?.name).toBe(name)
  })
})

describe('SoundMeter', () => {
  it('measures a sine: level, centroid and band', () => {
    const rate = 48000
    const left = new Float32Array(rate)
    for (let index = 0; index < rate; index++) left[index] = 0.5 * Math.sin((2 * Math.PI * 1000 * index) / rate) * Math.max(0, Math.min(1, (rate - 4800 - index) / 4800))
    const measure = SoundMeter.measure(left, left, rate)
    expect(measure.peakDb).toBeCloseTo(-6.02, 1)
    expect(Math.abs(measure.centroid - 1000)).toBeLessThan(60)
    expect(measure.bandShare).toBeGreaterThan(0.95)
    expect(measure.endsSilent).toBe(true)
    expect(measure.clips).toBe(false)
  })
})
