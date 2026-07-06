/**
 * Property 5: Coordinate Formatting
 *
 * Tests that for any valid lat/lng, formatting produces 6 decimal places
 * and parsed value is within 0.0000005 of original.
 *
 * **Validates: Requirements 3.1**
 */
import { describe, it } from 'vitest'
import { fc, runProperty, arbLatitude, arbLongitude } from '../helpers'
import {
  formatLatitude,
  formatLongitude,
  formatCoordinates,
} from '@/shared/utils/format'

describe('Property 5: Coordinate Formatting', () => {
  const sixDecimalPlacePattern = /^-?\d+\.\d{6}$/

  it('formatLatitude always produces a string with exactly 6 decimal places', () => {
    runProperty(
      fc.property(arbLatitude, (lat) => {
        const result = formatLatitude(lat)
        return sixDecimalPlacePattern.test(result)
      })
    )
  })

  it('formatLongitude always produces a string with exactly 6 decimal places', () => {
    runProperty(
      fc.property(arbLongitude, (lng) => {
        const result = formatLongitude(lng)
        return sixDecimalPlacePattern.test(result)
      })
    )
  })

  it('parseFloat(formatLatitude(lat)) is within 0.0000005 of original lat', () => {
    runProperty(
      fc.property(arbLatitude, (lat) => {
        const formatted = formatLatitude(lat)
        const parsed = parseFloat(formatted)
        return Math.abs(parsed - lat) <= 0.0000005
      })
    )
  })

  it('parseFloat(formatLongitude(lng)) is within 0.0000005 of original lng', () => {
    runProperty(
      fc.property(arbLongitude, (lng) => {
        const formatted = formatLongitude(lng)
        const parsed = parseFloat(formatted)
        return Math.abs(parsed - lng) <= 0.0000005
      })
    )
  })

  it('formatCoordinates produces "lat, lng" format with each part having 6 decimal places', () => {
    runProperty(
      fc.property(arbLatitude, arbLongitude, (lat, lng) => {
        const result = formatCoordinates(lat, lng)
        const parts = result.split(', ')
        if (parts.length !== 2) return false
        return (
          sixDecimalPlacePattern.test(parts[0]) &&
          sixDecimalPlacePattern.test(parts[1])
        )
      })
    )
  })
})
