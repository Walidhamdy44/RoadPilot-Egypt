/**
 * Haversine distance and bearing calculation module.
 *
 * Provides functions for calculating the great-circle distance and bearing
 * between two points on Earth given their latitude and longitude in degrees.
 * Also includes heading-to-cardinal direction mapping and heading fallback logic.
 *
 * @module haversine
 */

import type { ValidatedPosition } from './gps-types';

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Distance in kilometers
 *
 * @example
 * ```ts
 * // Cairo to Alexandria (~180 km)
 * const distance = haversineDistanceKm(30.0444, 31.2357, 31.2001, 29.9187);
 * ```
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the initial bearing (forward azimuth) from point 1 to point 2.
 *
 * Uses the formula:
 * θ = atan2(sin(Δλ)·cos(φ2), cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ))
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Bearing in degrees [0, 360)
 *
 * @example
 * ```ts
 * // Bearing from Cairo heading north
 * const bearing = calculateBearing(30.0444, 31.2357, 31.0444, 31.2357);
 * // ≈ 0 (north)
 * ```
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  // Convert from radians [-π, π] to degrees [0, 360)
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Maps a heading in degrees to a cardinal/intercardinal direction label
 * using 45-degree segments.
 *
 * Segments:
 * - N:  338–22
 * - NE: 23–67
 * - E:  68–112
 * - SE: 113–157
 * - S:  158–202
 * - SW: 203–247
 * - W:  248–292
 * - NW: 293–337
 *
 * @param heading - Heading in degrees [0, 360)
 * @returns Cardinal direction string: N, NE, E, SE, S, SW, W, or NW
 *
 * @example
 * ```ts
 * headingToCardinal(0);   // "N"
 * headingToCardinal(45);  // "NE"
 * headingToCardinal(90);  // "E"
 * headingToCardinal(180); // "S"
 * ```
 */
export function headingToCardinal(heading: number): string {
  // Normalize heading to [0, 360)
  const normalized = ((heading % 360) + 360) % 360;

  if (normalized >= 338 || normalized <= 22) return 'N';
  if (normalized >= 23 && normalized <= 67) return 'NE';
  if (normalized >= 68 && normalized <= 112) return 'E';
  if (normalized >= 113 && normalized <= 157) return 'SE';
  if (normalized >= 158 && normalized <= 202) return 'S';
  if (normalized >= 203 && normalized <= 247) return 'SW';
  if (normalized >= 248 && normalized <= 292) return 'W';
  return 'NW'; // 293–337
}

/**
 * Calculates a heading fallback from the bearing between two positions
 * when the GPS does not provide heading data directly.
 *
 * Only returns a heading if the two positions are separated by at least
 * 5 meters (0.005 km). Returns null if the positions are too close together,
 * as the bearing would be unreliable.
 *
 * @param prevPosition - The previous GPS position
 * @param currPosition - The current GPS position
 * @returns Heading in degrees [0, 360) if positions are ≥ 5m apart, or null otherwise
 *
 * @example
 * ```ts
 * const heading = calculateHeadingFallback(prevPos, currPos);
 * if (heading !== null) {
 *   // Use calculated heading
 * }
 * ```
 */
export function calculateHeadingFallback(
  prevPosition: ValidatedPosition,
  currPosition: ValidatedPosition
): number | null {
  const distanceKm = haversineDistanceKm(
    prevPosition.latitude,
    prevPosition.longitude,
    currPosition.latitude,
    currPosition.longitude
  );

  // 5 meters = 0.005 km
  if (distanceKm < 0.005) {
    return null;
  }

  return calculateBearing(
    prevPosition.latitude,
    prevPosition.longitude,
    currPosition.latitude,
    currPosition.longitude
  );
}

/**
 * Determines whether heading updates should be suppressed based on speed.
 *
 * When speed is below 2 km/h, heading data is unreliable because minor
 * GPS jitter can cause large heading fluctuations. In this case, the
 * last known heading should be retained and compass updates suppressed.
 *
 * @param speedKmh - Current speed in km/h
 * @returns true if heading should be suppressed (speed < 2 km/h)
 *
 * @example
 * ```ts
 * shouldSuppressHeading(0.5); // true - too slow
 * shouldSuppressHeading(5.0); // false - moving fast enough
 * ```
 */
export function shouldSuppressHeading(speedKmh: number): boolean {
  return speedKmh < 2;
}

/**
 * Calculates the shortest rotational path between two headings.
 *
 * Returns the angular difference in the range [-180, 180] representing
 * the shortest rotation needed to go from `from` to `to`. A positive
 * value indicates clockwise rotation, negative indicates counter-clockwise.
 *
 * This is used for compass animation to ensure the indicator always takes
 * the shortest path when rotating to a new heading.
 *
 * @param from - Starting heading in degrees [0, 360)
 * @param to - Target heading in degrees [0, 360)
 * @returns Angular difference in degrees [-180, 180]
 *
 * @example
 * ```ts
 * shortestRotation(350, 10);  // 20 (clockwise)
 * shortestRotation(10, 350);  // -20 (counter-clockwise)
 * shortestRotation(0, 180);   // 180 or -180 (boundary case)
 * ```
 */
export function shortestRotation(from: number, to: number): number {
  // Normalize both headings to [0, 360)
  const normalizedFrom = ((from % 360) + 360) % 360;
  const normalizedTo = ((to % 360) + 360) % 360;

  let diff = normalizedTo - normalizedFrom;

  // Wrap to [-180, 180]
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  return diff;
}
