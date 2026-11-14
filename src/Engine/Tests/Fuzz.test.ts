import { describe, expect, test } from 'vitest'
import { SeededRandom } from '../Core/SeededRandom'
import { Flight, FlightPhase } from '../Flight/Flight'
import { Commands, type FlightCommand } from '../Flight/FlightCommand'
import type { Mark } from '../Modules/MarkSpec'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const loadouts: [string, [string, Mark][]][] = [
  ['SmallSat', [['Camera', 1]]],
  ['SmallSat', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['Radar', 1]]],
  ['Explorer', [['SolarArray', 2], ['Battery', 2], ['ParticleDetector', 2], ['Camera', 1], ['RadiationShielding', 2], ['MagneticShield', 2], ['FlightComputer', 1]]],
  ['Flagship', [['SolarArray', 3], ['Battery', 2], ['Camera', 2], ['Radar', 1], ['ParticleDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1], ['Thrusters', 1], ['Antenna', 1], ['RepairDrone', 1]]],
]

function legalCommands(flight: Flight, random: SeededRandom): FlightCommand[] {
  const indexes = flight.contacts.map((_, index) => index)
  const keys = flight.craft.actives.map((module) => module.key).filter(() => random.chance(0.5))
  const candidates = [Commands.survey, Commands.hold, Commands.proceed, Commands.commit(keys), Commands.commit([]), ...indexes.map(Commands.choose), ...indexes.map(Commands.chase)]
  return candidates.filter((command) => flight.can(command))
}

describe('Random play', () => {
  test('any sequence of legal commands ends the flight within its six legs and keeps every number in range', () => {
    let flights = 0
    let commands = 0
    for (const [bus, modules] of loadouts) {
      for (const weekId of ['Calm', 'Storm']) {
        for (const cooldowns of [false, true]) {
          for (let seed = 1; seed <= 60; seed++) {
            const random = new SeededRandom(seed * 7919)
            const setup = { ...Fixtures.setup(Fixtures.loadout(bus, modules), weekId, seed), cooldowns }
            const flight = Flight.begin(setup, options)
            while (!flight.isOver) {
              const legal = legalCommands(flight, random)
              expect(legal.length, `stuck in ${flight.phase} on leg ${flight.legIndex}`).toBeGreaterThan(0)
              flight.apply(random.pick(legal))
              commands += 1
              expect(commands).toBeLessThan(400000)
              const { charge, hull, burnsLeft } = flight.state
              expect(charge).toBeGreaterThanOrEqual(0)
              expect(charge).toBeLessThanOrEqual(flight.craft.capacity)
              expect(hull).toBeGreaterThanOrEqual(0)
              expect(hull).toBeLessThanOrEqual(flight.craft.maxHull)
              expect(burnsLeft).toBeGreaterThanOrEqual(0)
              expect(flight.legIndex).toBeLessThan(6)
              if (flight.phase === FlightPhase.Encounter) expect(flight.encounter!.turnIndex).toBeLessThan(flight.encounter!.turnCount)
            }
            const report = flight.report()
            expect(report.pointsBanked).toBeLessThanOrEqual(report.pointsEarned)
            expect(flight.phase === FlightPhase.Lost).toBe(flight.state.hull === 0)
            const replayed = Flight.replay(JSON.parse(JSON.stringify(setup)), JSON.parse(JSON.stringify(flight.log)), options)
            expect(replayed.phase).toBe(flight.phase)
            expect({ ...replayed.state }).toEqual({ ...flight.state })
            expect(replayed.report().pointsBanked).toBe(report.pointsBanked)
            flights += 1
          }
        }
      }
    }
    expect(flights).toBe(960)
  })
})
