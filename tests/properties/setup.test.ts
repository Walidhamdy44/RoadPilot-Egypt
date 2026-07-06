/**
 * Smoke test to verify Vitest + fast-check integration works correctly.
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbLatitude, arbLongitude, arbSpeedKmh } from '../helpers'

describe('Testing infrastructure', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should run fast-check property tests with configured settings', () => {
    runProperty(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a)
      })
    )
  })

  it('should generate valid GPS latitudes in range [-90, 90]', () => {
    runProperty(
      fc.property(arbLatitude, (lat) => {
        expect(lat).toBeGreaterThanOrEqual(-90)
        expect(lat).toBeLessThanOrEqual(90)
      })
    )
  })

  it('should generate valid GPS longitudes in range [-180, 180]', () => {
    runProperty(
      fc.property(arbLongitude, (lng) => {
        expect(lng).toBeGreaterThanOrEqual(-180)
        expect(lng).toBeLessThanOrEqual(180)
      })
    )
  })

  it('should generate valid speeds in range [0, 400] km/h', () => {
    runProperty(
      fc.property(arbSpeedKmh, (speed) => {
        expect(speed).toBeGreaterThanOrEqual(0)
        expect(speed).toBeLessThanOrEqual(400)
      })
    )
  })

  it('should support seed-based reproducibility', () => {
    const results: number[] = []

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        results.push(n)
        return true
      }),
      { numRuns: 10, seed: 42 }
    )

    const results2: number[] = []
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        results2.push(n)
        return true
      }),
      { numRuns: 10, seed: 42 }
    )

    expect(results).toEqual(results2)
  })
})
