/**
 * Property 23: GPS Position Validation
 *
 * Tests that the Zod gpsPositionSchema accepts latitude in [-90,90],
 * longitude in [-180,180], speed in [0, ~111.11 m/s] (400 km/h equivalent),
 * heading in [0,360], accuracy ≥ 0 and rejects all others.
 *
 * **Validates: Requirements 20.1**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbLatitude, arbLongitude, arbHeading, arbAccuracy } from '../helpers'
import { gpsPositionSchema } from '@/features/gps/domain/gps-validator'

const MAX_SPEED_MS = 400 / 3.6 // ~111.11 m/s

/** Speed arbitrary that stays strictly within the schema's valid range [0, MAX_SPEED_MS] */
const arbValidSpeedMs = fc.double({
  min: 0,
  max: MAX_SPEED_MS,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a GPS position with all valid fields aligned with schema bounds */
const arbValidGPSPosition = fc.record({
  latitude: arbLatitude,
  longitude: arbLongitude,
  speed: fc.oneof(arbValidSpeedMs, fc.constant(null)),
  heading: fc.oneof(
    fc.double({ min: 0, max: 360, noNaN: true, noDefaultInfinity: true }),
    fc.constant(null)
  ),
  accuracy: arbAccuracy,
  altitude: fc.oneof(
    fc.double({ min: -500, max: 9000, noNaN: true, noDefaultInfinity: true }),
    fc.constant(null)
  ),
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
})

describe('Property 23: GPS Position Validation', () => {
  describe('Acceptance of valid data', () => {
    it('should accept any GPS position with all fields in valid ranges', () => {
      runProperty(
        fc.property(arbValidGPSPosition, (position) => {
          const result = gpsPositionSchema.safeParse(position)
          expect(result.success).toBe(true)
        })
      )
    })

    it('should accept speed as null', () => {
      runProperty(
        fc.property(arbLatitude, arbLongitude, arbAccuracy, (lat, lng, acc) => {
          const position = {
            latitude: lat,
            longitude: lng,
            speed: null,
            heading: null,
            accuracy: acc,
            altitude: null,
            timestamp: Date.now(),
          }
          const result = gpsPositionSchema.safeParse(position)
          expect(result.success).toBe(true)
        })
      )
    })

    it('should accept heading as null', () => {
      runProperty(
        fc.property(arbLatitude, arbLongitude, arbValidSpeedMs, arbAccuracy, (lat, lng, speed, acc) => {
          const position = {
            latitude: lat,
            longitude: lng,
            speed,
            heading: null,
            accuracy: acc,
            altitude: null,
            timestamp: Date.now(),
          }
          const result = gpsPositionSchema.safeParse(position)
          expect(result.success).toBe(true)
        })
      )
    })
  })

  describe('Rejection of invalid latitude', () => {
    it('should reject latitude > 90', () => {
      runProperty(
        fc.property(
          fc.double({ min: 90.001, max: 1000, noNaN: true, noDefaultInfinity: true }),
          arbLongitude,
          arbAccuracy,
          (lat, lng, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })

    it('should reject latitude < -90', () => {
      runProperty(
        fc.property(
          fc.double({ min: -1000, max: -90.001, noNaN: true, noDefaultInfinity: true }),
          arbLongitude,
          arbAccuracy,
          (lat, lng, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('Rejection of invalid longitude', () => {
    it('should reject longitude > 180', () => {
      runProperty(
        fc.property(
          arbLatitude,
          fc.double({ min: 180.001, max: 1000, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })

    it('should reject longitude < -180', () => {
      runProperty(
        fc.property(
          arbLatitude,
          fc.double({ min: -1000, max: -180.001, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('Rejection of invalid speed', () => {
    it('should reject negative speed', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          fc.double({ min: -1000, max: -0.001, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, speed, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })

    it('should reject speed exceeding 400 km/h equivalent in m/s', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          fc.double({ min: MAX_SPEED_MS + 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, speed, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('Rejection of invalid heading', () => {
    it('should reject negative heading', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          fc.double({ min: -360, max: -0.001, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, heading, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })

    it('should reject heading > 360', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          fc.double({ min: 360.001, max: 720, noNaN: true, noDefaultInfinity: true }),
          arbAccuracy,
          (lat, lng, heading, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('Rejection of invalid accuracy', () => {
    it('should reject negative accuracy', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          fc.double({ min: -1000, max: -0.001, noNaN: true, noDefaultInfinity: true }),
          (lat, lng, acc) => {
            const position = {
              latitude: lat,
              longitude: lng,
              speed: null,
              heading: null,
              accuracy: acc,
              altitude: null,
              timestamp: Date.now(),
            }
            const result = gpsPositionSchema.safeParse(position)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })
})
