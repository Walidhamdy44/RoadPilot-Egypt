/**
 * Speed calculation utilities for RoadPilot Egypt.
 *
 * Pure functions for computing average speed and tracking maximum speed
 * during an active trip.
 */

/** Record of the maximum speed reached during a trip. */
export interface MaxSpeedRecord {
  /** Maximum speed in km/h */
  speedKmh: number;
  /** Unix epoch timestamp (ms) when max speed was recorded, null if not yet recorded */
  timestamp: number | null;
  /** Coordinates where max speed occurred, null if not yet recorded */
  coordinates: { lat: number; lng: number } | null;
}

/** Maximum displayable average speed (km/h). */
const MAX_AVERAGE_SPEED = 999.9;

/** Maximum GPS accuracy (meters) allowed for max speed evaluation. */
const MAX_ACCURACY_FOR_MAX_SPEED = 30;

/** Maximum plausible speed (km/h) — readings above this are sensor anomalies. */
const MAX_PLAUSIBLE_SPEED = 250;

/**
 * Calculate average speed from total distance and driving time.
 *
 * Formula: totalDistanceKm / (drivingTimeMs / 3_600_000)
 *
 * - Returns 0.0 if drivingTimeMs is 0
 * - Caps result at 999.9 km/h
 *
 * @param distanceKm - Total trip distance in kilometers (must be >= 0)
 * @param drivingTimeMs - Total driving time in milliseconds (must be >= 0)
 * @returns Average speed in km/h, capped at 999.9
 */
export function calculateAverageSpeed(
  distanceKm: number,
  drivingTimeMs: number
): number {
  if (drivingTimeMs <= 0) {
    return 0.0;
  }

  const drivingTimeHours = drivingTimeMs / 3_600_000;
  const avgSpeed = distanceKm / drivingTimeHours;

  return Math.min(avgSpeed, MAX_AVERAGE_SPEED);
}

/**
 * Evaluate a new speed reading and update the max speed record if applicable.
 *
 * A reading is discarded (max speed not updated) when:
 * - GPS accuracy > 30 meters
 * - Speed > 250 km/h (sensor anomaly)
 *
 * When max speed is updated, the timestamp and coordinates are recorded.
 *
 * @param currentMax - Current max speed record
 * @param speedKmh - New speed reading in km/h
 * @param accuracy - GPS accuracy in meters for this reading
 * @param timestamp - Unix epoch timestamp (ms) of this reading
 * @param coordinates - GPS coordinates of this reading
 * @returns Updated MaxSpeedRecord (same reference if not updated)
 */
export function updateMaxSpeed(
  currentMax: MaxSpeedRecord,
  speedKmh: number,
  accuracy: number,
  timestamp: number,
  coordinates: { lat: number; lng: number }
): MaxSpeedRecord {
  // Discard readings with poor accuracy
  if (accuracy > MAX_ACCURACY_FOR_MAX_SPEED) {
    return currentMax;
  }

  // Discard sensor anomalies
  if (speedKmh > MAX_PLAUSIBLE_SPEED) {
    return currentMax;
  }

  // Update max speed only if new reading exceeds current maximum
  if (speedKmh > currentMax.speedKmh) {
    return {
      speedKmh,
      timestamp,
      coordinates,
    };
  }

  return currentMax;
}

/**
 * Create an initial MaxSpeedRecord for a new trip.
 *
 * @returns A MaxSpeedRecord initialized to 0.0 with no timestamp or coordinates
 */
export function createInitialMaxSpeedRecord(): MaxSpeedRecord {
  return {
    speedKmh: 0.0,
    timestamp: null,
    coordinates: null,
  };
}
