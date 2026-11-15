import { describe, expect, it } from 'vitest'
import { PassEntry, PassExit, PassPath } from './PassPath'
import { TimerTone, TurnTimer } from './TurnTimer'
import { TravelBeat, TravelLongest } from './TravelBeat'

describe('PassPath', () => {
  it('puts the turn with the highest signal closest to the spacecraft', () => {
    const path = new PassPath([0.5, 1, 2, 1, 0.5])
    expect(path.peak).toBe(2)
    expect(path.stop(2)).toBe(0.5)
    expect(path.closeness(path.stop(2))).toBe(1)
  })

  it('enters on one side, moves one way, and leaves on the other side', () => {
    const path = new PassPath([1, 3, 1])
    const stops = [-1, 0, 1, 2, 3].map((turn) => path.stop(turn))
    expect(stops[0]).toBe(PassEntry)
    expect(stops[4]).toBe(PassExit)
    for (let at = 1; at < stops.length; at++) expect(stops[at]).toBeGreaterThan(stops[at - 1])
  })

  it('keeps every turn inside the visible middle', () => {
    for (const signals of [[3, 1, 0.5], [0.5, 1, 1.5, 1], [1, 1, 1, 1, 2]]) {
      const path = new PassPath(signals)
      signals.forEach((_, turn) => {
        expect(path.stop(turn)).toBeGreaterThanOrEqual(0.18)
        expect(path.stop(turn)).toBeLessThanOrEqual(0.82)
      })
    }
  })

  it('drifts a little toward the next stop while the player plans', () => {
    const path = new PassPath([1, 2, 1])
    expect(path.planning(0, 0)).toBe(path.stop(0))
    expect(path.planning(0, 1)).toBeGreaterThan(path.stop(0))
    expect(path.planning(0, 1)).toBeLessThan(path.stop(1))
  })
})

describe('TurnTimer', () => {
  it('runs out after thirty seconds and fires once', () => {
    const timer = new TurnTimer()
    expect(timer.update(0, false)).toBe(false)
    expect(timer.update(29000, false)).toBe(false)
    expect(timer.seconds).toBe(1)
    expect(timer.update(30000, false)).toBe(true)
    expect(timer.update(31000, false)).toBe(false)
    expect(timer.expired).toBe(true)
  })

  it('does not count time while paused', () => {
    const timer = new TurnTimer()
    timer.update(0, false)
    timer.update(10000, false)
    timer.update(50000, true)
    expect(timer.seconds).toBe(20)
    expect(timer.update(69000, false)).toBe(false)
    expect(timer.update(70000, false)).toBe(true)
  })

  it('changes tone at ten and five seconds left', () => {
    const timer = new TurnTimer()
    timer.update(0, false)
    expect(timer.tone).toBe(TimerTone.Calm)
    timer.update(21000, false)
    expect(timer.tone).toBe(TimerTone.Caution)
    timer.update(26000, false)
    expect(timer.tone).toBe(TimerTone.Danger)
  })
})

describe('TravelBeat', () => {
  it('never lasts longer than five seconds', () => {
    expect(new TravelBeat(9000).length).toBe(TravelLongest)
    expect(new TravelBeat(3000).length).toBe(3000)
  })

  it('speeds up, then slows to its resting pace', () => {
    const beat = new TravelBeat(3000, 200, 8)
    expect(beat.pace(0)).toBe(8)
    expect(beat.pace(1500)).toBe(200)
    expect(beat.pace(3000)).toBeCloseTo(8)
    expect(beat.done(3000)).toBe(true)
  })
})
