/**
 * Analytics Engine for RoadPilot Egypt.
 *
 * Pure functions for generating trip summaries and speed chart data
 * from completed trip records.
 */

import type { CompletedTrip, GPSTracePoint } from '@/features/trip/domain/trip-types';

/** Trip summary generated after a trip ends. */
export interface TripSummary {
  /** Total distance in km (2 decimal places) */
  distance: number;
  /** Total elapsed time in ms */
  elapsedTime: number;
  /** Total driving time in ms */
  drivingTime: number;
  /** Total stop time in ms */
  stopTime: number;
  /** Average speed in km/h (1 decimal place) */
  avgSpeed: number;
  /** Maximum speed in km/h (1 decimal place) */
  maxSpeed: number;
  /** Number of stops during the trip */
  stopsCount: number;
  /** Human-readable start location name */
  startLocation: string | null;
  /** Human-readable end location name */
  endLocation: string | null;
  /** Whether map view and speed chart should be shown (false if trace < 10 points) */
  hasVisualization: boolean;
}

/** A single point on the speed-over-time chart. */
export interface SpeedChartPoint {
  /** Time in minutes from trip start */
  timeMinutes: number;
  /** Speed in km/h at this point */
  speedKmh: number;
}

/**
 * Generates a trip summary from a completed trip.
 *
 * Extracts key metrics: distance, elapsed time, driving/stop time,
 * avg/max speed, stops count, start/end location names.
 * Sets hasVisualization to false if the GPS trace has fewer than 10 points.
 *
 * @param trip - The completed trip record
 * @returns TripSummary with all computed metrics
 */
export function generateTripSummary(trip: CompletedTrip): TripSummary {
  const elapsedTime = trip.endTimestamp - trip.startTimestamp;
  const hasVisualization = trip.gpsTrace.length >= 10;

  return {
    distance: roundToDecimalPlaces(trip.totalDistanceKm, 2),
    elapsedTime,
    drivingTime: trip.drivingTimeMs,
    stopTime: trip.stopTimeMs,
    avgSpeed: roundToDecimalPlaces(trip.averageSpeedKmh, 1),
    maxSpeed: roundToDecimalPlaces(trip.maxSpeedKmh, 1),
    stopsCount: trip.numberOfStops,
    startLocation: trip.startLocationName,
    endLocation: trip.endLocationName,
    hasVisualization,
  };
}

/**
 * Generates speed chart data by downsampling a GPS trace to ensure
 * a maximum interval of 30 seconds between consecutive points.
 *
 * Points are selected to maintain at most `maxIntervalMs` between them.
 * The first and last points are always included.
 *
 * @param trace - The full GPS trace from the trip
 * @param maxIntervalMs - Maximum interval between chart points in ms (default 30000)
 * @returns Array of SpeedChartPoint for rendering in Recharts
 */
export function generateSpeedChartData(
  trace: GPSTracePoint[],
  maxIntervalMs: number = 30_000
): SpeedChartPoint[] {
  if (trace.length === 0) {
    return [];
  }

  if (trace.length === 1) {
    return [
      {
        timeMinutes: 0,
        speedKmh: trace[0].speedKmh,
      },
    ];
  }

  const startTimestamp = trace[0].timestamp;
  const result: SpeedChartPoint[] = [];

  // Always include the first point
  result.push({
    timeMinutes: 0,
    speedKmh: trace[0].speedKmh,
  });

  let lastIncludedTimestamp = trace[0].timestamp;

  for (let i = 1; i < trace.length - 1; i++) {
    const point = trace[i];
    const timeSinceLast = point.timestamp - lastIncludedTimestamp;

    if (timeSinceLast >= maxIntervalMs) {
      result.push({
        timeMinutes: (point.timestamp - startTimestamp) / 60_000,
        speedKmh: point.speedKmh,
      });
      lastIncludedTimestamp = point.timestamp;
    }
  }

  // Always include the last point
  const lastPoint = trace[trace.length - 1];
  // Avoid duplicate if last point was already included
  if (lastPoint.timestamp !== lastIncludedTimestamp) {
    result.push({
      timeMinutes: (lastPoint.timestamp - startTimestamp) / 60_000,
      speedKmh: lastPoint.speedKmh,
    });
  }

  return result;
}

/**
 * Rounds a number to the specified decimal places.
 */
function roundToDecimalPlaces(value: number, places: number): number {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}
