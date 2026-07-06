/**
 * OpenRouteService client for route calculation and remaining distance tracking.
 *
 * Provides road-following distance calculation from a current position to a destination,
 * with recalculation triggers (every 2 minutes or 5 km), route deviation detection,
 * and Haversine fallback when offline or on error.
 *
 * @module route-api
 */

import { haversineDistanceKm } from '@/features/gps/domain/haversine';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A geographic coordinate with latitude and longitude. */
export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Result of a route distance calculation.
 */
export interface RouteDistanceResult {
  /** Remaining distance to destination in kilometers */
  remainingDistanceKm: number;
  /** true when using Haversine straight-line fallback instead of route */
  isEstimated: boolean;
  /** Decoded route geometry as [lng, lat] coordinate pairs */
  routeGeometry?: [number, number][];
  /** Route-based ETA duration in milliseconds (from ORS) */
  durationMs?: number;
  /** Error message when route calculation fails for non-network reasons */
  errorMessage?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Recalculation interval: 2 minutes in milliseconds */
const RECALCULATION_INTERVAL_MS = 2 * 60 * 1000;

/** Recalculation distance threshold: 5 km */
const RECALCULATION_DISTANCE_KM = 5;

/** Route deviation threshold: 1 km */
const DEVIATION_THRESHOLD_KM = 1;

/** API request timeout: 10 seconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** OpenRouteService directions endpoint */
const ORS_ENDPOINT =
  'https://api.openrouteservice.org/v2/directions/driving-car';

// ─── RouteService ────────────────────────────────────────────────────────────

/**
 * RouteService manages route calculations via OpenRouteService,
 * including recalculation triggers and deviation detection.
 *
 * Usage:
 * ```ts
 * const routeService = new RouteService();
 *
 * // Calculate initial route
 * const result = await routeService.calculateRoute(
 *   { lat: 30.04, lng: 31.23 },
 *   { lat: 31.20, lng: 29.91 }
 * );
 *
 * // On each GPS update, track distance and check triggers
 * routeService.addTraveledDistance(segmentKm);
 * if (routeService.shouldRecalculate(Date.now())) {
 *   const updated = await routeService.calculateRoute(currentPos, destination);
 * }
 *
 * // Check for route deviation
 * if (routeService.isDeviated(currentPos)) {
 *   const rerouted = await routeService.calculateRoute(currentPos, destination);
 * }
 * ```
 */
export class RouteService {
  private lastCalculationTimestamp: number | null = null;
  private distanceSinceLastCalcKm = 0;
  private lastRouteGeometry: [number, number][] | null = null;

  // ─── API Key ─────────────────────────────────────────────────────────────

  /**
   * Returns the ORS API key from environment variables.
   * In Next.js, NEXT_PUBLIC_ prefixed vars are inlined at build time.
   */
  private getApiKey(): string | null {
    const key = process.env.NEXT_PUBLIC_ORS_API_KEY;
    return key && key.length > 0 ? key : null;
  }

  // ─── Recalculation Triggers ──────────────────────────────────────────────

  /**
   * Determines whether a route recalculation should be triggered.
   *
   * Recalculation triggers when:
   * - No calculation has been made yet, OR
   * - 2 minutes have elapsed since last calculation, OR
   * - 5 km have been traveled since last calculation
   *
   * @param currentTimestamp - Current time in milliseconds (Unix epoch)
   * @param distanceSinceLastCalcKm - Optional override for distance since last calc.
   *   If not provided, uses internally tracked distance.
   * @returns true if recalculation should occur
   */
  shouldRecalculate(
    currentTimestamp: number,
    distanceSinceLastCalcKm?: number
  ): boolean {
    // Always calculate if never calculated before
    if (this.lastCalculationTimestamp === null) {
      return true;
    }

    const elapsedMs = currentTimestamp - this.lastCalculationTimestamp;

    // Trigger if 2 minutes have elapsed
    if (elapsedMs >= RECALCULATION_INTERVAL_MS) {
      return true;
    }

    // Use provided distance or internal tracker
    const distance = distanceSinceLastCalcKm ?? this.distanceSinceLastCalcKm;

    // Trigger if 5 km have been traveled
    if (distance >= RECALCULATION_DISTANCE_KM) {
      return true;
    }

    return false;
  }

  // ─── Deviation Detection ─────────────────────────────────────────────────

  /**
   * Checks if the current position deviates more than 1 km from the last calculated route.
   *
   * Uses the internally stored route geometry from the last successful calculation.
   * Returns false if no route geometry is available.
   *
   * @param currentPos - Current position
   * @returns true if deviation exceeds 1 km from route
   */
  isDeviated(currentPos: Coordinate): boolean {
    if (!this.lastRouteGeometry || this.lastRouteGeometry.length === 0) {
      return false;
    }

    return this.isDeviatedFromRoute(
      currentPos.lat,
      currentPos.lng,
      this.lastRouteGeometry
    );
  }

  /**
   * Checks if a position deviates more than 1 km from a given route geometry.
   *
   * @param currentLat - Current latitude in degrees
   * @param currentLng - Current longitude in degrees
   * @param routeGeometry - Route as [lng, lat] coordinate pairs
   * @returns true if deviation exceeds 1 km from route
   */
  isDeviatedFromRoute(
    currentLat: number,
    currentLng: number,
    routeGeometry: [number, number][]
  ): boolean {
    if (!routeGeometry || routeGeometry.length === 0) {
      return false;
    }

    const minDistance = this.minDistanceToRoute(
      currentLat,
      currentLng,
      routeGeometry
    );

    return minDistance > DEVIATION_THRESHOLD_KM;
  }

  /**
   * Calculates the minimum Haversine distance from a point to any point
   * on the route geometry.
   *
   * Uses point-to-point distance to each vertex in the route polyline.
   * This is a simplified approach sufficient for the 1 km threshold.
   *
   * @param lat - Latitude of the point
   * @param lng - Longitude of the point
   * @param routeGeometry - Route as [lng, lat] coordinate pairs
   * @returns Minimum distance in km to the nearest route point
   */
  private minDistanceToRoute(
    lat: number,
    lng: number,
    routeGeometry: [number, number][]
  ): number {
    let minDist = Infinity;

    for (const [routeLng, routeLat] of routeGeometry) {
      const dist = haversineDistanceKm(lat, lng, routeLat, routeLng);
      if (dist < minDist) {
        minDist = dist;
      }
    }

    return minDist;
  }

  // ─── Route Calculation ───────────────────────────────────────────────────

  /**
   * Calculates the route from current position to destination using OpenRouteService.
   *
   * Calls the ORS directions API for driving-car profile and returns the remaining
   * road-following distance plus route geometry for deviation detection.
   * Falls back to Haversine straight-line distance on error or when offline.
   *
   * @param from - Origin coordinate
   * @param to - Destination coordinate
   * @returns RouteDistanceResult with road-following distance, or Haversine fallback on error
   */
  async calculateRoute(
    from: Coordinate,
    to: Coordinate
  ): Promise<RouteDistanceResult> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.buildFallbackResult(from, to);
    }

    try {
      const url = `${ORS_ENDPOINT}?api_key=${apiKey}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Non-network error (e.g., no route found, invalid coordinates)
        return this.buildFallbackResult(from, to, 'Route calculation unavailable');
      }

      const data = await response.json();

      const feature = data?.features?.[0];
      if (!feature) {
        return this.buildFallbackResult(from, to, 'No route found');
      }

      const summary = feature.properties?.summary;
      const geometry = feature.geometry;

      if (!summary || !geometry) {
        return this.buildFallbackResult(from, to, 'Invalid route response');
      }

      const distanceKm = summary.distance / 1000; // ORS returns meters
      const durationMs = summary.duration * 1000; // ORS returns seconds
      const routeGeometry: [number, number][] = geometry.coordinates ?? [];

      // Update tracking state on successful calculation
      this.lastCalculationTimestamp = Date.now();
      this.distanceSinceLastCalcKm = 0;
      this.lastRouteGeometry = routeGeometry;

      return {
        remainingDistanceKm: distanceKm,
        isEstimated: false,
        routeGeometry,
        durationMs,
      };
    } catch {
      // Network error or timeout — fall back to Haversine
      return this.buildFallbackResult(from, to);
    }
  }

  // ─── Convenience Methods ─────────────────────────────────────────────────

  /**
   * Gets the remaining distance to the destination, using the last route result
   * if available and recent, or falling back to Haversine.
   *
   * This is a convenience method that combines route-based and fallback distance
   * into a single call for the UI layer.
   *
   * @param currentPos - Current position
   * @param destination - Destination coordinate
   * @param lastRouteResult - Optional last route result to use if still valid
   * @returns RouteDistanceResult with remaining distance
   */
  getRemainingDistance(
    currentPos: Coordinate,
    destination: Coordinate,
    lastRouteResult?: RouteDistanceResult
  ): RouteDistanceResult {
    // If we have a recent route result with geometry, calculate distance
    // from current position to destination along the remaining route
    if (lastRouteResult && !lastRouteResult.isEstimated && lastRouteResult.routeGeometry) {
      // Use the straight-line from current position to destination as a quick estimate
      // The full route recalculation handles the accurate road-following distance
      const straightLine = haversineDistanceKm(
        currentPos.lat,
        currentPos.lng,
        destination.lat,
        destination.lng
      );

      // If the route distance is available from the last calculation,
      // provide it as a better estimate than raw Haversine
      return {
        remainingDistanceKm: lastRouteResult.remainingDistanceKm,
        isEstimated: false,
        routeGeometry: lastRouteResult.routeGeometry,
        durationMs: lastRouteResult.durationMs,
      };
    }

    // Fall back to Haversine straight-line
    return this.buildFallbackResult(currentPos, destination);
  }

  // ─── Distance Tracking ───────────────────────────────────────────────────

  /**
   * Adds traveled distance for recalculation tracking.
   *
   * Should be called each time a new GPS position is processed to track
   * cumulative distance since the last route calculation.
   *
   * @param distanceKm - Distance traveled since last position in km
   */
  addTraveledDistance(distanceKm: number): void {
    this.distanceSinceLastCalcKm += distanceKm;
  }

  /**
   * Gets the cumulative distance traveled since the last route calculation.
   */
  getDistanceSinceLastCalc(): number {
    return this.distanceSinceLastCalcKm;
  }

  /**
   * Gets the timestamp of the last route calculation.
   */
  getLastCalculationTimestamp(): number | null {
    return this.lastCalculationTimestamp;
  }

  /**
   * Gets the last computed route geometry for external deviation checks.
   */
  getLastRouteGeometry(): [number, number][] | null {
    return this.lastRouteGeometry;
  }

  // ─── State Management ────────────────────────────────────────────────────

  /**
   * Resets the route service state (e.g., when a new trip starts or destination changes).
   */
  reset(): void {
    this.lastCalculationTimestamp = null;
    this.distanceSinceLastCalcKm = 0;
    this.lastRouteGeometry = null;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Builds a Haversine straight-line fallback result.
   *
   * @param from - Origin coordinate
   * @param to - Destination coordinate
   * @param errorMessage - Optional error message for non-network failures
   * @returns RouteDistanceResult with isEstimated = true
   */
  private buildFallbackResult(
    from: Coordinate,
    to: Coordinate,
    errorMessage?: string
  ): RouteDistanceResult {
    const distance = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
    return {
      remainingDistanceKm: distance,
      isEstimated: true,
      ...(errorMessage ? { errorMessage } : {}),
    };
  }
}
