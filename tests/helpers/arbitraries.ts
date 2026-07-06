/**
 * Common arbitraries (generators) for property-based testing.
 * These produce domain-valid random values for GPS, trip, and related types.
 */
import { fc } from './fc-setup'

// --- GPS Position Arbitraries ---

/** Generates a valid latitude in [-90, 90] */
export const arbLatitude = fc.double({
  min: -90,
  max: 90,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid longitude in [-180, 180] */
export const arbLongitude = fc.double({
  min: -180,
  max: 180,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid speed in km/h [0, 400] */
export const arbSpeedKmh = fc.double({
  min: 0,
  max: 400,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid speed in m/s [0, ~111.11] (maps to 0-400 km/h) */
export const arbSpeedMs = fc.double({
  min: 0,
  max: 111.12,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid heading in degrees [0, 360) */
export const arbHeading = fc.double({
  min: 0,
  max: 359.999,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid accuracy radius in meters [0, 100] */
export const arbAccuracy = fc.double({
  min: 0,
  max: 100,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a GPS position with all valid fields */
export const arbGPSPosition = fc.record({
  latitude: arbLatitude,
  longitude: arbLongitude,
  speed: fc.oneof(arbSpeedMs, fc.constant(null)),
  heading: fc.oneof(arbHeading, fc.constant(null)),
  accuracy: arbAccuracy,
  altitude: fc.oneof(
    fc.double({ min: -500, max: 9000, noNaN: true, noDefaultInfinity: true }),
    fc.constant(null)
  ),
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
})

/** Generates a validated position (post-processing) */
export const arbValidatedPosition = fc.record({
  latitude: arbLatitude,
  longitude: arbLongitude,
  speedKmh: arbSpeedKmh,
  heading: fc.oneof(arbHeading, fc.constant(null)),
  accuracy: arbAccuracy,
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
})

// --- Trip Arbitraries ---

/** Generates a valid trip distance in km [0, 2000] */
export const arbDistanceKm = fc.double({
  min: 0,
  max: 2000,
  noNaN: true,
  noDefaultInfinity: true,
})

/** Generates a valid trip duration in milliseconds [0, 24 hours] */
export const arbDurationMs = fc.integer({
  min: 0,
  max: 86_400_000,
})

/** Generates a valid trip ID (UUID-like) */
export const arbTripId = fc.uuid()

/** Generates a coordinate pair */
export const arbCoordinate = fc.record({
  lat: arbLatitude,
  lng: arbLongitude,
})

/** Generates a GPS trace point */
export const arbGPSTracePoint = fc.record({
  lat: arbLatitude,
  lng: arbLongitude,
  speedKmh: arbSpeedKmh,
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
})

/** Generates a stop event */
export const arbStopEvent = fc.record({
  startTimestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  durationMs: fc.integer({ min: 30_000, max: 3_600_000 }),
  coordinates: arbCoordinate,
})

// --- Auth Arbitraries ---

/** Generates a valid email address */
export const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,20}$/),
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,6}$/)
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

/** Generates a valid password (8-128 chars) */
export const arbPassword = fc.string({ minLength: 8, maxLength: 128 })

/** Generates a valid display name (1-100 chars) */
export const arbDisplayName = fc.string({ minLength: 1, maxLength: 100 })

// --- Utility Arbitraries ---

/** Generates a non-negative duration in ms for formatting [0, 359_999_000] */
export const arbFormattableDuration = fc.integer({
  min: 0,
  max: 359_999_000,
})

/** Generates a pair of coordinates that are close together (within ~10km) */
export const arbNearbyCoordinates = arbCoordinate.chain((start) =>
  fc
    .record({
      latOffset: fc.double({ min: -0.09, max: 0.09, noNaN: true, noDefaultInfinity: true }),
      lngOffset: fc.double({ min: -0.09, max: 0.09, noNaN: true, noDefaultInfinity: true }),
    })
    .map(({ latOffset, lngOffset }) => ({
      start,
      end: {
        lat: Math.max(-90, Math.min(90, start.lat + latOffset)),
        lng: Math.max(-180, Math.min(180, start.lng + lngOffset)),
      },
    }))
)

/** Generates a sequence of increasing timestamps */
export function arbTimestampSequence(length: number, startMs = 1_700_000_000_000) {
  return fc.array(fc.integer({ min: 500, max: 5000 }), { minLength: length, maxLength: length }).map(
    (deltas) => {
      const timestamps: number[] = [startMs]
      for (const delta of deltas) {
        timestamps.push(timestamps[timestamps.length - 1] + delta)
      }
      return timestamps
    }
  )
}
