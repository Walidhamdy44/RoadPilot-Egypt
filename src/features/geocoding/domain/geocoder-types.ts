/**
 * Types for the reverse geocoding feature.
 */

/** Supported UI languages. */
export type Language = 'ar' | 'en';

/** Result of a reverse geocoding operation. */
export interface GeocodeResult {
  /** Resolved road name (truncated to 60 chars max), or null if unknown. */
  roadName: string | null;
  /** Display text for the UI. */
  displayText: string;
  /** Whether the result came from cache (offline fallback). */
  cached: boolean;
}

/** Raw Nominatim reverse geocode API response (relevant fields). */
export interface NominatimResponse {
  address?: {
    road?: string;
    highway?: string;
    pedestrian?: string;
    path?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  display_name?: string;
}

/** Cached geocode entry stored in IndexedDB. */
export interface GeocodeCacheEntry {
  roadName: string | null;
  localityName: string | null;
  timestamp: number;
  coordinates: { lat: number; lng: number };
}

/** Maximum characters allowed for a road name display. */
export const MAX_ROAD_NAME_LENGTH = 60;
