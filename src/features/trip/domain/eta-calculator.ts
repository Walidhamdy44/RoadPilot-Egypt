/**
 * ETA Calculator for RoadPilot Egypt.
 *
 * Provides a complete ETA management solution that:
 * - Wraps the basic distance/speed formula
 * - Prefers route-based ETA from OpenRouteService if received within 5 minutes
 * - Falls back to distance/speed calculation when route ETA is stale
 * - Throttles recalculation to max once every 30 seconds
 * - Returns null when speed < 5 km/h or no remaining distance
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { formatTimeOfDay } from '@/shared/utils/date';

/** Minimum average speed (km/h) required to display ETA */
const MIN_SPEED_KMH = 5;

/** Maximum staleness for route-based ETA (5 minutes in ms) */
const ROUTE_ETA_MAX_AGE_MS = 5 * 60 * 1000;

/** Minimum interval between recalculations (30 seconds in ms) */
const RECALCULATION_INTERVAL_MS = 30 * 1000;

/**
 * Public interface for the ETA calculator.
 */
export interface ETACalculator {
  /**
   * Updates the route-based ETA received from OpenRouteService.
   * @param etaMs - The ETA as an absolute timestamp in milliseconds (arrival time)
   * @param timestamp - When this route ETA was received (Unix epoch ms)
   */
  updateRouteETA(etaMs: number, timestamp: number): void;

  /**
   * Calculates the ETA as an absolute timestamp in milliseconds.
   * Returns null if speed < 5 km/h or remainingKm <= 0.
   * Throttled to recalculate at most once every 30 seconds.
   *
   * @param remainingKm - Remaining distance to destination in km
   * @param avgSpeedKmh - Current average speed in km/h
   * @param currentTimestamp - Current time as Unix epoch ms
   * @returns Absolute ETA timestamp in ms, or null if ETA cannot be computed
   */
  calculate(remainingKm: number, avgSpeedKmh: number, currentTimestamp: number): number | null;

  /**
   * Returns the ETA formatted as HH:MM (24-hour clock), or null if ETA cannot be computed.
   *
   * @param remainingKm - Remaining distance to destination in km
   * @param avgSpeedKmh - Current average speed in km/h
   * @param currentTimestamp - Current time as Unix epoch ms
   * @returns Formatted ETA string like "14:30", or null
   */
  getFormattedETA(remainingKm: number, avgSpeedKmh: number, currentTimestamp: number): string | null;
}

/**
 * Internal state for the ETA calculator.
 */
interface ETACalculatorState {
  /** Last route-based ETA (absolute timestamp in ms) */
  routeEtaMs: number | null;
  /** Timestamp when the route ETA was received */
  routeEtaReceivedAt: number | null;
  /** Last calculated ETA result (absolute timestamp in ms) */
  lastCalculatedEta: number | null;
  /** Timestamp of the last recalculation */
  lastCalculationTimestamp: number | null;
}

/**
 * Creates a new ETACalculator instance.
 *
 * @returns A fresh ETACalculator with no cached route ETA
 */
export function createETACalculator(): ETACalculator {
  const state: ETACalculatorState = {
    routeEtaMs: null,
    routeEtaReceivedAt: null,
    lastCalculatedEta: null,
    lastCalculationTimestamp: null,
  };

  function updateRouteETA(etaMs: number, timestamp: number): void {
    state.routeEtaMs = etaMs;
    state.routeEtaReceivedAt = timestamp;
  }

  function calculate(
    remainingKm: number,
    avgSpeedKmh: number,
    currentTimestamp: number
  ): number | null {
    // Hide ETA when speed is too low or no remaining distance
    if (avgSpeedKmh < MIN_SPEED_KMH || remainingKm <= 0) {
      state.lastCalculatedEta = null;
      state.lastCalculationTimestamp = currentTimestamp;
      return null;
    }

    // Throttle: return cached result if within 30 seconds
    if (
      state.lastCalculationTimestamp !== null &&
      state.lastCalculatedEta !== null &&
      currentTimestamp - state.lastCalculationTimestamp < RECALCULATION_INTERVAL_MS
    ) {
      return state.lastCalculatedEta;
    }

    // Check if route-based ETA is available and fresh (within 5 minutes)
    if (
      state.routeEtaMs !== null &&
      state.routeEtaReceivedAt !== null &&
      currentTimestamp - state.routeEtaReceivedAt < ROUTE_ETA_MAX_AGE_MS
    ) {
      state.lastCalculatedEta = state.routeEtaMs;
      state.lastCalculationTimestamp = currentTimestamp;
      return state.routeEtaMs;
    }

    // Fall back to distance/speed calculation
    // ETA = currentTime + (remainingKm / avgSpeedKmh) converted to ms
    const remainingHours = remainingKm / avgSpeedKmh;
    const remainingMs = remainingHours * 3_600_000;
    const eta = currentTimestamp + remainingMs;

    state.lastCalculatedEta = eta;
    state.lastCalculationTimestamp = currentTimestamp;
    return eta;
  }

  function getFormattedETA(
    remainingKm: number,
    avgSpeedKmh: number,
    currentTimestamp: number
  ): string | null {
    const eta = calculate(remainingKm, avgSpeedKmh, currentTimestamp);
    if (eta === null) {
      return null;
    }
    return formatTimeOfDay(eta);
  }

  return {
    updateRouteETA,
    calculate,
    getFormattedETA,
  };
}
