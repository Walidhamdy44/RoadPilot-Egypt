/**
 * GPS Service — core business logic for GPS acquisition and validation.
 *
 * Responsibilities:
 * - Validate raw GPS positions via Zod schema
 * - Convert speed from m/s to km/h (×3.6)
 * - Clamp speeds below 2 km/h to 0.0
 * - Calculate fallback speed from position delta when GPS speed is null
 * - Track consecutive failures and set signal status to 'lost' after 3
 * - Clear stale data after 5 minutes with no valid position
 *
 * @module gps-service
 */

import type { GPSPosition, ValidatedPosition, GPSServiceState } from './gps-types';
import type { GeolocationAdapter } from '../infrastructure/geolocation-adapter';
import { gpsPositionSchema } from './gps-validator';
import { haversineDistanceKm } from './haversine';

/** Error types emitted by the GPS service. */
export interface GPSError {
  type: 'signal_lost' | 'permission_denied' | 'position_unavailable' | 'timeout';
  lastValid: ValidatedPosition | null;
}

/** Threshold below which speed is clamped to 0.0 km/h. */
const SPEED_CLAMP_THRESHOLD_KMH = 2;

/** Number of consecutive failures before signal is considered lost. */
const MAX_CONSECUTIVE_FAILURES = 3;

/** Stale data timeout in milliseconds (5 minutes). */
const STALE_DATA_TIMEOUT_MS = 300_000;

/**
 * Converts speed from m/s to km/h.
 *
 * @param speedMs - Speed in meters per second
 * @returns Speed in km/h
 */
export function convertSpeedToKmh(speedMs: number): number {
  return speedMs * 3.6;
}

/**
 * Clamps a speed value to 0.0 if it is below the 2 km/h threshold.
 *
 * @param speedKmh - Speed in km/h
 * @returns Clamped speed (0.0 if below threshold, original value otherwise)
 */
export function clampSpeed(speedKmh: number): number {
  return speedKmh < SPEED_CLAMP_THRESHOLD_KMH ? 0.0 : speedKmh;
}

/**
 * Calculates speed in km/h from the position delta between two points.
 * Used as a fallback when the GPS does not provide a speed value.
 *
 * @param prev - Previous validated position
 * @param curr - Current position (needs at least lat, lng, timestamp)
 * @returns Speed in km/h (non-negative), or 0 if time delta is zero or negative
 */
export function calculateSpeedKmh(
  prev: ValidatedPosition,
  curr: { latitude: number; longitude: number; timestamp: number }
): number {
  const timeDeltaMs = curr.timestamp - prev.timestamp;
  if (timeDeltaMs <= 0) return 0;

  const distanceKm = haversineDistanceKm(
    prev.latitude,
    prev.longitude,
    curr.latitude,
    curr.longitude
  );

  const timeHours = timeDeltaMs / 3_600_000;
  return distanceKm / timeHours;
}

/** Callbacks provided by the consumer of the GPS service. */
export interface GPSServiceCallbacks {
  onPosition: (position: ValidatedPosition) => void;
  onError: (error: GPSError) => void;
  onStateChange: (state: GPSServiceState) => void;
}

/**
 * GPS Service implementation.
 *
 * Wraps the geolocation adapter and applies the validation pipeline:
 * raw position → Zod validation → speed conversion → clamping → emit.
 */
export class GPSService {
  private cleanup: (() => void) | null = null;
  private lastPosition: ValidatedPosition | null = null;
  private consecutiveFailures = 0;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private state: GPSServiceState = {
    currentPosition: null,
    lastValidPosition: null,
    signalStatus: 'acquiring',
    consecutiveFailures: 0,
  };

  constructor(private readonly adapter: GeolocationAdapter) {}

  /**
   * Returns the current GPS service state.
   */
  getState(): GPSServiceState {
    return { ...this.state };
  }

  /**
   * Starts the GPS acquisition pipeline.
   *
   * @param callbacks - Handlers for position updates, errors, and state changes
   */
  start(callbacks: GPSServiceCallbacks): void {
    if (this.cleanup) {
      // Already running
      return;
    }

    this.cleanup = this.adapter.watchPosition(
      (rawPosition: GPSPosition) => {
        this.handlePosition(rawPosition, callbacks);
      },
      (error: GeolocationPositionError) => {
        this.handleError(error, callbacks);
      }
    );
  }

  /**
   * Stops the GPS acquisition pipeline and clears all timers.
   */
  stop(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.clearStaleTimer();
  }

  /**
   * Resets the service to its initial state.
   */
  reset(): void {
    this.stop();
    this.lastPosition = null;
    this.consecutiveFailures = 0;
    this.state = {
      currentPosition: null,
      lastValidPosition: null,
      signalStatus: 'acquiring',
      consecutiveFailures: 0,
    };
  }

  /**
   * Handles a raw GPS position from the adapter.
   */
  private handlePosition(raw: GPSPosition, callbacks: GPSServiceCallbacks): void {
    // Validate against Zod schema
    const validation = gpsPositionSchema.safeParse(raw);
    if (!validation.success) {
      // Discard invalid position, keep last valid
      return;
    }

    const validRaw = validation.data;

    // Normalize: convert speed and apply clamping
    const validated = this.normalize(validRaw);

    // Reset failure counter on successful position
    this.consecutiveFailures = 0;

    // Update state
    this.lastPosition = validated;
    this.state = {
      currentPosition: validated,
      lastValidPosition: validated,
      signalStatus: 'active',
      consecutiveFailures: 0,
    };

    // Reset stale data timer
    this.resetStaleTimer(callbacks);

    // Emit
    callbacks.onPosition(validated);
    callbacks.onStateChange(this.state);
  }

  /**
   * Normalizes a validated raw GPS position:
   * - Converts speed from m/s to km/h
   * - Applies fallback speed calculation if speed is null
   * - Clamps speed below 2 km/h to 0.0
   */
  private normalize(raw: GPSPosition): ValidatedPosition {
    let speedKmh: number;

    if (raw.speed !== null && raw.speed !== undefined) {
      // Convert m/s → km/h
      speedKmh = convertSpeedToKmh(raw.speed);
    } else if (this.lastPosition) {
      // Fallback: calculate from position delta
      speedKmh = calculateSpeedKmh(this.lastPosition, {
        latitude: raw.latitude,
        longitude: raw.longitude,
        timestamp: raw.timestamp,
      });
    } else {
      // No previous position, cannot calculate
      speedKmh = 0;
    }

    // Clamp below-2-km/h to 0.0
    speedKmh = clampSpeed(speedKmh);

    return {
      latitude: raw.latitude,
      longitude: raw.longitude,
      speedKmh,
      heading: raw.heading,
      accuracy: raw.accuracy,
      timestamp: raw.timestamp,
    };
  }

  /**
   * Handles a geolocation error from the adapter.
   */
  private handleError(
    error: GeolocationPositionError,
    callbacks: GPSServiceCallbacks
  ): void {
    this.consecutiveFailures++;
    this.state = {
      ...this.state,
      consecutiveFailures: this.consecutiveFailures,
    };

    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.state = {
        ...this.state,
        signalStatus: 'lost',
      };
      callbacks.onError({
        type: 'signal_lost',
        lastValid: this.lastPosition,
      });
    }

    // Map specific geolocation error codes
    if (error.code === error.PERMISSION_DENIED) {
      this.state = {
        ...this.state,
        signalStatus: 'denied',
      };
      callbacks.onError({
        type: 'permission_denied',
        lastValid: this.lastPosition,
      });
    }

    callbacks.onStateChange(this.state);
  }

  /**
   * Resets the 5-minute stale data timer.
   * If no valid position is received within 5 minutes, clears position data.
   */
  private resetStaleTimer(callbacks: GPSServiceCallbacks): void {
    this.clearStaleTimer();

    this.staleTimer = setTimeout(() => {
      // 5 minutes elapsed with no new valid position
      this.state = {
        currentPosition: null,
        lastValidPosition: this.lastPosition,
        signalStatus: 'lost',
        consecutiveFailures: this.consecutiveFailures,
      };
      this.lastPosition = null;
      callbacks.onStateChange(this.state);
      callbacks.onError({
        type: 'signal_lost',
        lastValid: this.state.lastValidPosition,
      });
    }, STALE_DATA_TIMEOUT_MS);
  }

  /**
   * Clears the stale data timer if running.
   */
  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }
}

/**
 * Factory function to create a GPS service instance.
 *
 * @param adapter - Geolocation adapter to use for position acquisition
 * @returns GPS service instance
 */
export function createGPSService(adapter: GeolocationAdapter): GPSService {
  return new GPSService(adapter);
}
