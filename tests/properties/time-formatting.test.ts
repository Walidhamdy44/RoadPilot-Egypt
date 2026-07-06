/**
 * Property 11: Time Formatting (HH:MM:SS)
 *
 * Tests that for any non-negative duration 0 to 359,999,000 ms,
 * formatting produces HH:MM:SS and round-trip parsing equals
 * original value rounded to nearest second.
 *
 * **Validates: Requirements 7.2, 8.4**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbFormattableDuration } from '../helpers'
import { formatTime, parseTime } from '@/shared/utils/format'

describe('Property 11: Time Formatting (HH:MM:SS)', () => {
  it('output matches /^\\d{2}:\\d{2}:\\d{2}$/ pattern for any duration in [0, 359_999_000]', () => {
    runProperty(
      fc.property(arbFormattableDuration, (ms) => {
        const result = formatTime(ms)
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      })
    )
  })

  it('hours are 00-99, minutes are 00-59, seconds are 00-59', () => {
    runProperty(
      fc.property(arbFormattableDuration, (ms) => {
        const result = formatTime(ms)
        const [hh, mm, ss] = result.split(':').map(Number)

        expect(hh).toBeGreaterThanOrEqual(0)
        expect(hh).toBeLessThanOrEqual(99)
        expect(mm).toBeGreaterThanOrEqual(0)
        expect(mm).toBeLessThanOrEqual(59)
        expect(ss).toBeGreaterThanOrEqual(0)
        expect(ss).toBeLessThanOrEqual(59)
      })
    )
  })

  it('round-trip: parseTime(formatTime(ms)) equals ms rounded to nearest second', () => {
    runProperty(
      fc.property(arbFormattableDuration, (ms) => {
        const formatted = formatTime(ms)
        const parsed = parseTime(formatted)
        const expectedMs = Math.round(ms / 1000) * 1000

        expect(parsed).not.toBeNull()
        expect(parsed).toBe(expectedMs)
      })
    )
  })

  it('values > 359,999,000 ms are clamped to 99:59:59', () => {
    const arbOverflow = fc.integer({ min: 359_999_001, max: 1_000_000_000 })

    runProperty(
      fc.property(arbOverflow, (ms) => {
        const result = formatTime(ms)
        expect(result).toBe('99:59:59')
      })
    )
  })
})
