/**
 * Geolocation API adapter — a thin wrapper around navigator.geolocation.
 *
 * This module isolates browser API access so the GPS service can be tested
 * with a mock adapter injected via dependency injection.
 */

import type { GPSPosition } from '../domain/gps-types';

/** Callback invoked when a raw GPS position is received. */
export type PositionCallback = (position: GPSPosition) => void;

/** Callback invoked when a geolocation error occurs. */
export type ErrorCallback = (error: GeolocationPositionError) => void;

/** Options used by the geolocation adapter. */
export interface GeolocationAdapterOptions {
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
}

/** Default geolocation options per design spec. */
const DEFAULT_OPTIONS: GeolocationAdapterOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 5000,
};

/**
 * Interface for the geolocation adapter, allowing test mocks.
 */
export interface GeolocationAdapter {
  /** Start watching position. Returns a cleanup function. */
  watchPosition(
    onPosition: PositionCallback,
    onError: ErrorCallback,
    options?: Partial<GeolocationAdapterOptions>
  ): () => void;
}

/**
 * Extracts a GPSPosition from the browser's GeolocationPosition object.
 */
function extractRawPosition(geoPosition: GeolocationPosition): GPSPosition {
  const { coords, timestamp } = geoPosition;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    speed: coords.speed,
    heading: coords.heading,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    timestamp,
  };
}

/**
 * Creates a geolocation adapter wrapping navigator.geolocation.watchPosition.
 *
 * @returns GeolocationAdapter instance
 */
export function createGeolocationAdapter(): GeolocationAdapter {
  return {
    watchPosition(
      onPosition: PositionCallback,
      onError: ErrorCallback,
      options?: Partial<GeolocationAdapterOptions>
    ): () => void {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      const watchId = navigator.geolocation.watchPosition(
        (geoPosition: GeolocationPosition) => {
          const raw = extractRawPosition(geoPosition);
          onPosition(raw);
        },
        (error: GeolocationPositionError) => {
          onError(error);
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          maximumAge: mergedOptions.maximumAge,
          timeout: mergedOptions.timeout,
        }
      );

      // Return cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    },
  };
}
