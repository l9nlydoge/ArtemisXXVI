import { describe, expect, test } from 'vitest'
import { CautiousBot } from '../Bots/CautiousBot'
import type { FlightBot } from '../Bots/FlightBot'
import { GreedyBot } from '../Bots/GreedyBot'
import type { FlightReport } from '../Flight/FlightReport'
import type { Mark } from '../Modules/MarkSpec'
import { Loadout } from '../Spacecraft/Loadout'
import { Fixtures } from './Fixtures'

const options = { weeks: Fixtures.weeks }
const seeds = Array.from({ length: 300 }, (_, index) => index + 1)
const greedy = new GreedyBot()
const cautious = new CautiousBot()

function fly(bot: FlightBot, loadout: Loadout, weekId: string): FlightReport[] {
  return seeds.map((seed) => bot.fly(Fixtures.setup(loadout, weekId, seed), options).report)
}

const survival = (reports: FlightReport[]) => reports.filter((report) => report.survived).length / reports.length
const mean = (reports: FlightReport[]) => reports.reduce((sum, report) => sum + report.pointsBanked, 0) / reports.length

const starter = Loadout.starter()
const stormReady = Fixtures.loadout('Explorer', [['SolarArray', 2], ['Battery', 2], ['ParticleDetector', 2], ['Camera', 1], ['RadiationShielding', 2], ['MagneticShield', 2]])
const noActiveShield = Fixtures.loadout('Explorer', [['SolarArray', 2], ['Battery', 2], ['ParticleDetector', 2], ['Camera', 2], ['Spectrometer', 1], ['RadiationShielding', 2]])

describe('Bots', () => {
  test('both bots finish every flight without an illegal command', () => {
    const loadouts: [string, [string, Mark][]][] = [
      ['SmallSat', [['Camera', 1]]],
      ['SmallSat', [['SolarArray', 1], ['Battery', 1], ['Camera', 1], ['Radar', 1]]],
      ['Explorer', [['SolarArray', 2], ['Battery', 2], ['Spectrometer', 2], ['HighEnergyDetector', 1], ['MagneticShield', 1], ['FlightComputer', 1]]],
      ['Flagship', [['SolarArray', 3], ['Battery', 2], ['Camera', 2], ['Spectrometer', 1], ['ParticleDetector', 1], ['RadiationShielding', 1], ['MagneticShield', 1], ['FlightComputer', 1], ['Thrusters', 1], ['Antenna', 1], ['RepairDrone', 1]]],
    ]
    for (const [bus, modules] of loadouts) {
      for (const weekId of ['Calm', 'Storm']) {
        for (const bot of [greedy, cautious]) {
          for (const seed of seeds.slice(0, 40)) {
            const { flight, report } = bot.fly(Fixtures.setup(Fixtures.loadout(bus, modules), weekId, seed), options)
            expect(flight.isOver).toBe(true)
            expect(report.pointsBanked).toBeGreaterThanOrEqual(0)
            expect(flight.state.charge).toBeGreaterThanOrEqual(0)
            expect(flight.state.charge).toBeLessThanOrEqual(flight.craft.capacity)
            expect(flight.state.burnsLeft).toBeGreaterThanOrEqual(0)
          }
        }
      }
    }
  })

  test('a bot never records more than an event holds', () => {
    for (const seed of seeds.slice(0, 60)) {
      const { flight } = greedy.fly(Fixtures.setup(Fixtures.loadout('Flagship', [['SolarArray', 3], ['Battery', 3], ['Camera', 3], ['Spectrometer', 3], ['Radar', 3]]), 'Calm', seed), options)
      for (const result of flight.results) {
        const event = Fixtures.calmWeek.event(result.eventId)!
        for (const [channel, amount] of result.recorded) expect(amount).toBeLessThanOrEqual(event.capacity(channel))
      }
    }
  })
})

describe('Balance on the sample weeks', () => {
  test('the starter spacecraft completes the quiet week and earns enough for an unlock or two', () => {
    const reports = fly(greedy, starter, 'Calm')
    expect(survival(reports)).toBeGreaterThanOrEqual(0.95)
    expect(mean(reports)).toBeGreaterThan(90)
    expect(mean(reports)).toBeLessThan(230)
  })

  test('the starter spacecraft does not survive the storm week', () => {
    expect(survival(fly(greedy, starter, 'Storm'))).toBeLessThanOrEqual(0.1)
  })

  test('passive shielding alone does not carry a medium spacecraft through the storm week', () => {
    expect(survival(fly(greedy, noActiveShield, 'Storm'))).toBeLessThanOrEqual(0.4)
  })

  test('a magnetic shield flown carefully does', () => {
    expect(survival(fly(cautious, stormReady, 'Storm'))).toBeGreaterThanOrEqual(0.85)
  })

  test('trading the battery, shielding and particle detector for a radar pays on the quiet week', () => {
    const withRadar = Fixtures.loadout('SmallSat', [['SolarArray', 1], ['Camera', 1], ['Spectrometer', 1], ['Radar', 1]])
    expect(withRadar.isValid(Fixtures.everything)).toBe(true)
    expect(mean(fly(greedy, withRadar, 'Calm'))).toBeGreaterThan(mean(fly(greedy, starter, 'Calm')) * 1.05)
  })

  test('the particle detector earns nothing on the quiet week and plenty in the storm', () => {
    const points = (reports: FlightReport[], channel: string) =>
      reports.reduce((sum, report) => sum + report.encounters.reduce((inner, encounter) => inner + (encounter.recorded.get(channel as never) ?? 0), 0), 0)
    expect(points(fly(greedy, starter, 'Calm'), 'Particles')).toBe(0)
    expect(points(fly(cautious, stormReady, 'Storm'), 'Particles')).toBeGreaterThan(3000)
  })
})
