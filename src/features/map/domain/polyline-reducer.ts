/**
 * Polyline reduction using the Douglas-Peucker algorithm.
 *
 * Reduces GPS traces to a maximum number of points for rendering
 * performance while preserving the shape of the route.
 */

import type { GPSTracePoint } from "@/features/trip/domain/trip-types";

const DEFAULT_MAX_POINTS = 500;

/**
 * Calculates the perpendicular distance from a point to the line
 * segment defined by `start` and `end`.
 *
 * Uses the formula for distance from a point to a line in 2D space.
 */
function perpendicularDistance(
  point: GPSTracePoint,
  start: GPSTracePoint,
  end: GPSTracePoint,
): number {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;

  // If start and end are the same point, return Euclidean distance to that point
  const lineLengthSq = dx * dx + dy * dy;
  if (lineLengthSq === 0) {
    const pdx = point.lng - start.lng;
    const pdy = point.lat - start.lat;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Perpendicular distance using cross product formula:
  // |AB × AP| / |AB|
  const numerator = Math.abs(
    dy * point.lng - dx * point.lat + end.lng * start.lat - end.lat * start.lng,
  );
  const denominator = Math.sqrt(lineLengthSq);

  return numerator / denominator;
}

/**
 * Douglas-Peucker recursive simplification.
 *
 * Returns a boolean mask indicating which points to keep.
 */
function douglasPeucker(
  points: GPSTracePoint[],
  epsilon: number,
  keep: boolean[],
  startIndex: number,
  endIndex: number,
): void {
  if (endIndex - startIndex <= 1) {
    return;
  }

  let maxDistance = 0;
  let maxIndex = startIndex;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const distance = perpendicularDistance(
      points[i],
      points[startIndex],
      points[endIndex],
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    keep[maxIndex] = true;
    douglasPeucker(points, epsilon, keep, startIndex, maxIndex);
    douglasPeucker(points, epsilon, keep, maxIndex, endIndex);
  }
}

/**
 * Applies Douglas-Peucker simplification with a given epsilon and returns
 * the resulting points.
 */
function simplify(
  points: GPSTracePoint[],
  epsilon: number,
): GPSTracePoint[] {
  const keep = new Array<boolean>(points.length).fill(false);

  // Always preserve first and last points
  keep[0] = true;
  keep[points.length - 1] = true;

  douglasPeucker(points, epsilon, keep, 0, points.length - 1);

  return points.filter((_, index) => keep[index]);
}

/**
 * Reduces a GPS trace to at most `maxPoints` points using the
 * Douglas-Peucker algorithm.
 *
 * - If the input has <= maxPoints, it is returned as-is (no reduction).
 * - Always preserves the first and last points of the original trace.
 * - Iteratively adjusts epsilon until the result fits within maxPoints.
 *
 * @param points - The full GPS trace to reduce
 * @param maxPoints - Maximum number of points in the output (default: 500)
 * @returns Reduced array of GPSTracePoint with at most maxPoints entries
 */
export function reducePolyline(
  points: GPSTracePoint[],
  maxPoints: number = DEFAULT_MAX_POINTS,
): GPSTracePoint[] {
  // No reduction needed if already within limit
  if (points.length <= maxPoints) {
    return points;
  }

  // Edge case: if maxPoints < 2, still preserve first and last
  if (maxPoints < 2) {
    return [points[0], points[points.length - 1]];
  }

  // Calculate initial epsilon based on the bounding box of the trace
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of points) {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lng < minLng) minLng = point.lng;
    if (point.lng > maxLng) maxLng = point.lng;
  }

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const diagonal = Math.sqrt(latRange * latRange + lngRange * lngRange);

  // Start with a small epsilon and increase until we're within maxPoints
  let epsilonLow = 0;
  let epsilonHigh = diagonal;
  let result = simplify(points, epsilonHigh);

  // If even the maximum epsilon doesn't reduce enough, just take evenly spaced points
  if (result.length > maxPoints) {
    return evenlySpacedSubset(points, maxPoints);
  }

  // Binary search for the smallest epsilon that gives us <= maxPoints
  const MAX_ITERATIONS = 50;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const epsilonMid = (epsilonLow + epsilonHigh) / 2;
    result = simplify(points, epsilonMid);

    if (result.length > maxPoints) {
      // Need a larger epsilon to reduce more points
      epsilonLow = epsilonMid;
    } else if (result.length < maxPoints * 0.9) {
      // Epsilon too large, we're losing too many points — try smaller
      epsilonHigh = epsilonMid;
    } else {
      // Within acceptable range (90%–100% of maxPoints)
      break;
    }

    // Stop if epsilon range is negligibly small
    if (epsilonHigh - epsilonLow < diagonal * 1e-10) {
      break;
    }
  }

  // Final check: if still over maxPoints after binary search, use the high epsilon
  if (result.length > maxPoints) {
    result = simplify(points, epsilonHigh);
  }

  // Ultimate fallback: take evenly spaced subset
  if (result.length > maxPoints) {
    return evenlySpacedSubset(points, maxPoints);
  }

  return result;
}

/**
 * Fallback: picks an evenly spaced subset of points, always including
 * the first and last points.
 */
function evenlySpacedSubset(
  points: GPSTracePoint[],
  maxPoints: number,
): GPSTracePoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const result: GPSTracePoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  result.push(points[points.length - 1]);
  return result;
}
