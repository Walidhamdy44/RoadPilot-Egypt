/**
 * Property 15: ETA Calculation
 *
 * Tests that:
 * 1. calculate(remainingKm, avgSpeedKmh, timestamp) returns timestamp + (remainingKm / avgSpeedKmh) * 3_600_000
 *    when avgSpeed >= 5 and remainingKm > 0
 * 2. Returns null when avgSpeed < 5 km/h
 * 3. Returns null when remainingKm <= 0
 * 4. getFormattedETA returns a string matching /^\d{2}:\d{2}$/ (HH:MM 24-hour) or null
 * 5. Result is always >= currentTimestamp (ETA is in the future)
 *
 * **Validates: Requirements 11.1, 11.2**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbDistanceKm } from '../helpers'
import { createETACalculator } from '@/features/trip/domain/eta-calculator'

/** Generates a valid average speed >= 5 km/h for ETA to be computed */
const arbValidAvgSpeed = fc.double({
  min: 5,
  max: 300,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates an average speed below the 5 km/h threshold */
const arbLowAvgSpeed = fc.double({
  min: 0,
  max: 4.999,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a positive remaining distance > 0 */
const arbPositiveDistanceKm = fc.double({
  min: 0.001,
  max: 2000,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a zero or negative remaining distance */
const arbNonPositiveDistanceKm = fc.double({
  min: -100,
  max: 0,
  noNaN: true,
  noDefaultInfinity: true,
})

/**
 * Generates timestamps spaced > 30s apart so throttle caching does not interfere.
 * Each call returns a unique timestamp sufficiently spaced from previous ones.
 */
const arbTimestamp = fc.integer({
  min: 1_700_000_000_000,
  max: 1_800_000_000_000,
})

describe('Property 15: ETA Calculation', () => {
  describe('formula correctness: timestamp + (remainingKm / avgSpeedKmh) * 3_600_000', () => {
    it('matches the formula when avgSpeed >= 5 and remainingKm > 0', () => {
      runProperty(
        fc.property(
          arbPositiveDistanceKm,
          arbValidAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            // Create a fresh calculator to avoid throttle caching
            const calculator = createETACalculator()

            const result = calculator.calculate(remainingKm, avgSpeedKmh, currentTimestamp)
            const expected = currentTimestamp + (remainingKm / avgSpeedKmh) * 3_600_000

            expect(result).not.toBeNull()
            expect(result).toBeCloseTo(expected, 4)
          }
        )
      )
    })
  })

  describe('returns null when avgSpeed < 5 km/h', () => {
    it('returns null for any remaining distance when speed is below threshold', () => {
      runProperty(
        fc.property(
          arbPositiveDistanceKm,
          arbLowAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            const calculator = createETACalculator()

            const result = calculator.calculate(remainingKm, avgSpeedKmh, currentTimestamp)
            expect(result).toBeNull()
          }
        )
      )
    })
  })

  describe('returns null when remainingKm <= 0', () => {
    it('returns null for zero or negative remaining distance', () => {
      runProperty(
        fc.property(
          arbNonPositiveDistanceKm,
          arbValidAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            const calculator = createETACalculator()

            const result = calculator.calculate(remainingKm, avgSpeedKmh, currentTimestamp)
            expect(result).toBeNull()
          }
        )
      )
    })
  })

  describe('getFormattedETA returns valid HH:MM 24-hour format or null', () => {
    it('returns a string matching /^\\d{2}:\\d{2}$/ when ETA is computable', () => {
      runProperty(
        fc.property(
          arbPositiveDistanceKm,
          arbValidAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            const calculator = createETACalculator()

            const result = calculator.getFormattedETA(remainingKm, avgSpeedKmh, currentTimestamp)
            expect(result).not.toBeNull()
            expect(result).toMatch(/^\d{2}:\d{2}$/)

            // Verify the hours are valid (00-23) and minutes are valid (00-59)
            const [hours, minutes] = result!.split(':').map(Number)
            expect(hours).toBeGreaterThanOrEqual(0)
            expect(hours).toBeLessThanOrEqual(23)
            expect(minutes).toBeGreaterThanOrEqual(0)
            expect(minutes).toBeLessThanOrEqual(59)
          }
        )
      )
    })

    it('returns null when ETA cannot be computed', () => {
      runProperty(
        fc.property(
          arbNonPositiveDistanceKm,
          arbValidAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            const calculator = createETACalculator()

            const result = calculator.getFormattedETA(remainingKm, avgSpeedKmh, currentTimestamp)
            expect(result).toBeNull()
          }
        )
      )
    })
  })

  describe('ETA is always in the future (>= currentTimestamp)', () => {
    it('calculated ETA is always >= the current timestamp', () => {
      runProperty(
        fc.property(
          arbPositiveDistanceKm,
          arbValidAvgSpeed,
          arbTimestamp,
          (remainingKm, avgSpeedKmh, currentTimestamp) => {
            const calculator = createETACalculator()

            const result = calculator.calculate(remainingKm, avgSpeedKmh, currentTimestamp)
            expect(result).not.toBeNull()
            expect(result!).toBeGreaterThanOrEqual(currentTimestamp)
          }
        )
      )
    })
  })
})
