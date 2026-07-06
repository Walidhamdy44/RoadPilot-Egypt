/**
 * Core Trip Engine for RoadPilot Egypt.
 *
 * Implements the TripEngine interface responsible for:
 * - Starting and ending trips with timestamp persistence
 * - Processing GPS positions: Haversine distance accumulation, speed tracking
 * - Persisting cumulative distance every 100m of travel
 * - Calculating average speed and ETA
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 7.1, 7.3, 7.4**
 */

import type { ValidatedPosition } from '@/features/gps/domain/gps-types';
import { haversineDistanceKm } from '@/features/gps/domain/haversine';
import type {
  TripState,
  CompletedTrip,
  GPSTracePoint,
} from './trip-types';
import { getDB } from '@/lib/idb/index';
import { createTraceBuffer, type TraceBuffer } from './trace-buffer';

/** Maximum GPS accuracy in meters for distance accumulation. */
const MAX_ACCURACY_FOR_DISTANCE = 50;

/** Distance threshold in km for persisting to IndexedDB (100m = 0.1 km). */
const PERSIST_DISTANCE_THRESHOLD_KM = 0.1;

/** Minimum interval between IndexedDB checkpoint writes (3 seconds). */
const CHECKPOINT_DEBOUNCE_MS = 3000;

/**
 * TripEngine interface defining the core trip calculation methods.
 */
export interface TripEngine {
  startTrip(): Promise<TripState>;
  endTrip(state: TripState): CompletedTrip;
  processPosition(state: TripState, position: ValidatedPosition): TripState;
  calculateAverageSpeed(distanceKm: number, drivingTimeMs: number): number;
  calculateETA(remainingKm: number, avgSpeedKmh: number): number | null;
}

/**
 * Creates and returns a TripEngine implementation.
 *
 * The engine uses IndexedDB for persisting trip start timestamps and
 * cumulative distance checkpoints. Distance accumulation uses the Haversine
 * formula and discards positions with accuracy > 50m.
 */
export function createTripEngine(): TripEngine {
  /** Tracks the last distance checkpoint for 100m persistence trigger. */
  let lastPersistedDistanceKm = 0;

  /** Tracks the last position for distance calculation. */
  let lastPosition: ValidatedPosition | null = null;

  /** Trace buffer for GPS point thinning during long trips. */
  let traceBuffer: TraceBuffer | null = null;

  return {
    /**
     * Starts a new trip.
     * - Generates a unique ID
     * - Records the start timestamp to IndexedDB immediately
     * - Initializes all trip state values
     */
    async startTrip(): Promise<TripState> {
      const id = crypto.randomUUID();
      const startTimestamp = Date.now();

      // Persist start timestamp to IndexedDB immediately (Req 7.1)
      const db = await getDB();
      await db.put('activeTrip', {
        tripId: id,
        startTimestamp,
        totalDistanceKm: 0,
        drivingTimeMs: 0,
        stopTimeMs: 0,
        maxSpeedKmh: 0,
        maxSpeedTimestamp: null,
        maxSpeedCoordinates: null,
        lastPosition: null,
        gpsTrace: [],
        stopEvents: [],
        lastCheckpoint: startTimestamp,
      }, 'current');

      // Reset internal tracking state
      lastPersistedDistanceKm = 0;
      lastPosition = null;

      // Initialize trace buffer for memory-efficient GPS trace storage
      traceBuffer = createTraceBuffer({ tripId: id });

      const tripState: TripState = {
        id,
        status: 'active',
        startTimestamp,
        endTimestamp: null,
        totalDistanceKm: 0,
        drivingTimeMs: 0,
        stopTimeMs: 0,
        averageSpeedKmh: 0,
        maxSpeedKmh: 0,
        maxSpeedTimestamp: null,
        maxSpeedCoordinates: null,
        currentSpeedKmh: 0,
        gpsTrace: [],
        stopEvents: [],
        destination: null,
        remainingDistanceKm: null,
        etaTimestamp: null,
      };

      return tripState;
    },

    /**
     * Ends an active trip.
     * - Finalizes the end timestamp
     * - Calculates final average speed
     * - Returns a CompletedTrip record ready for persistence
     */
    endTrip(state: TripState): CompletedTrip {
      const endTimestamp = Date.now();
      const finalAvgSpeed = calculateAverageSpeed(
        state.totalDistanceKm,
        state.drivingTimeMs
      );

      // Determine start/end coordinates from GPS trace
      const startCoordinates =
        state.gpsTrace.length > 0
          ? { lat: state.gpsTrace[0].lat, lng: state.gpsTrace[0].lng }
          : { lat: 0, lng: 0 };

      const endCoordinates =
        state.gpsTrace.length > 0
          ? {
              lat: state.gpsTrace[state.gpsTrace.length - 1].lat,
              lng: state.gpsTrace[state.gpsTrace.length - 1].lng,
            }
          : { lat: 0, lng: 0 };

      const completedTrip: CompletedTrip = {
        id: state.id,
        startTimestamp: state.startTimestamp,
        endTimestamp,
        totalDistanceKm: state.totalDistanceKm,
        drivingTimeMs: state.drivingTimeMs,
        stopTimeMs: state.stopTimeMs,
        averageSpeedKmh: finalAvgSpeed,
        maxSpeedKmh: state.maxSpeedKmh,
        maxSpeedTimestamp: state.maxSpeedTimestamp,
        maxSpeedCoordinates: state.maxSpeedCoordinates,
        numberOfStops: state.stopEvents.length,
        startLocationName: null,
        endLocationName: null,
        startCoordinates,
        endCoordinates,
        gpsTrace: state.gpsTrace,
        stopEvents: state.stopEvents,
      };

      // Clean up internal state
      lastPosition = null;
      lastPersistedDistanceKm = 0;

      // Flush remaining trace buffer data to IndexedDB
      if (traceBuffer) {
        void traceBuffer.dispose();
        traceBuffer = null;
      }

      return completedTrip;
    },

    /**
     * Processes a new GPS position during an active trip.
     *
     * - Discards position for distance if accuracy > 50m (Req 5.2)
     * - Calculates Haversine distance from previous position (Req 5.1)
     * - Accumulates distance and updates current speed
     * - Adds GPS trace point for each valid position
     * - Persists distance to IndexedDB every 100m of travel (Req 5.4)
     */
    processPosition(state: TripState, position: ValidatedPosition): TripState {
      const newState = { ...state };

      // Update current speed from the validated position
      newState.currentSpeedKmh = position.speedKmh;

      // Add GPS trace point via trace buffer for memory efficiency
      const tracePoint: GPSTracePoint = {
        lat: position.latitude,
        lng: position.longitude,
        speedKmh: position.speedKmh,
        timestamp: position.timestamp,
      };

      if (traceBuffer) {
        traceBuffer.push(tracePoint);
        // Only keep the display window in the state (last 1000 points)
        newState.gpsTrace = traceBuffer.getDisplayPoints();
      } else {
        // Fallback: direct append if no buffer (shouldn't happen in normal flow)
        newState.gpsTrace = [...state.gpsTrace, tracePoint];
      }

      // Only accumulate distance if accuracy is acceptable (≤ 50m)
      if (position.accuracy <= MAX_ACCURACY_FOR_DISTANCE && lastPosition !== null) {
        // Also check that the previous position had acceptable accuracy
        if (lastPosition.accuracy <= MAX_ACCURACY_FOR_DISTANCE) {
          const distanceKm = haversineDistanceKm(
            lastPosition.latitude,
            lastPosition.longitude,
            position.latitude,
            position.longitude
          );
          newState.totalDistanceKm = state.totalDistanceKm + distanceKm;

          // Persist to IndexedDB every 100m of travel (Req 5.4)
          const distanceSinceLastPersist =
            newState.totalDistanceKm - lastPersistedDistanceKm;
          if (distanceSinceLastPersist >= PERSIST_DISTANCE_THRESHOLD_KM) {
            lastPersistedDistanceKm = newState.totalDistanceKm;
            // Debounced persistence to avoid excessive IndexedDB writes
            schedulePersistCheckpoint(state.id, newState.totalDistanceKm, position);
          }
        }
      }

      // Update last position regardless of accuracy for next calculation
      lastPosition = position;

      return newState;
    },

    calculateAverageSpeed,
    calculateETA,
  };
}

/**
 * Calculates average speed from distance and driving time.
 *
 * @param distanceKm - Total distance in kilometers
 * @param drivingTimeMs - Total driving time in milliseconds
 * @returns Average speed in km/h, capped at 999.9
 */
export function calculateAverageSpeed(
  distanceKm: number,
  drivingTimeMs: number
): number {
  if (drivingTimeMs <= 0) return 0;
  const drivingTimeHours = drivingTimeMs / 3_600_000;
  const avgSpeed = distanceKm / drivingTimeHours;
  return Math.min(avgSpeed, 999.9);
}

/**
 * Calculates Estimated Time of Arrival.
 *
 * Returns the number of milliseconds from now until arrival, or null
 * if the average speed is below 5 km/h (unreliable estimate).
 *
 * @param remainingKm - Remaining distance in kilometers
 * @param avgSpeedKmh - Current average speed in km/h
 * @returns ETA as milliseconds until arrival, or null if speed < 5 km/h
 */
export function calculateETA(
  remainingKm: number,
  avgSpeedKmh: number
): number | null {
  if (avgSpeedKmh < 5) return null;
  const remainingHours = remainingKm / avgSpeedKmh;
  const remainingMs = remainingHours * 3_600_000;
  return remainingMs;
}

/**
 * Persists the cumulative distance checkpoint to IndexedDB.
 * Debounced to avoid excessive writes — batches rapid distance increments
 * into a single write every CHECKPOINT_DEBOUNCE_MS.
 *
 * @param tripId - The trip ID
 * @param totalDistanceKm - Current total distance
 * @param position - The latest validated position
 */
let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCheckpoint: {
  tripId: string;
  totalDistanceKm: number;
  position: ValidatedPosition;
} | null = null;

function schedulePersistCheckpoint(
  tripId: string,
  totalDistanceKm: number,
  position: ValidatedPosition
): void {
  // Always update the pending data so the latest values are persisted
  pendingCheckpoint = { tripId, totalDistanceKm, position };

  // If a timer is already scheduled, just update the pending data
  if (checkpointTimer !== null) return;

  checkpointTimer = setTimeout(() => {
    checkpointTimer = null;
    if (pendingCheckpoint) {
      const { tripId: id, totalDistanceKm: dist, position: pos } = pendingCheckpoint;
      pendingCheckpoint = null;
      void persistDistanceCheckpoint(id, dist, pos);
    }
  }, CHECKPOINT_DEBOUNCE_MS);
}

async function persistDistanceCheckpoint(
  tripId: string,
  totalDistanceKm: number,
  position: ValidatedPosition
): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('activeTrip', 'current');
    if (existing && existing.tripId === tripId) {
      await db.put(
        'activeTrip',
        {
          ...existing,
          totalDistanceKm,
          lastPosition: position,
          lastCheckpoint: Date.now(),
        },
        'current'
      );
    }
  } catch {
    // Silently fail - next checkpoint will persist
    // The trip engine continues operating regardless of persistence failures
  }
}

/**
 * Retrieves the elapsed time for an active trip.
 *
 * Elapsed time is calculated as the difference between the current device time
 * and the persisted trip start timestamp. This ensures accurate tracking
 * regardless of foreground/background state (Req 7.3).
 *
 * @param startTimestamp - The trip start timestamp (Unix epoch ms)
 * @returns Elapsed time in milliseconds
 */
export function getElapsedTimeMs(startTimestamp: number): number {
  return Date.now() - startTimestamp;
}
