import { describe, expect, test } from 'vitest'
import { Catalog } from '../Catalog/Catalog'

describe('Landmarks', () => {
  const landmarks = Catalog.shared.landmarks.items

  test('every real spacecraft cites a source and a plausible orbit', () => {
    expect(landmarks.length).toBeGreaterThanOrEqual(5)
    for (const landmark of landmarks) {
      expect(landmark.source).toMatch(/^https:\/\//)
      expect(landmark.spec.altitudeKm).toBeGreaterThan(300)
      expect(landmark.spec.periodMin).toBeGreaterThan(85)
      expect(landmark.spec.launchedYear).toBeGreaterThan(1985)
    }
  })

  test('each orbit the player can choose has a real neighbour', () => {
    for (const orbit of Catalog.shared.orbits.items) {
      expect(landmarks.some((landmark) => landmark.spec.orbitClass === orbit.orbitClass)).toBe(true)
    }
  })
})
