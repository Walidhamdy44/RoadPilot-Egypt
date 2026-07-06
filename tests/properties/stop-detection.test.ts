/**
 * Property 12: Stop Detection State Machine Invariant
 *
 * Tests that:
 * 1. DrivingTime + StopTime = total elapsed time (last timestamp - first timestamp)
 * 2. Continuous periods ≥ 30s below threshold are classified as StopTime
 * 3. Continuous periods < 30s below threshold are classified as DrivingTime
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty } from '../helpers'
import {
  createStopDetectorState,
  processSpeedReading,
} from '@/features/trip/domain/stop-detector'

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Speed that is clearly above the threshold (>= 2 km/h) */
const arbDrivingSpeed = fc.double({
  min: 2,
  max: 150,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Speed that is clearly below the threshold (< 2 km/h) */
const arbStoppedSpeed = fc.double({
  min: 0,
  max: 1.999,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Speed that can be either above or below threshold */
const arbAnySpeed = fc.oneof(arbDrivingSpeed, arbStoppedSpeed)

/** Time interval between readings: 1-5 seconds in ms */
const arbInterval = fc.integer({ min: 1000, max: 5000 })

/**
 * Generates a sequence of speed readings with increasing timestamps.
 * Each reading has a speed (some above, some below threshold) and a time delta.
 */
function arbSpeedReadingSequence(minLength: number, maxLength: number) {
  return fc
    .array(
      fc.record({
        speed: arbAnySpeed,
        intervalMs: arbInterval,
      }),
      { minLength, maxLength }
    )
    .map((readings) => {
      const startTimestamp = 1_700_000_000_000
      let currentTs = startTimestamp
      const result: Array<{ speed: number; timestamp: number }> = []

      for (const { speed, intervalMs } of readings) {
        currentTs += intervalMs
        result.push({ speed, timestamp: currentTs })
      }

      return { startTimestamp, readings: result }
    })
}

/**
 * Generates a sequence guaranteed to have a sustained period below threshold
 * for >= 30 seconds (confirming a stop).
 *
 * The key insight: the grace period is measured from the timestamp of the first
 * below-threshold reading to the current reading timestamp. So we need the span
 * of below-threshold readings to be >= 30s. With intervals of 4-5s, we need at
 * least 7 intervals (8 readings below threshold) to guarantee > 30s span.
 * Using 9+ readings to be safe.
 */
function arbSequenceWithConfirmedStop() {
  return fc
    .record({
      preStopCount: fc.integer({ min: 1, max: 5 }),
      stopReadingCount: fc.integer({ min: 9, max: 15 }), // 9+ readings with 4-5s intervals => span >= 32s
      postStopCount: fc.integer({ min: 1, max: 5 }),
    })
    .chain(({ preStopCount, stopReadingCount, postStopCount }) =>
      fc.record({
        preSpeeds: fc.array(arbDrivingSpeed, { minLength: preStopCount, maxLength: preStopCount }),
        stopSpeeds: fc.array(arbStoppedSpeed, { minLength: stopReadingCount, maxLength: stopReadingCount }),
        postSpeeds: fc.array(arbDrivingSpeed, { minLength: postStopCount, maxLength: postStopCount }),
        preIntervals: fc.array(
          fc.integer({ min: 1000, max: 5000 }),
          { minLength: preStopCount, maxLength: preStopCount }
        ),
        stopIntervals: fc.array(
          fc.integer({ min: 4000, max: 5000 }), // 4-5s ensures span >= 32s for 9 readings
          { minLength: stopReadingCount, maxLength: stopReadingCount }
        ),
        postIntervals: fc.array(
          fc.integer({ min: 1000, max: 5000 }),
          { minLength: postStopCount, maxLength: postStopCount }
        ),
      })
    )
    .map(({ preSpeeds, stopSpeeds, postSpeeds, preIntervals, stopIntervals, postIntervals }) => {
      const allSpeeds = [...preSpeeds, ...stopSpeeds, ...postSpeeds]
      const allIntervals = [...preIntervals, ...stopIntervals, ...postIntervals]
      const startTimestamp = 1_700_000_000_000
      let currentTs = startTimestamp
      const readings: Array<{ speed: number; timestamp: number }> = []

      for (let i = 0; i < allSpeeds.length; i++) {
        currentTs += allIntervals[i]
        readings.push({ speed: allSpeeds[i], timestamp: currentTs })
      }

      return {
        startTimestamp,
        readings,
        stopStartIndex: preSpeeds.length,
        stopEndIndex: preSpeeds.length + stopSpeeds.length,
      }
    })
}

/**
 * Generates a sequence with a brief slowdown below threshold lasting < 30s
 * (should remain classified as DrivingTime).
 */
function arbSequenceWithBriefSlowdown() {
  return fc
    .record({
      preCount: fc.integer({ min: 1, max: 5 }),
      briefStopCount: fc.integer({ min: 1, max: 5 }), // 1-5 readings * ~3s = 3-15s < 30s
      postCount: fc.integer({ min: 1, max: 5 }),
    })
    .chain(({ preCount, briefStopCount, postCount }) =>
      fc.record({
        preSpeeds: fc.array(arbDrivingSpeed, { minLength: preCount, maxLength: preCount }),
        briefSpeeds: fc.array(arbStoppedSpeed, { minLength: briefStopCount, maxLength: briefStopCount }),
        postSpeeds: fc.array(arbDrivingSpeed, { minLength: postCount, maxLength: postCount }),
        intervals: fc.array(
          fc.integer({ min: 1000, max: 3000 }), // 1-3s ensures brief stop < 30s total
          {
            minLength: preCount + briefStopCount + postCount,
            maxLength: preCount + briefStopCount + postCount,
          }
        ),
      })
    )
    .map(({ preSpeeds, briefSpeeds, postSpeeds, intervals }) => {
      const allSpeeds = [...preSpeeds, ...briefSpeeds, ...postSpeeds]
      const startTimestamp = 1_700_000_000_000
      let currentTs = startTimestamp
      const readings: Array<{ speed: number; timestamp: number }> = []

      for (let i = 0; i < allSpeeds.length; i++) {
        currentTs += intervals[i]
        readings.push({ speed: allSpeeds[i], timestamp: currentTs })
      }

      return { startTimestamp, readings }
    })
}

// ---------------------------------------------------------------------------
// Helper: run sequence through stop detector
// ---------------------------------------------------------------------------

function processSequence(startTimestamp: number, readings: Array<{ speed: number; timestamp: number }>) {
  let state = createStopDetectorState(startTimestamp)

  for (const { speed, timestamp } of readings) {
    const result = processSpeedReading(state, speed, timestamp)
    state = result.newState
  }

  return state
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 12: Stop Detection State Machine Invariant', () => {
  describe('Time invariant: DrivingTime + StopTime = elapsed time', () => {
    it('for any sequence of speed readings, drivingTimeMs + stopTimeMs = total elapsed time', () => {
      runProperty(
        fc.property(arbSpeedReadingSequence(10, 50), ({ startTimestamp, readings }) => {
          const state = processSequence(startTimestamp, readings)

          const totalElapsed = readings[readings.length - 1].timestamp - startTimestamp
          const accountedTime = state.drivingTimeMs + state.stopTimeMs

          expect(accountedTime).toBe(totalElapsed)
        })
      )
    })

    it('time invariant holds for short sequences (minimum 2 readings)', () => {
      runProperty(
        fc.property(arbSpeedReadingSequence(2, 5), ({ startTimestamp, readings }) => {
          const state = processSequence(startTimestamp, readings)

          const totalElapsed = readings[readings.length - 1].timestamp - startTimestamp
          const accountedTime = state.drivingTimeMs + state.stopTimeMs

          expect(accountedTime).toBe(totalElapsed)
        })
      )
    })

    it('both drivingTimeMs and stopTimeMs are non-negative', () => {
      runProperty(
        fc.property(arbSpeedReadingSequence(10, 50), ({ startTimestamp, readings }) => {
          const state = processSequence(startTimestamp, readings)

          expect(state.drivingTimeMs).toBeGreaterThanOrEqual(0)
          expect(state.stopTimeMs).toBeGreaterThanOrEqual(0)
        })
      )
    })
  })

  describe('Confirmed stop classification: periods >= 30s below threshold are StopTime', () => {
    it('a sustained period >= 30s below threshold contributes to stopTimeMs', () => {
      runProperty(
        fc.property(arbSequenceWithConfirmedStop(), ({ startTimestamp, readings }) => {
          const state = processSequence(startTimestamp, readings)

          // If we had a confirmed stop (>= 30s below threshold), stopTimeMs must be > 0
          expect(state.stopTimeMs).toBeGreaterThan(0)
        })
      )
    })

    it('stop time includes the retroactive grace period', () => {
      runProperty(
        fc.property(
          arbSequenceWithConfirmedStop(),
          ({ startTimestamp, readings, stopStartIndex }) => {
            // Track events to verify retroactive reclassification
            let state = createStopDetectorState(startTimestamp)
            let stopConfirmed = false

            for (const { speed, timestamp } of readings) {
              const result = processSpeedReading(state, speed, timestamp)
              state = result.newState

              for (const event of result.events) {
                if (event.type === 'stop_confirmed') {
                  stopConfirmed = true
                  // The retroactive amount should be > 0 (grace period was reclassified)
                  expect(event.retroactiveMs).toBeGreaterThan(0)
                }
              }
            }

            expect(stopConfirmed).toBe(true)
          }
        )
      )
    })
  })

  describe('Grace period classification: periods < 30s below threshold are DrivingTime', () => {
    it('brief slowdowns < 30s contribute only to drivingTimeMs, not stopTimeMs', () => {
      runProperty(
        fc.property(arbSequenceWithBriefSlowdown(), ({ startTimestamp, readings }) => {
          const state = processSequence(startTimestamp, readings)

          // Brief slowdowns remain classified as driving — no stop time
          expect(state.stopTimeMs).toBe(0)

          // All time should be classified as driving
          const totalElapsed = readings[readings.length - 1].timestamp - startTimestamp
          expect(state.drivingTimeMs).toBe(totalElapsed)
        })
      )
    })

    it('state remains in driving or maybe_stopped (never stopped) for brief slowdowns', () => {
      runProperty(
        fc.property(arbSequenceWithBriefSlowdown(), ({ startTimestamp, readings }) => {
          let state = createStopDetectorState(startTimestamp)
          let everStopped = false

          for (const { speed, timestamp } of readings) {
            const result = processSpeedReading(state, speed, timestamp)
            state = result.newState

            if (state.movementState === 'stopped') {
              everStopped = true
            }
          }

          expect(everStopped).toBe(false)
        })
      )
    })
  })
})
