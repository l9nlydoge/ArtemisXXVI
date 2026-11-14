import { describe, expect, test } from 'vitest'
import { Channel } from '../Events/Channel'
import { Rarity } from '../Events/Rarity'
import { CraftState } from '../Flight/CraftState'
import { Encounter } from '../Flight/Encounter'
import { Scoring } from '../Flight/Scoring'
import { TurnPlan } from '../Flight/TurnPlan'
import { PlanProblem, WasteReason } from '../Flight/TurnPreview'
import type { Mark } from '../Modules/MarkSpec'
import { Spacecraft } from '../Spacecraft/Spacecraft'
import { Fixtures } from './Fixtures'

const rock = Fixtures.event('Rock', [[Channel.Visible, 9], [Channel.Radar, 11]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 0 }, { signal: 1, radiation: 0 }], Rarity.Notable)
const plan = (...keys: string[]) => new TurnPlan(keys)

function start(modules: [string, Mark][], rows: [number, number, boolean?][], options: { event?: typeof rock; charge?: number; hull?: number; cooldowns?: boolean; bus?: string } = {}) {
  const craft = new Spacecraft(Fixtures.loadout(options.bus ?? 'SmallSat', modules))
  const state = new CraftState(craft)
  if (options.charge !== undefined) state.charge = options.charge
  if (options.hull !== undefined) state.hull = options.hull
  const encounter = new Encounter(Fixtures.contact(options.event ?? rock, rows), 0, craft, state, options.cooldowns ?? false)
  return { craft, state, encounter }
}

const starter: [string, Mark][] = [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['ParticleDetector', 1], ['RadiationShielding', 1]]

describe('Charging', () => {
  test('the battery charges at the start of a sunlit turn, up to capacity', () => {
    expect(start(starter, [[1, 0]], { charge: 5 }).state.charge).toBe(9)
    expect(start(starter, [[1, 0]], { charge: 10 }).state.charge).toBe(12)
  })

  test('a turn in shadow does not charge', () => {
    const { state, encounter } = start(starter, [[1, 0], [1, 0, true], [1, 0]], { charge: 2 })
    expect(state.charge).toBe(6)
    encounter.commit(plan('Camera#1'))
    expect(state.charge).toBe(4)
    encounter.commit(plan())
    expect(state.charge).toBe(8)
  })
})

describe('Planning a turn', () => {
  test('a plan that costs more than the charge is refused', () => {
    const { encounter, state } = start([['Camera', 1], ['Radar', 1]], [[1, 0]], { charge: 0 })
    expect(state.charge).toBe(2)
    const preview = encounter.preview(plan('Radar#1'))
    expect(preview.valid).toBe(false)
    expect(preview.problem).toBe(PlanProblem.NotEnoughCharge)
    expect(() => encounter.commit(plan('Radar#1'))).toThrow()
    expect(state.charge).toBe(2)
    expect(encounter.turnIndex).toBe(0)
  })

  test('an empty plan is valid and a key that is not an active module is not', () => {
    const { encounter } = start(starter, [[1, 0]])
    expect(encounter.preview(plan()).valid).toBe(true)
    expect(encounter.preview(plan('SolarArray#1')).problem).toBe(PlanProblem.UnknownModule)
    expect(encounter.preview(plan('Radar#1')).problem).toBe(PlanProblem.UnknownModule)
  })

  test('previewing changes nothing', () => {
    const { encounter, state } = start(starter, [[1, 4]])
    const before = { ...state }
    encounter.preview(plan('Camera#1'))
    expect({ ...state }).toEqual(before)
    expect(encounter.recorded.get(Channel.Visible)).toBe(0)
  })
})

describe('Recording', () => {
  test('gain is data per use times signal, rounded half up', () => {
    const { encounter } = start(starter, [[1, 0], [2, 0], [0.5, 0]], { event: Fixtures.event('Wide', [[Channel.Visible, 99]], [{ signal: 1, radiation: 0 }, { signal: 2, radiation: 0 }, { signal: 0.5, radiation: 0 }]) })
    expect(encounter.commit(plan('Camera#1')).gains.get(Channel.Visible)).toBe(3)
    expect(encounter.commit(plan('Camera#1')).gains.get(Channel.Visible)).toBe(6)
    expect(encounter.commit(plan('Camera#1')).gains.get(Channel.Visible)).toBe(2)
    expect(encounter.recorded.get(Channel.Visible)).toBe(11)
  })

  test('a weak signal still records at least one', () => {
    const faint = Fixtures.event('Faint', [[Channel.Particles, 9]], [{ signal: 0.2, radiation: 0 }])
    const { encounter } = start(starter, [[0.2, 0]], { event: faint })
    expect(encounter.commit(plan('ParticleDetector#1')).gains.get(Channel.Particles)).toBe(1)
  })

  test('a channel never goes over its capacity, and a full one wastes the power', () => {
    const { encounter, state } = start([['Camera', 3], ['SolarArray', 3]], [[2, 0], [2, 0], [2, 0]])
    expect(encounter.commit(plan('Camera#1')).gains.get(Channel.Visible)).toBe(9)
    expect(encounter.yieldOf('Camera#1')).toEqual({ channel: Channel.Visible, gain: 0, waste: WasteReason.ChannelFull })
    const charge = state.charge
    const outcome = encounter.commit(plan('Camera#1'))
    expect(outcome.wasted).toEqual(['Camera#1'])
    expect(outcome.gains.size).toBe(0)
    expect(outcome.powerCost).toBe(2)
    expect(outcome.chargeAfter).toBe(charge - 2)
    expect(encounter.recorded.get(Channel.Visible)).toBe(9)
  })

  test('an instrument with no matching channel records nothing and still costs power', () => {
    const { encounter, state } = start(starter, [[1, 0]])
    expect(encounter.yieldOf('ParticleDetector#1')?.waste).toBe(WasteReason.NoChannel)
    const outcome = encounter.commit(plan('ParticleDetector#1'))
    expect(outcome.wasted).toEqual(['ParticleDetector#1'])
    expect(state.charge).toBe(11)
  })

  test('a channel that needs Mk II is closed to a Mk I instrument', () => {
    const imaged = Fixtures.event('Imaged', [[Channel.Visible, 20, 2]], [{ signal: 1, radiation: 0 }])
    expect(start(starter, [[1, 0]], { event: imaged }).encounter.yieldOf('Camera#1')).toEqual({ channel: Channel.Visible, gain: 0, waste: WasteReason.NeedsMark, neededMark: 2 })
    expect(start([['Camera', 2]], [[1, 0]], { event: imaged }).encounter.yieldOf('Camera#1')).toEqual({ channel: Channel.Visible, gain: 4 })
  })

  test('yieldOf is undefined for anything that is not an installed instrument', () => {
    const { encounter } = start([['Camera', 1], ['MagneticShield', 1]], [[1, 0]])
    expect(encounter.yieldOf('MagneticShield#1')).toBeUndefined()
    expect(encounter.yieldOf('Radar#1')).toBeUndefined()
  })
})

describe('Radiation', () => {
  const shielded: [string, Mark][] = [['Camera', 1], ['Battery', 3], ['RadiationShielding', 3], ['MagneticShield', 1]]

  test('passive shielding comes off first, then the magnetic shield', () => {
    const { encounter } = start(shielded, [[1, 12]], { bus: 'Flagship' })
    const bare = encounter.preview(plan())
    expect(bare.incoming).toBe(9)
    expect(bare.blocked).toBe(0)
    const raised = encounter.preview(plan('MagneticShield#1'))
    expect(raised.incoming).toBe(3)
    expect(raised.blocked).toBe(6)
    expect(raised.hullAfter).toBe(27)
  })

  test('shields never turn radiation into healing', () => {
    const { encounter } = start(shielded, [[1, 2]], { bus: 'Flagship' })
    expect(encounter.preview(plan('MagneticShield#1'))).toMatchObject({ incoming: 0, blocked: 0, hullAfter: 30 })
  })

  test('what gets through damages the hull', () => {
    const { encounter, state } = start(starter, [[1, 5], [1, 0]])
    encounter.commit(plan())
    expect(state.hull).toBe(12)
    expect(encounter.result().damageTaken).toBe(4)
  })

  test('the spacecraft is lost when the hull reaches zero, and that turn still records', () => {
    const { encounter, state } = start(starter, [[1, 5], [1, 0], [1, 0]], { hull: 4 })
    const preview = encounter.preview(plan('Camera#1'))
    expect(preview.lost).toBe(true)
    const outcome = encounter.commit(plan('Camera#1'))
    expect(outcome.lost).toBe(true)
    expect(outcome.encounterOver).toBe(true)
    expect(state.hull).toBe(0)
    expect(encounter.isOver).toBe(true)
    expect(encounter.result().recorded.get(Channel.Visible)).toBe(3)
    expect(encounter.preview(plan()).problem).toBe(PlanProblem.EncounterOver)
  })
})

describe('Thrusters, repair and cooldowns', () => {
  test('a burn lifts the signal to the event peak and uses one burn', () => {
    const { encounter, state } = start([['Camera', 1], ['Thrusters', 1]], [[1, 0], [2, 0], [1, 0]])
    expect(encounter.yieldOf('Camera#1')?.gain).toBe(3)
    expect(encounter.yieldOf('Camera#1', true)?.gain).toBe(6)
    const outcome = encounter.commit(plan('Camera#1', 'Thrusters#1'))
    expect(outcome.signal).toBe(2)
    expect(outcome.gains.get(Channel.Visible)).toBe(6)
    expect(state.burnsLeft).toBe(1)
  })

  test('thrusters cannot fire with no burns left', () => {
    const { encounter, state } = start([['Camera', 1], ['Thrusters', 1]], [[1, 0]])
    state.burnsLeft = 0
    expect(encounter.preview(plan('Thrusters#1')).problem).toBe(PlanProblem.NoBurnsLeft)
  })

  test('the repair drone heals before the hit, never above full, and only once', () => {
    const { encounter, state } = start([['Camera', 1], ['RepairDrone', 1]], [[1, 3], [1, 0], [1, 0]], { hull: 2 })
    const preview = encounter.preview(plan('RepairDrone#1'))
    expect(preview).toMatchObject({ repaired: 6, incoming: 3, hullAfter: 5, lost: false })
    encounter.commit(plan('RepairDrone#1'))
    expect(state.hull).toBe(5)
    expect(state.repairUsed).toBe(true)
    expect(encounter.preview(plan('RepairDrone#1')).problem).toBe(PlanProblem.RepairUsed)
    const nearlyFull = start([['Camera', 1], ['RepairDrone', 3]], [[1, 0]], { hull: 14 })
    expect(nearlyFull.encounter.preview(plan('RepairDrone#1')).repaired).toBe(2)
  })

  test('cooldowns are off by default', () => {
    const { encounter } = start(starter, [[1, 0], [1, 0]])
    encounter.commit(plan('Camera#1'))
    expect(encounter.isCooling('Camera#1')).toBe(false)
    expect(encounter.preview(plan('Camera#1')).valid).toBe(true)
  })

  test('with cooldowns on, a module rests for one turn after use', () => {
    const { encounter } = start(starter, [[1, 0], [1, 0], [1, 0]], { cooldowns: true })
    encounter.commit(plan('Camera#1'))
    expect(encounter.isCooling('Camera#1')).toBe(true)
    expect(encounter.preview(plan('Camera#1')).problem).toBe(PlanProblem.CoolingDown)
    encounter.commit(plan())
    expect(encounter.preview(plan('Camera#1')).valid).toBe(true)
  })
})

describe('What the player can see', () => {
  const rows: [number, number][] = [[1, 0], [2, 3], [1, 5], [1, 0], [0.5, 0]]
  const long = Fixtures.event('Long', [[Channel.Visible, 30]], rows.map(([signal, radiation]) => ({ signal, radiation })))
  const seen = (modules: [string, Mark][], turnsPlayed = 0) => {
    const { encounter } = start(modules, rows, { event: long })
    for (let turn = 0; turn < turnsPlayed; turn++) encounter.commit(plan())
    return encounter.visible.map((condition) => condition !== undefined)
  }

  test('without a flight computer only the current turn shows', () => {
    expect(seen([['Camera', 1]])).toEqual([true, false, false, false, false])
    expect(seen([['Camera', 1]], 2)).toEqual([true, true, true, false, false])
  })

  test('each mark of flight computer shows further ahead', () => {
    expect(seen([['Camera', 1], ['FlightComputer', 1]])).toEqual([true, true, false, false, false])
    expect(seen([['Camera', 1], ['FlightComputer', 2]])).toEqual([true, true, true, false, false])
    expect(seen([['Camera', 1], ['FlightComputer', 3]])).toEqual([true, true, true, true, true])
  })
})

describe('Ending and scoring an encounter', () => {
  test('the encounter ends after its last turn', () => {
    const { encounter } = start(starter, [[1, 0], [2, 0], [1, 0]])
    expect(encounter.commit(plan('Camera#1')).encounterOver).toBe(false)
    expect(encounter.commit(plan('Camera#1')).encounterOver).toBe(false)
    expect(encounter.commit(plan()).encounterOver).toBe(true)
    expect(encounter.turnIndex).toBe(3)
    const result = encounter.result()
    expect(result.recorded.get(Channel.Visible)).toBe(9)
    expect(result.complete).toBe(false)
    expect(result.anyRecorded).toBe(true)
    expect(result.turnsPlayed).toBe(3)
  })

  test('points follow the formula: data, a bonus per full channel, a bonus for all', () => {
    const recorded = new Map([[Channel.Visible, 9], [Channel.Radar, 5]])
    expect(Scoring.points(rock, recorded)).toBe((9 + 5) * 2 + 3 * 2)
    expect(Scoring.points(rock, recorded, 1.2)).toBe(41)
    const full = new Map([[Channel.Visible, 9], [Channel.Radar, 11]])
    expect(Scoring.points(rock, full)).toBe(20 * 2 + 2 * 3 * 2 + 5 * 2)
    expect(Scoring.isComplete(rock, full)).toBe(true)
    expect(Scoring.isComplete(rock, recorded)).toBe(false)
    expect(Scoring.points(rock, new Map())).toBe(0)
  })

  test('a result carries the points and what the loadout could not record', () => {
    const { encounter } = start(starter, [[1, 0], [2, 0], [1, 0]])
    encounter.commit(plan('Camera#1'))
    encounter.commit(plan('Camera#1'))
    encounter.commit(plan())
    const result = encounter.result()
    expect(result.points).toBe(9 * 2 + 3 * 2)
    expect(result.missed).toEqual([{ channel: Channel.Radar, moduleId: 'Radar', neededMark: 1, points: (11 + 3) * 2 }])
  })

  test('potential separates what this loadout can reach from everything on offer', () => {
    const withCamera = new Spacecraft(Fixtures.loadout('SmallSat', starter))
    expect(Scoring.potential(rock, withCamera)).toEqual({ reachable: 24, total: 62 })
    const withBoth = new Spacecraft(Fixtures.loadout('Flagship', [['Camera', 1], ['Radar', 1], ['Antenna', 1]]))
    expect(Scoring.potential(rock, withBoth)).toEqual({ reachable: 68, total: 68 })
    expect(Scoring.missed(rock, withBoth)).toEqual([])
  })
})
