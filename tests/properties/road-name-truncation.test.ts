/**
 * Property 3: Road Name Truncation
 *
 * Tests that names > 60 chars are truncated to 60 + ellipsis,
 * and names ≤ 60 chars are returned unchanged.
 *
 * **Validates: Requirements 2.2**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty } from '../helpers'
import { truncateRoadName } from '@/features/geocoding/domain/road-name-utils'
import { MAX_ROAD_NAME_LENGTH } from '@/features/geocoding/domain/geocoder-types'

/** Generates road names that fit within 60 chars */
const arbShortName = fc.string({ minLength: 0, maxLength: MAX_ROAD_NAME_LENGTH })

/** Generates road names that exceed 60 chars */
const arbLongName = fc.string({ minLength: MAX_ROAD_NAME_LENGTH + 1, maxLength: 300 })

describe('Property 3: Road Name Truncation', () => {
  it('output length is always ≤ 60 characters', () => {
    const arbAnyName = fc.string({ minLength: 0, maxLength: 300 })

    runProperty(
      fc.property(arbAnyName, (name) => {
        const result = truncateRoadName(name)
        expect(result.length).toBeLessThanOrEqual(MAX_ROAD_NAME_LENGTH)
      })
    )
  })

  it('names with length ≤ 60 are returned unchanged (identity)', () => {
    runProperty(
      fc.property(arbShortName, (name) => {
        const result = truncateRoadName(name)
        expect(result).toBe(name)
      })
    )
  })

  it('names with length > 60 end with "..." (ellipsis)', () => {
    runProperty(
      fc.property(arbLongName, (name) => {
        const result = truncateRoadName(name)
        expect(result).toMatch(/\.\.\.$/)
      })
    )
  })

  it('names with length > 60 have exactly 60 characters in the result', () => {
    runProperty(
      fc.property(arbLongName, (name) => {
        const result = truncateRoadName(name)
        expect(result.length).toBe(MAX_ROAD_NAME_LENGTH)
      })
    )
  })

  it('the non-ellipsis prefix of a truncated name matches the original name prefix', () => {
    runProperty(
      fc.property(arbLongName, (name) => {
        const result = truncateRoadName(name)
        const prefix = result.slice(0, -3) // Remove the "..."
        expect(name.startsWith(prefix)).toBe(true)
      })
    )
  })
})
