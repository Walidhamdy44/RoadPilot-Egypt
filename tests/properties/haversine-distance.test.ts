/**
 * Property 8: Haversine Distance Accumulation
 *
 * Tests that:
 * 1. Cumulative distance equals sum of segments (accumulated point by point)
 * 2. Points with accuracy > 50m contribute zero distance (filtering logic)
 * 3. Distance accumulation is always non-negative
 * 4. Adding intermediate points never decreases total distance (triangle inequality)
 *
 * **Validates: Requirements 5.1, 5.2**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbLatitude, arbLongitude, arbNearbyCoordinates } from '../helpers'
import { haversineDistanceKm } from '@/features/gps/domain/haversine'

/** Accuracy threshold: positions with accuracy > 50m are discarded */
const ACCURACY_THRESHOLD_M = 50

/** Generates a sequence of nearby GPS points with accuracy values */
function arbGPSPointSequence(minLength: number, maxLength: number) {
  return fc
    .record({
      startLat: arbLatitude,
      startLng: arbLongitude,
    })
    .chain(({ startLat, startLng }) =>
      fc
        .array(
          fc.record({
            latOffset: fc.double({ min: -0.05, max: 0.05, noNaN: true, noDefaultInfinity: true }),
            lngOffset: fc.double({ min: -0.05, max: 0.05, noNaN: true, noDefaultInfinity: true }),
            accuracy: fc.double({ min: 1, max: 100, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength, maxLength }
        )
        .map((offsets) => {
          const points: Array<{ lat: number; lng: number; accuracy: number }> = [
            { lat: startLat, lng: startLng, accuracy: 10 }, // start point always valid accuracy
          ]
          let currentLat = startLat
          let currentLng = startLng

          for (const { latOffset, lngOffset, accuracy } of offsets) {
            currentLat = Math.max(-90, Math.min(90, currentLat + latOffset))
            currentLng = Math.max(-180, Math.min(180, currentLng + lngOffset))
            points.push({ lat: currentLat, lng: currentLng, accuracy })
          }
          return points
        })
    )
}

/**
 * Simulates distance accumulation with accuracy filtering.
 * Returns the total accumulated distance considering the 50m accuracy threshold.
 */
function accumulateDistance(
  points: Array<{ lat: number; lng: number; accuracy: number }>
): number {
  let total = 0
  let lastValidPoint: { lat: number; lng: number } | null = null

  for (const point of points) {
    if (point.accuracy > ACCURACY_THRESHOLD_M) {
      // Skip points with poor accuracy
      continue
    }

    if (lastValidPoint !== null) {
      total += haversineDistanceKm(
        lastValidPoint.lat,
        lastValidPoint.lng,
        point.lat,
        point.lng
      )
    }

    lastValidPoint = { lat: point.lat, lng: point.lng }
  }

  return total
}

describe('Property 8: Haversine Distance Accumulation', () => {
  describe('Cumulative distance equals sum of segments', () => {
    it('total accumulated distance equals sum of individual segment distances', () => {
      runProperty(
        fc.property(arbGPSPointSequence(2, 20), (points) => {
          // Filter to only valid-accuracy points
          const validPoints = points.filter((p) => p.accuracy <= ACCURACY_THRESHOLD_M)

          if (validPoints.length < 2) return // Need at least 2 valid points

          // Calculate total by summing individual segments
          let segmentSum = 0
          for (let i = 1; i < validPoints.length; i++) {
            segmentSum += haversineDistanceKm(
              validPoints[i - 1].lat,
              validPoints[i - 1].lng,
              validPoints[i].lat,
              validPoints[i].lng
            )
          }

          // Calculate total by accumulating point by point (using the filtering function)
          const accumulated = accumulateDistance(points)

          // Both methods should produce the same result
          expect(accumulated).toBeCloseTo(segmentSum, 10)
        })
      )
    })
  })

  describe('Accuracy filtering', () => {
    it('positions with accuracy > 50m contribute zero distance', () => {
      runProperty(
        fc.property(arbGPSPointSequence(2, 15), (points) => {
          // Create a modified version where some points have high accuracy
          const withHighAccuracy = points.map((p, i) =>
            i > 0 && i < points.length - 1
              ? { ...p, accuracy: 60 } // Force intermediate points to be inaccurate
              : p
          )

          // With all intermediate points filtered out, distance should equal
          // direct distance between the valid (first and last) points
          const accumulated = accumulateDistance(withHighAccuracy)

          // Only first and last points should contribute (if both have accuracy <= 50m)
          const validPoints = withHighAccuracy.filter((p) => p.accuracy <= ACCURACY_THRESHOLD_M)

          if (validPoints.length < 2) {
            expect(accumulated).toBe(0)
          } else {
            // The accumulated distance should be the sum of consecutive valid point distances
            let expectedDistance = 0
            for (let i = 1; i < validPoints.length; i++) {
              expectedDistance += haversineDistanceKm(
                validPoints[i - 1].lat,
                validPoints[i - 1].lng,
                validPoints[i].lat,
                validPoints[i].lng
              )
            }
            expect(accumulated).toBeCloseTo(expectedDistance, 10)
          }
        })
      )
    })

    it('all points with accuracy > 50m results in zero total distance', () => {
      runProperty(
        fc.property(
          fc.array(
            fc.record({
              lat: arbLatitude,
              lng: arbLongitude,
              accuracy: fc.double({ min: 50.001, max: 200, noNaN: true, noDefaultInfinity: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (points) => {
            const accumulated = accumulateDistance(points)
            expect(accumulated).toBe(0)
          }
        )
      )
    })
  })

  describe('Non-negative distance accumulation', () => {
    it('accumulated distance is always non-negative', () => {
      runProperty(
        fc.property(arbGPSPointSequence(1, 20), (points) => {
          const accumulated = accumulateDistance(points)
          expect(accumulated).toBeGreaterThanOrEqual(0)
        })
      )
    })

    it('haversine distance between any two points is non-negative', () => {
      runProperty(
        fc.property(arbLatitude, arbLongitude, arbLatitude, arbLongitude, (lat1, lon1, lat2, lon2) => {
          const distance = haversineDistanceKm(lat1, lon1, lat2, lon2)
          expect(distance).toBeGreaterThanOrEqual(0)
        })
      )
    })
  })

  describe('Triangle inequality (intermediate points never decrease total distance)', () => {
    it('direct distance A→C is always ≤ A→B + B→C', () => {
      runProperty(
        fc.property(
          arbLatitude,
          arbLongitude,
          arbLatitude,
          arbLongitude,
          arbLatitude,
          arbLongitude,
          (lat1, lon1, lat2, lon2, lat3, lon3) => {
            const directAC = haversineDistanceKm(lat1, lon1, lat3, lon3)
            const viaB = haversineDistanceKm(lat1, lon1, lat2, lon2) +
              haversineDistanceKm(lat2, lon2, lat3, lon3)

            // Triangle inequality: d(A,C) ≤ d(A,B) + d(B,C)
            // Allow floating-point tolerance proportional to distance scale.
            // Near-antipodal points can cause ~1e-4 km numerical errors in Haversine.
            expect(directAC).toBeLessThanOrEqual(viaB + 1e-3)
          }
        )
      )
    })

    it('adding intermediate points never decreases accumulated distance', () => {
      runProperty(
        fc.property(arbNearbyCoordinates, (coords) => {
          const { start, end } = coords

          // Generate a random intermediate point
          const midLat = (start.lat + end.lat) / 2 + (Math.random() - 0.5) * 0.01
          const midLng = (start.lng + end.lng) / 2 + (Math.random() - 0.5) * 0.01
          const clampedMidLat = Math.max(-90, Math.min(90, midLat))
          const clampedMidLng = Math.max(-180, Math.min(180, midLng))

          const directDistance = haversineDistanceKm(start.lat, start.lng, end.lat, end.lng)
          const viaIntermediate =
            haversineDistanceKm(start.lat, start.lng, clampedMidLat, clampedMidLng) +
            haversineDistanceKm(clampedMidLat, clampedMidLng, end.lat, end.lng)

          // Triangle inequality: going through an intermediate point is always ≥ direct
          expect(viaIntermediate + 1e-10).toBeGreaterThanOrEqual(directDistance)
        })
      )
    })
  })
})
