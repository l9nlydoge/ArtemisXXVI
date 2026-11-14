import { describe, expect, test } from 'vitest'
import type { TextRef } from '../Core/TextRef'
import English from '../../I18n/StringsEn.json'
import { Fixtures } from './Fixtures'

const strings: Record<string, string> = English
const placeholders = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1])

function check(ref: TextRef, where: string): void {
  const template = strings[ref.key]
  expect(template, `${ref.key} used by ${where}`).toBeDefined()
  for (const name of placeholders(template)) expect(ref.params[name], `${ref.key} needs {${name}} for ${where}`).toBeDefined()
}

describe('Engine text', () => {
  test('every label and fact the engine produces has an English string with its placeholders filled', () => {
    for (const week of Fixtures.weeks.all) {
      for (const event of week.everything) {
        check(event.label, event.id)
        event.facts.forEach((fact) => check(fact, event.id))
      }
    }
  })

  test('every generic "what was learned" line exists', () => {
    for (const week of Fixtures.weeks.all) {
      for (const event of week.everything) {
        const specific = event.learned.key === `Learned.${event.id}`
        if (!specific) check(event.learned, event.id)
      }
    }
  })
})
