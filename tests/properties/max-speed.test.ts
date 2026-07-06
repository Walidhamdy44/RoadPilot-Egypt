/**
 * Property 14: Maximum Speed Tracking
 *
 * Tests that:
 * 1. After feeding a sequence of readings, max speed equals the highest reading
 *    where accuracy ≤ 30 AND speed ≤ 250
 * 2. Readings with accuracy > 30 are always discarded (never become the max)
 * 3. Readings with speed > 250 are always discarded (never become the max)
 * 4. Max speed is monotonically non-decreasing across valid readings
 * 5. If no valid readings exist, max stays at 0.0
 *
 * **Validates: Requirements 10.2, 10.3, 10.4**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbSpeedKmh, arbAccuracy, arbCoordinate } from '../helpers'
import {
  updateMaxSpeed,
  createInitialMaxSpeedRecord,
} from '@/features/trip/domain/speed-calculator'

/** Generates a speed reading with all necessary fields */
const arbSpeedReading = fc.record({
  speedKmh: fc.double({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
  accuracy: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  timestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  coordinates: arbCoordinate,
})

/** Generates a valid speed reading (accuracy ≤ 30 AND speed ≤ 250) */
const arbValidSpeedReading = fc.record({
  speedKmh: fc.double({ min: 0, max: 250, noNaN: true, noDefaultInfinity: true }),
  accuracy: fc.double({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true }),
  timestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  coordinates: arbCoordinate,
})

/** Generates a reading with poor accuracy (accuracy > 30) */
const arbPoorAccuracyReading = fc.record({
  speedKmh: fc.double({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
  accuracy: fc.double({ min: 30.001, max: 100, noNaN: true, noDefaultInfinity: true }),
  timestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  coordinates: arbCoordinate,
})

/** Generates a reading with anomalous speed (speed > 250) */
const arbAnomalousSpeedReading = fc.record({
  speedKmh: fc.double({ min: 250.001, max: 400, noNaN: true, noDefaultInfinity: true }),
  accuracy: fc.double({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true }),
  timestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
  coordinates: arbCoordinate,
})

describe('Property 14: Maximum Speed Tracking', () => {
  describe('max equals highest valid reading', () => {
    it('after processing a sequence of readings, max speed equals the highest valid reading', () => {
      runProperty(
        fc.property(
          fc.array(arbSpeedReading, { minLength: 1, maxLength: 50 }),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            // Determine the expected max from valid readings only
            const validReadings = readings.filter(
              (r) => r.accuracy <= 30 && r.speedKmh <= 250
            )

            if (validReadings.length === 0) {
              expect(maxRecord.speedKmh).toBe(0.0)
            } else {
              const expectedMax = Math.max(...validReadings.map((r) => r.speedKmh))
              expect(maxRecord.speedKmh).toBe(expectedMax)
            }
          }
        )
      )
    })
  })

  describe('readings with accuracy > 30 are discarded', () => {
    it('poor accuracy readings never become the max speed', () => {
      runProperty(
        fc.property(
          fc.array(arbPoorAccuracyReading, { minLength: 1, maxLength: 20 }),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            // All readings have accuracy > 30, so max should remain at 0.0
            expect(maxRecord.speedKmh).toBe(0.0)
            expect(maxRecord.timestamp).toBeNull()
            expect(maxRecord.coordinates).toBeNull()
          }
        )
      )
    })

    it('poor accuracy readings do not override an existing valid max', () => {
      runProperty(
        fc.property(
          arbValidSpeedReading,
          fc.array(arbPoorAccuracyReading, { minLength: 1, maxLength: 20 }),
          (validReading, poorReadings) => {
            // First establish a valid max
            let maxRecord = createInitialMaxSpeedRecord()
            maxRecord = updateMaxSpeed(
              maxRecord,
              validReading.speedKmh,
              validReading.accuracy,
              validReading.timestamp,
              validReading.coordinates
            )
            const establishedMax = maxRecord.speedKmh

            // Feed poor-accuracy readings
            for (const reading of poorReadings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            // Max should not have changed
            expect(maxRecord.speedKmh).toBe(establishedMax)
          }
        )
      )
    })
  })

  describe('readings with speed > 250 are discarded', () => {
    it('anomalous speed readings never become the max speed', () => {
      runProperty(
        fc.property(
          fc.array(arbAnomalousSpeedReading, { minLength: 1, maxLength: 20 }),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            // All readings have speed > 250, so max should remain at 0.0
            expect(maxRecord.speedKmh).toBe(0.0)
            expect(maxRecord.timestamp).toBeNull()
            expect(maxRecord.coordinates).toBeNull()
          }
        )
      )
    })

    it('anomalous speed readings do not override an existing valid max', () => {
      runProperty(
        fc.property(
          arbValidSpeedReading,
          fc.array(arbAnomalousSpeedReading, { minLength: 1, maxLength: 20 }),
          (validReading, anomalousReadings) => {
            // First establish a valid max
            let maxRecord = createInitialMaxSpeedRecord()
            maxRecord = updateMaxSpeed(
              maxRecord,
              validReading.speedKmh,
              validReading.accuracy,
              validReading.timestamp,
              validReading.coordinates
            )
            const establishedMax = maxRecord.speedKmh

            // Feed anomalous speed readings
            for (const reading of anomalousReadings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            // Max should not have changed
            expect(maxRecord.speedKmh).toBe(establishedMax)
          }
        )
      )
    })
  })

  describe('monotonically non-decreasing across valid readings', () => {
    it('max speed never decreases when processing sequential valid readings', () => {
      runProperty(
        fc.property(
          fc.array(arbValidSpeedReading, { minLength: 2, maxLength: 30 }),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()
            let previousMax = 0.0

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
              expect(maxRecord.speedKmh).toBeGreaterThanOrEqual(previousMax)
              previousMax = maxRecord.speedKmh
            }
          }
        )
      )
    })

    it('max speed never decreases even with a mix of valid and invalid readings', () => {
      runProperty(
        fc.property(
          fc.array(arbSpeedReading, { minLength: 2, maxLength: 30 }),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()
            let previousMax = 0.0

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
              expect(maxRecord.speedKmh).toBeGreaterThanOrEqual(previousMax)
              previousMax = maxRecord.speedKmh
            }
          }
        )
      )
    })
  })

  describe('no valid readings leaves max at 0.0', () => {
    it('when all readings are invalid (poor accuracy or anomalous speed), max stays at 0.0', () => {
      runProperty(
        fc.property(
          fc.array(
            fc.oneof(arbPoorAccuracyReading, arbAnomalousSpeedReading),
            { minLength: 1, maxLength: 20 }
          ),
          (readings) => {
            let maxRecord = createInitialMaxSpeedRecord()

            for (const reading of readings) {
              maxRecord = updateMaxSpeed(
                maxRecord,
                reading.speedKmh,
                reading.accuracy,
                reading.timestamp,
                reading.coordinates
              )
            }

            expect(maxRecord.speedKmh).toBe(0.0)
            expect(maxRecord.timestamp).toBeNull()
            expect(maxRecord.coordinates).toBeNull()
          }
        )
      )
    })

    it('initial max speed record starts at 0.0', () => {
      const initial = createInitialMaxSpeedRecord()
      expect(initial.speedKmh).toBe(0.0)
      expect(initial.timestamp).toBeNull()
      expect(initial.coordinates).toBeNull()
    })
  })
})
