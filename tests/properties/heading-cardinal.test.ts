/**
 * Property 6: Heading Calculation and Cardinal Direction
 *
 * Tests that:
 * 1. calculateBearing always returns a value in [0, 360) for any valid coordinate pairs
 * 2. headingToCardinal always returns exactly one of: N, NE, E, SE, S, SW, W, NW
 * 3. headingToCardinal correctly maps each 45-degree segment (test boundary values)
 * 4. headingToCardinal is deterministic (same input → same output)
 *
 * **Validates: Requirements 4.1, 4.3**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbLatitude, arbLongitude, arbHeading } from '../helpers'
import { calculateBearing, headingToCardinal } from '@/features/gps/domain/haversine'

/** The valid set of cardinal/intercardinal directions */
const VALID_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/**
 * Expected segment mapping per the requirements:
 * N:  338–22
 * NE: 23–67
 * E:  68–112
 * SE: 113–157
 * S:  158–202
 * SW: 203–247
 * W:  248–292
 * NW: 293–337
 */
const SEGMENT_RANGES: Array<{ direction: string; min: number; max: number }> = [
  { direction: 'N', min: 338, max: 22 }, // wraps around 0
  { direction: 'NE', min: 23, max: 67 },
  { direction: 'E', min: 68, max: 112 },
  { direction: 'SE', min: 113, max: 157 },
  { direction: 'S', min: 158, max: 202 },
  { direction: 'SW', min: 203, max: 247 },
  { direction: 'W', min: 248, max: 292 },
  { direction: 'NW', min: 293, max: 337 },
]

/** Returns the expected cardinal direction for a given heading based on segment ranges */
function expectedCardinal(heading: number): string {
  const normalized = ((heading % 360) + 360) % 360
  if (normalized >= 338 || normalized <= 22) return 'N'
  if (normalized >= 23 && normalized <= 67) return 'NE'
  if (normalized >= 68 && normalized <= 112) return 'E'
  if (normalized >= 113 && normalized <= 157) return 'SE'
  if (normalized >= 158 && normalized <= 202) return 'S'
  if (normalized >= 203 && normalized <= 247) return 'SW'
  if (normalized >= 248 && normalized <= 292) return 'W'
  return 'NW'
}

describe('Property 6: Heading Calculation and Cardinal Direction', () => {
  describe('calculateBearing returns value in [0, 360)', () => {
    it('bearing is always in [0, 360) for any valid coordinate pairs', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          arbLatitude,
          arbLongitude,
          (lat1, lon1, lat2, lon2) => {
            const bearing = calculateBearing(lat1, lon1, lat2, lon2)
            expect(bearing).toBeGreaterThanOrEqual(0)
            expect(bearing).toBeLessThan(360)
          }
        )
      )
    })

    it('bearing is a finite number for any valid inputs', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          arbLatitude,
          arbLongitude,
          (lat1, lon1, lat2, lon2) => {
            const bearing = calculateBearing(lat1, lon1, lat2, lon2)
            expect(Number.isFinite(bearing)).toBe(true)
            expect(Number.isNaN(bearing)).toBe(false)
          }
        )
      )
    })
  })

  describe('headingToCardinal returns exactly one valid direction', () => {
    it('always returns one of N, NE, E, SE, S, SW, W, NW for any heading in [0, 360)', () => {
      runProperty(
        fc.property(arbHeading, (heading) => {
          const direction = headingToCardinal(heading)
          expect(VALID_DIRECTIONS).toContain(direction)
        })
      )
    })

    it('returns exactly one direction (type is string, not array or undefined)', () => {
      runProperty(
        fc.property(arbHeading, (heading) => {
          const direction = headingToCardinal(heading)
          expect(typeof direction).toBe('string')
          expect(direction.length).toBeGreaterThan(0)
          expect(direction.length).toBeLessThanOrEqual(2)
        })
      )
    })
  })

  describe('headingToCardinal correctly maps each 45-degree segment', () => {
    it('maps heading to the correct segment per requirement specification', () => {
      runProperty(
        fc.property(arbHeading, (heading) => {
          const direction = headingToCardinal(heading)
          const expected = expectedCardinal(heading)
          expect(direction).toBe(expected)
        })
      )
    })

    it('boundary values map correctly', () => {
      // Test exact boundary values from the spec
      const boundaryTests: Array<{ heading: number; expected: string }> = [
        // N segment: 338–22
        { heading: 0, expected: 'N' },
        { heading: 22, expected: 'N' },
        { heading: 338, expected: 'N' },
        { heading: 359, expected: 'N' },
        // NE segment: 23–67
        { heading: 23, expected: 'NE' },
        { heading: 45, expected: 'NE' },
        { heading: 67, expected: 'NE' },
        // E segment: 68–112
        { heading: 68, expected: 'E' },
        { heading: 90, expected: 'E' },
        { heading: 112, expected: 'E' },
        // SE segment: 113–157
        { heading: 113, expected: 'SE' },
        { heading: 135, expected: 'SE' },
        { heading: 157, expected: 'SE' },
        // S segment: 158–202
        { heading: 158, expected: 'S' },
        { heading: 180, expected: 'S' },
        { heading: 202, expected: 'S' },
        // SW segment: 203–247
        { heading: 203, expected: 'SW' },
        { heading: 225, expected: 'SW' },
        { heading: 247, expected: 'SW' },
        // W segment: 248–292
        { heading: 248, expected: 'W' },
        { heading: 270, expected: 'W' },
        { heading: 292, expected: 'W' },
        // NW segment: 293–337
        { heading: 293, expected: 'NW' },
        { heading: 315, expected: 'NW' },
        { heading: 337, expected: 'NW' },
      ]

      for (const { heading, expected } of boundaryTests) {
        expect(headingToCardinal(heading)).toBe(expected)
      }
    })

    it('generates headings within each segment and verifies correct mapping', () => {
      // Test each non-wrapping segment with random values inside it
      const nonWrappingSegments = SEGMENT_RANGES.filter((s) => s.min < s.max)

      for (const segment of nonWrappingSegments) {
        runProperty(
          fc.property(
            fc.double({
              min: segment.min,
              max: segment.max,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            (heading) => {
              expect(headingToCardinal(heading)).toBe(segment.direction)
            }
          )
        )
      }

      // Test wrapping segment (N: 338–22) separately
      runProperty(
        fc.property(
          fc.oneof(
            fc.double({ min: 338, max: 359.999, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: 0, max: 22, noNaN: true, noDefaultInfinity: true })
          ),
          (heading) => {
            expect(headingToCardinal(heading)).toBe('N')
          }
        )
      )
    })
  })

  describe('headingToCardinal is deterministic', () => {
    it('same input always produces the same output', () => {
      runProperty(
        fc.property(arbHeading, (heading) => {
          const result1 = headingToCardinal(heading)
          const result2 = headingToCardinal(heading)
          const result3 = headingToCardinal(heading)
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
        })
      )
    })

    it('calculateBearing is deterministic for same inputs', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          arbLatitude,
          arbLongitude,
          (lat1, lon1, lat2, lon2) => {
            const result1 = calculateBearing(lat1, lon1, lat2, lon2)
            const result2 = calculateBearing(lat1, lon1, lat2, lon2)
            expect(result1).toBe(result2)
          }
        )
      )
    })
  })
})
