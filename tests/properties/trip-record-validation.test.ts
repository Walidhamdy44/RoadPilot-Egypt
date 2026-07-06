/**
 * Property 24: Trip Record Validation
 *
 * Tests that Zod schema accepts non-empty trip ID, valid start timestamp,
 * distance ≥ 0, driving time ≥ 0 and rejects all others.
 *
 * **Validates: Requirements 20.3, 20.4**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbTripId, arbDistanceKm, arbDurationMs, arbCoordinate, arbGPSTracePoint, arbStopEvent } from '../helpers'
import { tripRecordSchema, tripStateSchema } from '@/features/trip/domain/trip-validator'

/**
 * Generates a valid trip record that should pass schema validation.
 */
const arbValidTripRecord = fc.record({
  id: arbTripId,
  startTimestamp: fc.integer({ min: 1_000_000_000_000, max: Date.now() }),
  endTimestamp: fc.integer({ min: 1_000_000_000_000, max: Date.now() + 86_400_000 }),
  totalDistanceKm: arbDistanceKm,
  drivingTimeMs: arbDurationMs,
  stopTimeMs: arbDurationMs,
  averageSpeedKmh: fc.double({ min: 0, max: 999.9, noNaN: true, noDefaultInfinity: true }),
  maxSpeedKmh: fc.double({ min: 0, max: 250, noNaN: true, noDefaultInfinity: true }),
  maxSpeedTimestamp: fc.oneof(fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }), fc.constant(null)),
  maxSpeedCoordinates: fc.oneof(arbCoordinate, fc.constant(null)),
  numberOfStops: fc.integer({ min: 0, max: 100 }),
  startLocationName: fc.oneof(fc.string({ minLength: 1, maxLength: 60 }), fc.constant(null)),
  endLocationName: fc.oneof(fc.string({ minLength: 1, maxLength: 60 }), fc.constant(null)),
  startCoordinates: arbCoordinate,
  endCoordinates: arbCoordinate,
  gpsTrace: fc.array(arbGPSTracePoint, { minLength: 0, maxLength: 5 }),
  stopEvents: fc.array(arbStopEvent, { minLength: 0, maxLength: 3 }),
})

describe('Property 24: Trip Record Validation', () => {
  describe('tripRecordSchema acceptance', () => {
    it('accepts valid trip records with non-empty ID, valid timestamp, distance ≥ 0, drivingTime ≥ 0', () => {
      runProperty(
        fc.property(arbValidTripRecord, (record) => {
          const result = tripRecordSchema.safeParse(record)
          expect(result.success).toBe(true)
        })
      )
    })
  })

  describe('tripRecordSchema rejection — empty ID', () => {
    it('rejects trip records with empty string ID', () => {
      runProperty(
        fc.property(arbValidTripRecord, (record) => {
          const invalid = { ...record, id: '' }
          const result = tripRecordSchema.safeParse(invalid)
          expect(result.success).toBe(false)
        })
      )
    })
  })

  describe('tripRecordSchema rejection — negative distance', () => {
    it('rejects trip records with totalDistanceKm < 0', () => {
      runProperty(
        fc.property(
          arbValidTripRecord,
          fc.double({ min: -10000, max: -0.001, noNaN: true, noDefaultInfinity: true }),
          (record, negDistance) => {
            const invalid = { ...record, totalDistanceKm: negDistance }
            const result = tripRecordSchema.safeParse(invalid)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('tripRecordSchema rejection — negative driving time', () => {
    it('rejects trip records with drivingTimeMs < 0', () => {
      runProperty(
        fc.property(
          arbValidTripRecord,
          fc.integer({ min: -86_400_000, max: -1 }),
          (record, negTime) => {
            const invalid = { ...record, drivingTimeMs: negTime }
            const result = tripRecordSchema.safeParse(invalid)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('tripRecordSchema rejection — future start timestamp', () => {
    it('rejects trip records with start timestamp far in the future (beyond 1-min drift)', () => {
      runProperty(
        fc.property(
          arbValidTripRecord,
          fc.integer({ min: 120_000, max: 86_400_000 }), // 2 minutes to 24 hours in the future
          (record, futureOffset) => {
            const invalid = { ...record, startTimestamp: Date.now() + futureOffset }
            const result = tripRecordSchema.safeParse(invalid)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('tripRecordSchema rejection — negative stop time', () => {
    it('rejects trip records with stopTimeMs < 0', () => {
      runProperty(
        fc.property(
          arbValidTripRecord,
          fc.integer({ min: -86_400_000, max: -1 }),
          (record, negStopTime) => {
            const invalid = { ...record, stopTimeMs: negStopTime }
            const result = tripRecordSchema.safeParse(invalid)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('tripRecordSchema acceptance — timestamp within 1-min drift allowance', () => {
    it('accepts trip records with start timestamp up to 1 minute in the future (clock drift)', () => {
      runProperty(
        fc.property(
          arbValidTripRecord,
          fc.integer({ min: 0, max: 59_000 }), // 0 to 59 seconds in the future
          (record, futureOffset) => {
            const valid = { ...record, startTimestamp: Date.now() + futureOffset }
            const result = tripRecordSchema.safeParse(valid)
            expect(result.success).toBe(true)
          }
        )
      )
    })
  })

  describe('tripStateSchema acceptance', () => {
    it('accepts valid trip state records', () => {
      const arbValidTripState = fc.record({
        id: arbTripId,
        status: fc.constantFrom('idle' as const, 'active' as const, 'paused' as const, 'completed' as const),
        startTimestamp: fc.integer({ min: 1_000_000_000_000, max: Date.now() }),
        endTimestamp: fc.oneof(fc.integer({ min: 1_000_000_000_000, max: Date.now() + 86_400_000 }), fc.constant(null)),
        totalDistanceKm: arbDistanceKm,
        drivingTimeMs: arbDurationMs,
        stopTimeMs: arbDurationMs,
        averageSpeedKmh: fc.double({ min: 0, max: 999.9, noNaN: true, noDefaultInfinity: true }),
        maxSpeedKmh: fc.double({ min: 0, max: 250, noNaN: true, noDefaultInfinity: true }),
        maxSpeedTimestamp: fc.oneof(fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }), fc.constant(null)),
        maxSpeedCoordinates: fc.oneof(arbCoordinate, fc.constant(null)),
        currentSpeedKmh: fc.double({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
        gpsTrace: fc.array(arbGPSTracePoint, { minLength: 0, maxLength: 5 }),
        stopEvents: fc.array(arbStopEvent, { minLength: 0, maxLength: 3 }),
        destination: fc.oneof(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          fc.constant(null)
        ),
        remainingDistanceKm: fc.oneof(arbDistanceKm, fc.constant(null)),
        etaTimestamp: fc.oneof(fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }), fc.constant(null)),
      })

      runProperty(
        fc.property(arbValidTripState, (state) => {
          const result = tripStateSchema.safeParse(state)
          expect(result.success).toBe(true)
        })
      )
    })
  })

  describe('tripStateSchema rejection — invalid status', () => {
    it('rejects trip state with invalid status value', () => {
      runProperty(
        fc.property(
          fc.constantFrom('running', 'stopped', 'cancelled', 'pending', ''),
          (invalidStatus) => {
            const invalid = {
              id: 'test-trip-123',
              status: invalidStatus,
              startTimestamp: Date.now() - 60_000,
              endTimestamp: null,
              totalDistanceKm: 10,
              drivingTimeMs: 3600_000,
              stopTimeMs: 0,
              averageSpeedKmh: 60,
              maxSpeedKmh: 120,
              maxSpeedTimestamp: null,
              maxSpeedCoordinates: null,
              currentSpeedKmh: 80,
              gpsTrace: [],
              stopEvents: [],
              destination: null,
              remainingDistanceKm: null,
              etaTimestamp: null,
            }
            const result = tripStateSchema.safeParse(invalid)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })
})
