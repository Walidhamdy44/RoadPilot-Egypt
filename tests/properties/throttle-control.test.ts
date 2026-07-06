/**
 * Property 2: Geocoder Throttle Control
 *
 * Tests that for any sequence of GPS updates, outbound geocoding requests
 * are always ≥ 3 seconds (3000ms) apart.
 *
 * Properties tested:
 * 1. For any sequence of increasing timestamps, allowed requests are always ≥ 3000ms apart
 * 2. No two consecutive allowed requests are < 3000ms apart
 * 3. The first request is always allowed
 * 4. Requests within the cooldown period are always denied
 *
 * **Validates: Requirements 2.1, 2.5**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty } from '../helpers'
import {
  createThrottleState,
  shouldRequest,
  THROTTLE_INTERVAL_MS,
} from '@/features/geocoding/domain/throttle-controller'

/**
 * Generator for a sequence of increasing timestamps with variable gaps.
 * Gaps range from 100ms to 10000ms to cover both within-throttle and beyond-throttle scenarios.
 */
const arbTimestampSequence = (minLength = 2, maxLength = 50) =>
  fc
    .array(fc.integer({ min: 100, max: 10_000 }), {
      minLength,
      maxLength,
    })
    .map((deltas) => {
      const start = 1_700_000_000_000
      const timestamps: number[] = [start]
      for (const delta of deltas) {
        timestamps.push(timestamps[timestamps.length - 1] + delta)
      }
      return timestamps
    })

describe('Property 2: Geocoder Throttle Control', () => {
  describe('Allowed requests are ≥ 3000ms apart', () => {
    it('for any sequence of GPS updates, allowed requests are always ≥ THROTTLE_INTERVAL_MS apart', () => {
      runProperty(
        fc.property(arbTimestampSequence(), (timestamps) => {
          let state = createThrottleState()
          const allowedTimestamps: number[] = []

          for (const ts of timestamps) {
            const result = shouldRequest(state, ts)
            if (result.allowed) {
              allowedTimestamps.push(ts)
            }
            state = result.nextState
          }

          // Verify all consecutive allowed timestamps are ≥ 3000ms apart
          for (let i = 1; i < allowedTimestamps.length; i++) {
            const gap = allowedTimestamps[i] - allowedTimestamps[i - 1]
            expect(gap).toBeGreaterThanOrEqual(THROTTLE_INTERVAL_MS)
          }
        })
      )
    })
  })

  describe('No two consecutive allowed requests are < 3000ms apart', () => {
    it('consecutive allowed requests never violate the throttle interval', () => {
      runProperty(
        fc.property(arbTimestampSequence(3, 100), (timestamps) => {
          let state = createThrottleState()
          let lastAllowedTs: number | null = null

          for (const ts of timestamps) {
            const result = shouldRequest(state, ts)
            if (result.allowed) {
              if (lastAllowedTs !== null) {
                expect(ts - lastAllowedTs).toBeGreaterThanOrEqual(THROTTLE_INTERVAL_MS)
              }
              lastAllowedTs = ts
            }
            state = result.nextState
          }
        })
      )
    })
  })

  describe('First request is always allowed', () => {
    it('the first timestamp in any sequence is always allowed', () => {
      runProperty(
        fc.property(
          fc.integer({ min: 0, max: 2_000_000_000_000 }),
          (timestamp) => {
            const state = createThrottleState()
            const result = shouldRequest(state, timestamp)
            expect(result.allowed).toBe(true)
          }
        )
      )
    })
  })

  describe('Requests within cooldown are denied', () => {
    it('any request within THROTTLE_INTERVAL_MS of the last allowed request is denied', () => {
      runProperty(
        fc.property(
          fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
          fc.integer({ min: 1, max: THROTTLE_INTERVAL_MS - 1 }),
          (firstTimestamp, withinCooldown) => {
            // First request is allowed
            const state = createThrottleState()
            const first = shouldRequest(state, firstTimestamp)
            expect(first.allowed).toBe(true)

            // Request within cooldown is denied
            const secondTimestamp = firstTimestamp + withinCooldown
            const second = shouldRequest(first.nextState, secondTimestamp)
            expect(second.allowed).toBe(false)
          }
        )
      )
    })

    it('a request exactly at THROTTLE_INTERVAL_MS boundary is allowed', () => {
      runProperty(
        fc.property(
          fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
          (firstTimestamp) => {
            const state = createThrottleState()
            const first = shouldRequest(state, firstTimestamp)
            expect(first.allowed).toBe(true)

            // Request exactly at boundary is allowed
            const boundaryTimestamp = firstTimestamp + THROTTLE_INTERVAL_MS
            const second = shouldRequest(first.nextState, boundaryTimestamp)
            expect(second.allowed).toBe(true)
          }
        )
      )
    })
  })
})
