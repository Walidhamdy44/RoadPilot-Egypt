/**
 * Aggregate analytics computation for RoadPilot Egypt.
 *
 * Computes weekly (Monday-start) and monthly aggregate metrics,
 * supports custom date ranges up to 365 days, and handles
 * corrupted/missing trip data gracefully.
 */

import type { CompletedTrip } from "@/features/trip/domain/trip-types";
import { startOfWeekUTC, startOfMonthUTC } from "@/shared/utils/date";

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Aggregated metrics for a set of trips. */
export interface AggregateResult {
  /** Total distance traveled across all trips in km */
  totalDistanceKm: number;
  /** Total driving time across all trips in ms */
  totalDrivingTimeMs: number;
  /** Total stop time across all trips in ms */
  totalStopTimeMs: number;
  /** Average trip speed in km/h (weighted by driving time) */
  averageTripSpeedKmh: number;
  /** Number of trips included */
  tripCount: number;
  /** Whether some trip data was excluded due to corruption */
  isPartial: boolean;
  /** Number of trips excluded due to corrupted/missing data */
  excludedCount: number;
}

/** Weekly aggregate result with the week start timestamp. */
export interface WeeklyAggregate extends AggregateResult {
  /** Unix epoch ms of Monday 00:00:00 UTC for this week */
  weekStart: number;
}

/** Monthly aggregate result with the month start timestamp. */
export interface MonthlyAggregate extends AggregateResult {
  /** Unix epoch ms of the 1st day 00:00:00 UTC for this month */
  monthStart: number;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Checks whether a completed trip has valid (non-corrupted) data
 * needed for aggregate computation.
 */
function isTripValid(trip: CompletedTrip): boolean {
  if (!trip) return false;
  if (typeof trip.totalDistanceKm !== "number" || !Number.isFinite(trip.totalDistanceKm)) return false;
  if (typeof trip.drivingTimeMs !== "number" || !Number.isFinite(trip.drivingTimeMs)) return false;
  if (typeof trip.stopTimeMs !== "number" || !Number.isFinite(trip.stopTimeMs)) return false;
  if (typeof trip.averageSpeedKmh !== "number" || !Number.isFinite(trip.averageSpeedKmh)) return false;
  if (typeof trip.startTimestamp !== "number" || !Number.isFinite(trip.startTimestamp)) return false;
  if (typeof trip.endTimestamp !== "number" || !Number.isFinite(trip.endTimestamp)) return false;
  if (trip.totalDistanceKm < 0) return false;
  if (trip.drivingTimeMs < 0) return false;
  if (trip.stopTimeMs < 0) return false;
  return true;
}

// ─── Core Aggregation ────────────────────────────────────────────────────────

/**
 * Aggregates a list of trips into a single AggregateResult.
 * Skips corrupted trips and sets isPartial/excludedCount accordingly.
 */
function aggregateTrips(trips: CompletedTrip[]): AggregateResult {
  let totalDistanceKm = 0;
  let totalDrivingTimeMs = 0;
  let totalStopTimeMs = 0;
  let tripCount = 0;
  let excludedCount = 0;

  for (const trip of trips) {
    if (!isTripValid(trip)) {
      excludedCount++;
      continue;
    }
    totalDistanceKm += trip.totalDistanceKm;
    totalDrivingTimeMs += trip.drivingTimeMs;
    totalStopTimeMs += trip.stopTimeMs;
    tripCount++;
  }

  // Average trip speed: total distance / total driving time (in hours)
  const totalDrivingHours = totalDrivingTimeMs / 3_600_000;
  const averageTripSpeedKmh =
    totalDrivingHours > 0 ? totalDistanceKm / totalDrivingHours : 0;

  return {
    totalDistanceKm,
    totalDrivingTimeMs,
    totalStopTimeMs,
    averageTripSpeedKmh,
    tripCount,
    isPartial: excludedCount > 0,
    excludedCount,
  };
}

/**
 * Creates an empty aggregate result (for periods with no trips).
 */
function emptyAggregate(): AggregateResult {
  return {
    totalDistanceKm: 0,
    totalDrivingTimeMs: 0,
    totalStopTimeMs: 0,
    averageTripSpeedKmh: 0,
    tripCount: 0,
    isPartial: false,
    excludedCount: 0,
  };
}

// ─── Weekly Aggregates ───────────────────────────────────────────────────────

/**
 * Groups trips by their Monday-start week and computes aggregate
 * metrics for each week that contains at least one trip.
 *
 * @param trips - Array of completed trips (any order)
 * @returns Array of WeeklyAggregate sorted by weekStart ascending
 */
export function computeWeeklyAggregates(trips: CompletedTrip[]): WeeklyAggregate[] {
  if (!trips || trips.length === 0) return [];

  // Group trips by week start
  const weekMap = new Map<number, CompletedTrip[]>();

  for (const trip of trips) {
    // Use startTimestamp to determine which week the trip belongs to
    const ts = trip?.startTimestamp;
    if (typeof ts !== "number" || !Number.isFinite(ts)) {
      // Will be handled as corrupted during aggregation
      // Assign to a placeholder week so it gets counted as excluded
      const placeholder = 0;
      const existing = weekMap.get(placeholder) ?? [];
      existing.push(trip);
      weekMap.set(placeholder, existing);
      continue;
    }
    const weekStart = startOfWeekUTC(ts);
    const existing = weekMap.get(weekStart) ?? [];
    existing.push(trip);
    weekMap.set(weekStart, existing);
  }

  const results: WeeklyAggregate[] = [];

  weekMap.forEach((weekTrips, weekStart) => {
    const aggregate = aggregateTrips(weekTrips);
    // Only include weeks that have valid trips OR excluded trips
    if (aggregate.tripCount > 0 || aggregate.excludedCount > 0) {
      results.push({ weekStart, ...aggregate });
    }
  });

  // Sort by weekStart ascending
  results.sort((a, b) => a.weekStart - b.weekStart);

  return results;
}

// ─── Monthly Aggregates ──────────────────────────────────────────────────────

/**
 * Groups trips by their calendar month and computes aggregate
 * metrics for each month that contains at least one trip.
 *
 * @param trips - Array of completed trips (any order)
 * @returns Array of MonthlyAggregate sorted by monthStart ascending
 */
export function computeMonthlyAggregates(trips: CompletedTrip[]): MonthlyAggregate[] {
  if (!trips || trips.length === 0) return [];

  // Group trips by month start
  const monthMap = new Map<number, CompletedTrip[]>();

  for (const trip of trips) {
    const ts = trip?.startTimestamp;
    if (typeof ts !== "number" || !Number.isFinite(ts)) {
      const placeholder = 0;
      const existing = monthMap.get(placeholder) ?? [];
      existing.push(trip);
      monthMap.set(placeholder, existing);
      continue;
    }
    const monthStart = startOfMonthUTC(ts);
    const existing = monthMap.get(monthStart) ?? [];
    existing.push(trip);
    monthMap.set(monthStart, existing);
  }

  const results: MonthlyAggregate[] = [];

  monthMap.forEach((monthTrips, monthStart) => {
    const aggregate = aggregateTrips(monthTrips);
    if (aggregate.tripCount > 0 || aggregate.excludedCount > 0) {
      results.push({ monthStart, ...aggregate });
    }
  });

  // Sort by monthStart ascending
  results.sort((a, b) => a.monthStart - b.monthStart);

  return results;
}

// ─── Custom Range Aggregate ──────────────────────────────────────────────────

/** Maximum allowed custom range in milliseconds (365 days). */
const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Computes aggregate metrics for trips whose startTimestamp falls
 * within the specified date range [fromMs, toMs].
 *
 * @param trips - Array of completed trips (any order)
 * @param fromMs - Start of range (inclusive), Unix epoch ms
 * @param toMs - End of range (inclusive), Unix epoch ms
 * @returns AggregateResult for trips within the range
 * @throws Error if range exceeds 365 days
 */
export function computeCustomRangeAggregate(
  trips: CompletedTrip[],
  fromMs: number,
  toMs: number
): AggregateResult {
  if (toMs - fromMs > MAX_RANGE_MS) {
    throw new Error(
      `Custom date range cannot exceed 365 days. Requested range: ${Math.ceil((toMs - fromMs) / (24 * 60 * 60 * 1000))} days.`
    );
  }

  if (!trips || trips.length === 0) {
    return emptyAggregate();
  }

  // Filter trips within range (based on startTimestamp)
  const tripsInRange = trips.filter((trip) => {
    const ts = trip?.startTimestamp;
    if (typeof ts !== "number" || !Number.isFinite(ts)) {
      // Corrupted timestamps — include so they get counted as excluded
      return true;
    }
    return ts >= fromMs && ts <= toMs;
  });

  if (tripsInRange.length === 0) {
    return emptyAggregate();
  }

  return aggregateTrips(tripsInRange);
}
