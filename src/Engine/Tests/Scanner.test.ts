import { describe, expect, test } from 'vitest'
import { SeededRandom } from '../Core/SeededRandom'
import { AsteroidFlyby } from '../Events/AsteroidFlyby'
import { Rarity } from '../Events/Rarity'
import { EventKind } from '../Events/SpaceEvent'
import { Scanner } from '../Flight/Scanner'
import { ConditionRoller } from '../Flight/TurnCondition'
import { Fixtures } from './Fixtures'

const calm = Fixtures.calmWeek
const storm = Fixtures.stormWeek
const seeds = Array.from({ length: 200 }, (_, index) => index + 1)
const ids = (contacts: readonly { event: { id: string } }[]) => contacts.map((contact) => contact.event.id)

describe('Scanner', () => {
  test('deals two contacts on a quiet leg', () => {
    for (const seed of seeds) expect(new Scanner(calm, seed).deal(0)).toHaveLength(2)
  })

  test('the same seed deals the same contacts with the same conditions', () => {
    const first = new Scanner(calm, 77).deal(0)
    const second = new Scanner(calm, 77).deal(0)
    expect(ids(second)).toEqual(ids(first))
    expect(second.map((contact) => contact.conditions)).toEqual(first.map((contact) => contact.conditions))
  })

  test('different seeds deal different contacts', () => {
    const deals = new Set(seeds.map((seed) => ids(new Scanner(calm, seed).deal(0)).join('|')))
    expect(deals.size).toBeGreaterThan(5)
  })

  test('the first contact is a dated event when the leg has one', () => {
    for (const seed of seeds) expect(new Scanner(calm, seed).deal(0)[0].event.isDated).toBe(true)
  })

  test('a pinned event always appears on its leg, and a headline arrives unidentified', () => {
    const okId = AsteroidFlyby.idFor(Fixtures.okId)
    for (const seed of seeds) {
      const scanner = new Scanner(calm, seed)
      for (let leg = 0; leg < 5; leg++) {
        const dealt = scanner.deal(leg)
        expect(ids(dealt).includes('Rare.Sample')).toBe(leg === 2)
        expect(ids(dealt)).not.toContain(okId)
      }
      const last = scanner.deal(5)
      expect(last[0].event.id).toBe(okId)
      expect(last[0].identified).toBe(false)
    }
  })

  test('a rare event arrives unidentified', () => {
    const rare = new Scanner(calm, 5).deal(2).find((contact) => contact.event.kind === EventKind.Rare)!
    expect(rare.identified).toBe(false)
  })

  test('common events are always identified and about three in ten notable ones are not', () => {
    let notable = 0
    let hidden = 0
    for (const seed of seeds) {
      const scanner = new Scanner(calm, seed)
      for (let leg = 0; leg < 6; leg++) {
        for (const contact of scanner.deal(leg)) {
          if (contact.event.rarity === Rarity.Common) expect(contact.identified).toBe(true)
          if (contact.event.rarity === Rarity.Notable) {
            notable += 1
            if (!contact.identified) hidden += 1
          }
        }
      }
    }
    expect(notable).toBeGreaterThan(100)
    expect(hidden / notable).toBeGreaterThan(0.2)
    expect(hidden / notable).toBeLessThan(0.4)
  })

  test('each notable contact gets its own roll for arriving unidentified', () => {
    let pairs = 0
    let differ = 0
    for (const seed of seeds) {
      const scanner = new Scanner(calm, seed)
      for (let leg = 0; leg < 6; leg++) {
        const notable = scanner.deal(leg).filter((contact) => contact.event.rarity === Rarity.Notable)
        if (notable.length < 2) continue
        pairs += 1
        if (notable[0].identified !== notable[1].identified) differ += 1
      }
    }
    expect(pairs).toBeGreaterThan(50)
    expect(differ / pairs).toBeGreaterThan(0.25)
    expect(differ / pairs).toBeLessThan(0.6)
  })

  test('no event is dealt twice in a flight, extras included', () => {
    for (const seed of seeds) {
      const scanner = new Scanner(calm, seed)
      const seen: string[] = []
      for (let leg = 0; leg < 6; leg++) {
        const dealt = scanner.deal(leg)
        seen.push(...ids(dealt))
        const extra = scanner.dealExtra(leg)
        if (extra) seen.push(extra.event.id)
      }
      expect(new Set(seen).size).toBe(seen.length)
    }
  })

  test('an extra contact is new and identified', () => {
    const scanner = new Scanner(calm, 9)
    const dealt = scanner.deal(0)
    const extra = scanner.dealExtra(0)!
    expect(ids(dealt)).not.toContain(extra.event.id)
    expect(extra.identified).toBe(true)
  })

  test('a survey changes later legs only by taking away the one event it revealed', () => {
    let untouched = 0
    let replaced = 0
    for (const seed of seeds) {
      const plain = new Scanner(calm, seed)
      const surveyed = new Scanner(calm, seed)
      plain.deal(0)
      surveyed.deal(0)
      const extra = surveyed.dealExtra(0)!
      for (let leg = 1; leg < 6; leg++) {
        const without = plain.deal(leg)
        const withSurvey = surveyed.deal(leg)
        if (!ids(without).includes(extra.event.id)) {
          expect(ids(withSurvey)).toEqual(ids(without))
          expect(withSurvey.map((contact) => contact.conditions)).toEqual(without.map((contact) => contact.conditions))
          expect(withSurvey.map((contact) => contact.identified)).toEqual(without.map((contact) => contact.identified))
          untouched += 1
        } else {
          expect(ids(withSurvey)).not.toContain(extra.event.id)
          expect(ids(withSurvey).filter((id) => ids(without).includes(id))).toHaveLength(without.length - 1)
          replaced += 1
          break
        }
      }
    }
    expect(untouched).toBeGreaterThan(500)
    expect(replaced).toBeGreaterThan(5)
  })

  test('a contact keeps the same conditions whichever position it is dealt in', () => {
    for (const seed of seeds.slice(0, 60)) {
      const scanner = new Scanner(calm, seed)
      const dealt = scanner.deal(0)
      const extra = scanner.dealExtra(0)!
      const again = new Scanner(calm, seed)
      again.deal(0)
      expect(again.dealExtra(0)!.conditions).toEqual(extra.conditions)
      expect(new Scanner(calm, seed).deal(0).map((contact) => contact.conditions)).toEqual(dealt.map((contact) => contact.conditions))
    }
  })

  test('two contacts on the same leg roll their shadow and anomaly separately', () => {
    let same = 0
    let compared = 0
    for (const seed of seeds) {
      const [first, second] = new Scanner(calm, seed).deal(0)
      if (first.turnCount !== second.turnCount) continue
      compared += 1
      const pattern = (contact: typeof first) => contact.conditions.map((condition) => `${condition.inShadow}${condition.anomaly}`).join()
      if (pattern(first) === pattern(second)) same += 1
    }
    expect(compared).toBeGreaterThan(30)
    expect(same / compared).toBeLessThan(0.5)
  })

  test('the same event rolls differently on different legs', () => {
    const planet = Fixtures.planets[1]
    const patterns = new Set<string>()
    for (const seed of seeds) {
      const scanner = new Scanner(calm, seed)
      for (let leg = 0; leg < 6; leg++) {
        const found = scanner.deal(leg).find((contact) => contact.event === planet)
        if (found) patterns.add(`${leg}:${found.conditions.map((condition) => `${condition.inShadow}${condition.anomaly}`).join()}`)
      }
    }
    const legs = new Set([...patterns].map((entry) => entry.split(':')[0]))
    expect(legs.size).toBeGreaterThan(2)
    expect(patterns.size).toBeGreaterThan(legs.size)
  })

  test('a storm leg leads with the storm and lays its radiation over the other contacts', () => {
    for (const seed of seeds) {
      const scanner = new Scanner(storm, seed)
      scanner.deal(0)
      scanner.deal(1)
      scanner.deal(2)
      const dealt = scanner.deal(3)
      const weather = storm.stormOn(3)!
      expect(dealt).toHaveLength(3)
      expect(dealt[0].event).toBe(weather)
      expect(dealt[0].identified).toBe(true)
      expect(dealt[0].overlay).toBeUndefined()
      expect(dealt[0].conditions.map((condition) => condition.radiation)).toEqual([4, 8, 12, 8, 4])
      for (const contact of dealt.slice(1)) {
        expect(contact.overlay).toBe(weather)
        expect(contact.conditions.every((condition) => !condition.anomaly)).toBe(true)
        const expected = contact.event.turns.map((_, index) => ConditionRoller.weather(weather, index, contact.turnCount))
        expect(contact.conditions.map((condition) => condition.radiation)).toEqual(expected)
        expect(contact.band).toBe('Severe')
      }
    }
  })

  test('a shorter event under a storm always meets the storm peak', () => {
    const big = storm.stormOn(3)!
    const along = (turnCount: number) => Array.from({ length: turnCount }, (_, index) => ConditionRoller.weather(big, index, turnCount))
    expect(along(3)).toEqual([8, 12, 8])
    expect(along(4)).toEqual([4, 8, 12, 8])
    expect(along(5)).toEqual([4, 8, 12, 8, 4])
    const rolled = new ConditionRoller(new SeededRandom(1)).roll(Fixtures.rareSample, big, true)
    expect(rolled.map((condition) => condition.radiation)).toEqual([8, 12, 8])
    expect(rolled.map((condition) => condition.signal)).toEqual([1, 3, 1])
  })

  test('a longer event under a short storm stretches it and still meets the peak', () => {
    const short = storm.stormOn(5)!
    expect(short.turns.map((turn) => turn.radiation)).toEqual([2, 4, 3, 2])
    expect(Array.from({ length: 5 }, (_, index) => ConditionRoller.weather(short, index, 5))).toEqual([2, 2, 4, 3, 2])
  })
})

describe('Turn conditions', () => {
  test('the first turn is sunlit and shadow never lasts two turns', () => {
    let shadows = 0
    let turns = 0
    for (const seed of seeds) {
      const rolled = new ConditionRoller(new SeededRandom(seed)).roll(Fixtures.planets[0], undefined, false)
      expect(rolled[0].inShadow).toBe(false)
      rolled.forEach((condition, index) => {
        if (index > 0 && condition.inShadow) expect(rolled[index - 1].inShadow).toBe(false)
        if (index > 0) turns += 1
        if (condition.inShadow) shadows += 1
      })
    }
    expect(shadows / turns).toBeGreaterThan(0.15)
    expect(shadows / turns).toBeLessThan(0.3)
  })

  test('the anomaly adds 2 radiation on about 15% of quiet turns and never during a storm', () => {
    let hits = 0
    let turns = 0
    for (const seed of seeds) {
      const quiet = new ConditionRoller(new SeededRandom(seed)).roll(Fixtures.planets[0], undefined, false)
      for (const condition of quiet) {
        turns += 1
        if (condition.anomaly) hits += 1
        expect(condition.radiation).toBe(condition.anomaly ? 2 : 0)
      }
      const stormy = new ConditionRoller(new SeededRandom(seed)).roll(Fixtures.planets[0], storm.stormOn(5), true)
      expect(stormy.some((condition) => condition.anomaly)).toBe(false)
    }
    expect(hits / turns).toBeGreaterThan(0.1)
    expect(hits / turns).toBeLessThan(0.2)
  })
})
