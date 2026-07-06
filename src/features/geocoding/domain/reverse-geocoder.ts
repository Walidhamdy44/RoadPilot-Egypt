/**
 * Reverse Geocoder service.
 *
 * Coordinates the throttle controller, Nominatim client, and geocode cache
 * to resolve GPS coordinates into road names with:
 * - Throttling (max 1 request per 3 seconds)
 * - Offline fallback (returns cached result with "cached" indicator)
 * - No-result handling ("Unknown Road" with coordinates)
 * - Bilingual support (Arabic/English based on user preference)
 * - Road name truncation (60 char max)
 */

import type { GeocodeResult, Language } from './geocoder-types';
import {
  createThrottleState,
  shouldRequest,
  type ThrottleState,
} from './throttle-controller';
import { truncateRoadName, buildUnknownRoadText } from './road-name-utils';
import { reverseGeocode } from '../infrastructure/nominatim-client';
import { getCachedGeocode, setCachedGeocode } from '../infrastructure/geocode-cache';

/**
 * Stateful reverse geocoder managing throttle state internally.
 */
export class ReverseGeocoderService {
  private throttleState: ThrottleState;

  constructor() {
    this.throttleState = createThrottleState();
  }

  /**
   * Attempts to resolve a road name for the given coordinates.
   *
   * Returns null if the request is throttled (intermediate position discarded).
   * Otherwise returns a GeocodeResult.
   *
   * @param lat - Latitude in decimal degrees
   * @param lng - Longitude in decimal degrees
   * @param language - User's preferred language
   * @param timestamp - Current timestamp (epoch ms)
   * @returns GeocodeResult or null if throttled
   */
  async resolve(
    lat: number,
    lng: number,
    language: Language,
    timestamp: number = Date.now()
  ): Promise<GeocodeResult | null> {
    // Check throttle
    const { allowed, nextState } = shouldRequest(this.throttleState, timestamp);
    this.throttleState = nextState;

    if (!allowed) {
      return null; // Position discarded
    }

    // Try the network request
    try {
      const result = await reverseGeocode(lat, lng, language);

      // Cache the result
      await setCachedGeocode(
        lat,
        lng,
        result.roadName,
        result.roadName ? null : null
      ).catch(() => {
        // Cache write failure is non-critical
      });

      return result;
    } catch {
      // Network failure — try cache fallback
      return this.getOfflineFallback(lat, lng);
    }
  }

  /**
   * Returns a cached result with "cached" indicator, or "Unknown Road" if no cache exists.
   */
  private async getOfflineFallback(
    lat: number,
    lng: number
  ): Promise<GeocodeResult> {
    try {
      const cached = await getCachedGeocode(lat, lng);

      if (cached && (cached.roadName || cached.localityName)) {
        const name = cached.roadName ?? cached.localityName!;
        const truncated = truncateRoadName(name);
        return {
          roadName: truncated,
          displayText: truncated,
          cached: true,
        };
      }
    } catch {
      // Cache read failure — fall through to unknown
    }

    // No cache available
    return {
      roadName: null,
      displayText: buildUnknownRoadText(lat, lng),
      cached: true,
    };
  }

  /**
   * Resets the throttle state. Useful for testing.
   */
  reset(): void {
    this.throttleState = createThrottleState();
  }
}
