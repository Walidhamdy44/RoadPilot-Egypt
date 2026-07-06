/**
 * Property 7: Shortest Rotational Path
 *
 * Tests that for any pair of headings, the chosen rotation direction
 * has absolute angular difference ≤ 180 degrees. This ensures compass
 * animation always takes the shortest path.
 *
 * Properties tested:
 * 1. |shortestRotation(from, to)| ≤ 180 for any pair of headings in [0, 360)
 * 2. from + shortestRotation(from, to) ≡ to (mod 360)
 * 3. shortestRotation is the opposite sign of going the other way around
 *
 * **Validates: Requirements 4.2**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbHeading } from '../helpers'
import { shortestRotation } from '@/features/gps/domain/haversine'

/**
 * Normalizes an angle to [0, 360).
 */
function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360
}

describe('Property 7: Shortest Rotational Path', () => {
  describe('Absolute angular difference ≤ 180', () => {
    it('|shortestRotation(from, to)| ≤ 180 for any pair of headings in [0, 360)', () => {
      runProperty(
        fc.property(arbHeading, arbHeading, (from, to) => {
          const rotation = shortestRotation(from, to)
          expect(Math.abs(rotation)).toBeLessThanOrEqual(180)
        })
      )
    })
  })

  describe('Rotation correctness: from + shortestRotation(from, to) ≡ to (mod 360)', () => {
    it('applying the rotation to the start heading arrives at the target heading', () => {
      runProperty(
        fc.property(arbHeading, arbHeading, (from, to) => {
          const rotation = shortestRotation(from, to)
          const arrived = normalizeDegrees(from + rotation)
          const normalizedTo = normalizeDegrees(to)

          // Allow small floating-point tolerance
          const diff = Math.abs(arrived - normalizedTo)
          const wrappedDiff = Math.min(diff, 360 - diff)
          expect(wrappedDiff).toBeLessThan(1e-9)
        })
      )
    })
  })

  describe('Opposite direction has opposite sign', () => {
    it('shortestRotation(from, to) = -shortestRotation(to, from) unless |rotation| = 180', () => {
      runProperty(
        fc.property(arbHeading, arbHeading, (from, to) => {
          const forward = shortestRotation(from, to)
          const backward = shortestRotation(to, from)

          if (Math.abs(forward) === 180) {
            // At exactly 180°, both directions are equally short
            // so |backward| should also be 180
            expect(Math.abs(backward)).toBe(180)
          } else {
            // Otherwise they should be negatives of each other
            expect(forward + backward).toBeCloseTo(0, 10)
          }
        })
      )
    })
  })
})
