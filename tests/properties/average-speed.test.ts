/**
 * Property 13: Average Speed Calculation
 *
 * Tests that:
 * 1. calculateAverageSpeed(d, t) === d / (t / 3_600_000) when t > 0 and result ≤ 999.9
 * 2. Result is always capped at 999.9 (never exceeds)
 * 3. When drivingTimeMs = 0, result is 0.0
 * 4. When drivingTimeMs < 0, result is 0.0
 * 5. Result is always non-negative
 *
 * **Validates: Requirements 9.1, 9.3, 9.4**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbDistanceKm, arbDurationMs } from '../helpers'
import { calculateAverageSpeed } from '@/features/trip/domain/speed-calculator'

describe('Property 13: Average Speed Calculation', () => {
  describe('formula correctness: distance / (drivingTimeMs / 3_600_000)', () => {
    it('matches distance/time formula when t > 0 and result ≤ 999.9', () => {
      runProperty(
        fc.property(
          arbDistanceKm,
          fc.integer({ min: 1, max: 86_400_000 }),
          (distanceKm, drivingTimeMs) => {
            const result = calculateAverageSpeed(distanceKm, drivingTimeMs)
            const expected = distanceKm / (drivingTimeMs / 3_600_000)

            if (expected <= 999.9) {
              expect(result).toBeCloseTo(expected, 8)
            }
          }
        )
      )
    })
  })

  describe('999.9 cap enforcement', () => {
    it('never returns a value exceeding 999.9', () => {
      runProperty(
        fc.property(
          arbDistanceKm,
          arbDurationMs,
          (distanceKm, drivingTimeMs) => {
            const result = calculateAverageSpeed(distanceKm, drivingTimeMs)
            expect(result).toBeLessThanOrEqual(999.9)
          }
        )
      )
    })

    it('caps at 999.9 when raw formula would exceed it', () => {
      runProperty(
        fc.property(
          fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }),
          fc.integer({ min: 1, max: 100 }),
          (distanceKm, drivingTimeMs) => {
            // With high distance and very small time, formula will exceed 999.9
            const rawSpeed = distanceKm / (drivingTimeMs / 3_600_000)
            const result = calculateAverageSpeed(distanceKm, drivingTimeMs)

            if (rawSpeed > 999.9) {
              expect(result).toBe(999.9)
            }
          }
        )
      )
    })
  })

  describe('zero driving time returns 0.0', () => {
    it('returns 0.0 when drivingTimeMs is exactly 0', () => {
      runProperty(
        fc.property(
          arbDistanceKm,
          (distanceKm) => {
            const result = calculateAverageSpeed(distanceKm, 0)
            expect(result).toBe(0.0)
          }
        )
      )
    })
  })

  describe('negative driving time returns 0.0', () => {
    it('returns 0.0 when drivingTimeMs is negative', () => {
      runProperty(
        fc.property(
          arbDistanceKm,
          fc.integer({ min: -86_400_000, max: -1 }),
          (distanceKm, negativeDrivingTimeMs) => {
            const result = calculateAverageSpeed(distanceKm, negativeDrivingTimeMs)
            expect(result).toBe(0.0)
          }
        )
      )
    })
  })

  describe('result is always non-negative', () => {
    it('never returns a negative value for any inputs', () => {
      runProperty(
        fc.property(
          arbDistanceKm,
          arbDurationMs,
          (distanceKm, drivingTimeMs) => {
            const result = calculateAverageSpeed(distanceKm, drivingTimeMs)
            expect(result).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })
  })
})
