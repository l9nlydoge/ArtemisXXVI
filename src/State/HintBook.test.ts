import { describe, expect, test } from 'vitest'
import { Profile } from '../Engine/Progress/Profile'
import English from '../I18n/StringsEn.json'
import { Hint, HintBook } from './HintBook'

const strings: Record<string, string> = English
const profileWith = (flights: number, hintsSeen: string[]) => Profile.fromJson({ ...Profile.starter().toJson(), flights, hintsSeen })

describe('First-flight hints', () => {
  test('a new player is offered the first-flight hints, each once', () => {
    const fresh = Profile.starter()
    for (const hint of [Hint.Hangar, Hint.Scanner, Hint.Encounter, Hint.Radiation]) {
      expect(HintBook.wants(hint, fresh), hint).toBe(true)
      expect(HintBook.wants(hint, fresh.withHintSeen(hint)), hint).toBe(false)
    }
    expect(HintBook.wants(Hint.Debrief, fresh)).toBe(false)
    expect(HintBook.wants(Hint.Lab, fresh)).toBe(false)
  })

  test('the debrief and lab hints follow a first flight that was flown with hints', () => {
    const afterFirst = profileWith(1, [Hint.Hangar])
    expect(HintBook.wants(Hint.Debrief, afterFirst)).toBe(true)
    expect(HintBook.wants(Hint.Lab, afterFirst)).toBe(true)
    expect(HintBook.wants(Hint.Hangar, afterFirst)).toBe(false)
  })

  test('a player who has flown before sees none', () => {
    for (const profile of [profileWith(1, []), profileWith(3, [Hint.Hangar])]) {
      for (const hint of HintBook.all) expect(HintBook.wants(hint, profile), hint).toBe(false)
    }
  })

  test('seen hints survive saving, and erasing progress brings them back', () => {
    const seen = Profile.fromJson(Profile.starter().withHintSeen(Hint.Hangar).toJson())
    expect(HintBook.wants(Hint.Hangar, seen)).toBe(false)
    expect(HintBook.wants(Hint.Hangar, Profile.starter())).toBe(true)
  })

  test('every hint has its text', () => {
    for (const hint of HintBook.all) expect(strings[HintBook.textKey(hint)], hint).toBeTruthy()
  })
})
