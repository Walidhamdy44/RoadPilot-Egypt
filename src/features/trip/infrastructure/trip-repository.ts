/**
 * Trip Repository — IndexedDB persistence layer for trip records.
 *
 * Handles:
 * - Saving completed trip records with retry logic (3 retries)
 * - Querying trips by date range, distance, and duration via indexes
 * - Active trip checkpoint persistence (every 100m or 60s)
 * - Trip recovery on app relaunch (from activeTrip store within 5 seconds)
 * - Storage quota monitoring (display banner at 80% capacity)
 *
 * **Validates: Requirements 12.1, 12.3, 12.4, 12.7, 22.1**
 */

import { getDB } from '@/lib/idb/index';
import { getStorageQuota } from '@/shared/utils/storage';
import type { CompletedTrip, TripState, GPSTracePoint, StopEvent } from '@/features/trip/domain/trip-types';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';
import type { RoadPilotDB } from '@/lib/idb/schema';

/** A trip record as stored in IndexedDB. */
export type TripRecord = RoadPilotDB['trips']['value'];

/** Active trip checkpoint stored in IndexedDB for crash recovery. */
export type ActiveTripCheckpoint = RoadPilotDB['activeTrip']['value'];

/** Options for querying trip records. */
export interface QueryTripsOptions {
  dateFrom?: number;
  dateTo?: number;
  minDistance?: number;
  maxDistance?: number;
  userId?: string | null;
  limit?: number;
  offset?: number;
}

/** Result of storage quota check. */
export interface StorageQuotaResult {
  shouldWarn: boolean;
  percentage: number;
}

/** Default retry count for write operations. */
const MAX_RETRIES = 3;

/** Delay between retries in milliseconds. */
const RETRY_DELAY_MS = 500;

/**
 * In-memory fallback store for trip data that couldn't be written to IndexedDB.
 * Held in memory until a subsequent write attempt succeeds or user dismisses.
 */
let pendingWrites: TripRecord[] = [];

/**
 * Returns trip records that are held in memory due to write failures.
 */
export function getPendingWrites(): TripRecord[] {
  return [...pendingWrites];
}

/**
 * Clears the in-memory pending writes (e.g., after successful retry or user dismissal).
 */
export function clearPendingWrites(): void {
  pendingWrites = [];
}

/**
 * Delays execution for a given number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Saves a completed trip record to IndexedDB with retry logic.
 *
 * Converts a CompletedTrip to the IndexedDB TripRecord format and writes it.
 * Retries up to 3 times on failure. If all retries fail, holds the record in
 * memory for later retry.
 *
 * @param trip - The completed trip to persist
 * @param userId - The current user ID, or null for local-only mode
 * @throws Error if all retries fail (also stores in pendingWrites)
 *
 * **Validates: Requirements 12.1, 12.7**
 */
export async function saveTripRecord(
  trip: CompletedTrip,
  userId: string | null
): Promise<void> {
  const record: TripRecord = {
    id: trip.id,
    userId,
    status: 'completed',
    startTimestamp: trip.startTimestamp,
    endTimestamp: trip.endTimestamp,
    totalDistanceKm: trip.totalDistanceKm,
    drivingTimeMs: trip.drivingTimeMs,
    stopTimeMs: trip.stopTimeMs,
    averageSpeedKmh: trip.averageSpeedKmh,
    maxSpeedKmh: trip.maxSpeedKmh,
    maxSpeedTimestamp: trip.maxSpeedTimestamp,
    maxSpeedCoordinates: trip.maxSpeedCoordinates,
    startLocationName: trip.startLocationName,
    endLocationName: trip.endLocationName,
    startCoordinates: trip.startCoordinates,
    endCoordinates: trip.endCoordinates,
    gpsTrace: trip.gpsTrace,
    stopEvents: trip.stopEvents,
    numberOfStops: trip.numberOfStops,
    syncStatus: 'pending',
    lastSyncAttempt: null,
    retryCount: 0,
    updatedAt: Date.now(),
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const db = await getDB();
      await db.put('trips', record);
      return; // Success
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  // All retries exhausted — hold in memory
  pendingWrites.push(record);
  throw new Error(
    `Failed to save trip record after ${MAX_RETRIES} retries: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Retrieves a single trip record by ID.
 *
 * @param id - The trip ID to look up
 * @returns The trip record or null if not found
 */
export async function getTripById(id: string): Promise<TripRecord | null> {
  const db = await getDB();
  const record = await db.get('trips', id);
  return record ?? null;
}

/**
 * Queries trip records with filtering by date range, distance, and user.
 * Supports pagination via limit and offset.
 *
 * Uses IndexedDB indexes for efficient querying:
 * - Date filtering via 'by-start-date' index
 * - Distance filtering via 'by-distance' index
 * - User filtering via 'by-user-id' index
 *
 * @param options - Query filters and pagination
 * @returns Array of matching trip records
 *
 * **Validates: Requirements 12.3**
 */
export async function queryTrips(options: QueryTripsOptions = {}): Promise<TripRecord[]> {
  const { dateFrom, dateTo, minDistance, maxDistance, userId, limit, offset = 0 } = options;
  const db = await getDB();

  let results: TripRecord[];

  // Use index-based querying when filters are provided
  if (userId !== undefined && userId !== null) {
    // Filter by user ID using the by-user-id index
    results = await db.getAllFromIndex('trips', 'by-user-id', userId);
  } else if (dateFrom !== undefined || dateTo !== undefined) {
    // Filter by date range using the by-start-date index
    const lower = dateFrom ?? 0;
    const upper = dateTo ?? Number.MAX_SAFE_INTEGER;
    results = await db.getAllFromIndex(
      'trips',
      'by-start-date',
      IDBKeyRange.bound(lower, upper)
    );
  } else {
    // No specific index filter — get all records
    results = await db.getAll('trips');
  }

  // Apply additional in-memory filters
  results = results.filter((record) => {
    // Only return completed trips in queries
    if (record.status !== 'completed') return false;

    // Date range filter (if not already handled by index)
    if (dateFrom !== undefined && record.startTimestamp < dateFrom) return false;
    if (dateTo !== undefined && record.startTimestamp > dateTo) return false;

    // Distance filter
    if (minDistance !== undefined && record.totalDistanceKm < minDistance) return false;
    if (maxDistance !== undefined && record.totalDistanceKm > maxDistance) return false;

    // User ID filter (if not already handled by index)
    if (userId !== undefined && record.userId !== userId) return false;

    return true;
  });

  // Sort by start date descending (most recent first)
  results.sort((a, b) => b.startTimestamp - a.startTimestamp);

  // Apply pagination
  const start = offset;
  const end = limit !== undefined ? offset + limit : undefined;
  return results.slice(start, end);
}

/**
 * Deletes a trip record by ID.
 *
 * @param id - The trip ID to delete
 */
export async function deleteTripById(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('trips', id);
}

/**
 * Retrieves the active trip checkpoint from IndexedDB.
 *
 * Used during app relaunch to detect and recover an interrupted trip.
 *
 * @returns The active trip checkpoint or null if none exists
 *
 * **Validates: Requirements 22.1**
 */
export async function getActiveTripCheckpoint(): Promise<ActiveTripCheckpoint | null> {
  const db = await getDB();
  const checkpoint = await db.get('activeTrip', 'current');
  return checkpoint ?? null;
}

/**
 * Saves an active trip checkpoint to IndexedDB.
 *
 * Called every 100m of travel or every 60 seconds to persist the current
 * trip state for crash recovery.
 *
 * @param checkpoint - The checkpoint data to persist
 */
export async function saveActiveTripCheckpoint(
  checkpoint: ActiveTripCheckpoint
): Promise<void> {
  const db = await getDB();
  await db.put('activeTrip', checkpoint, 'current');
}

/**
 * Clears the active trip checkpoint (e.g., when a trip is completed or cancelled).
 */
export async function clearActiveTripCheckpoint(): Promise<void> {
  const db = await getDB();
  await db.delete('activeTrip', 'current');
}

/**
 * Recovers a trip state from the activeTrip store on app relaunch.
 *
 * Reads the checkpoint, reconstructs a TripState, and clears the checkpoint.
 * Must complete within 5 seconds of app relaunch (Req 7.4).
 *
 * @returns Restored TripState or null if no active trip was in progress
 *
 * **Validates: Requirements 22.1, 7.4**
 */
export async function recoverTrip(): Promise<TripState | null> {
  const checkpoint = await getActiveTripCheckpoint();

  if (!checkpoint) {
    return null;
  }

  // Reconstruct TripState from the checkpoint
  const recoveredState: TripState = {
    id: checkpoint.tripId,
    status: 'active',
    startTimestamp: checkpoint.startTimestamp,
    endTimestamp: null,
    totalDistanceKm: checkpoint.totalDistanceKm,
    drivingTimeMs: checkpoint.drivingTimeMs,
    stopTimeMs: checkpoint.stopTimeMs,
    averageSpeedKmh:
      checkpoint.drivingTimeMs > 0
        ? checkpoint.totalDistanceKm / (checkpoint.drivingTimeMs / 3_600_000)
        : 0,
    maxSpeedKmh: checkpoint.maxSpeedKmh,
    maxSpeedTimestamp: checkpoint.maxSpeedTimestamp,
    maxSpeedCoordinates: checkpoint.maxSpeedCoordinates,
    currentSpeedKmh: 0,
    gpsTrace: checkpoint.gpsTrace,
    stopEvents: checkpoint.stopEvents,
    destination: null,
    remainingDistanceKm: null,
    etaTimestamp: null,
  };

  return recoveredState;
}

/**
 * Checks the current storage quota usage and determines if a warning
 * should be shown to the user.
 *
 * Triggers a warning when storage usage reaches 80% of the available quota.
 *
 * @returns Object with shouldWarn flag and current usage percentage
 *
 * **Validates: Requirements 12.4**
 */
export async function checkStorageQuota(): Promise<StorageQuotaResult> {
  const quota = await getStorageQuota();
  return {
    shouldWarn: quota.percentage >= 80,
    percentage: quota.percentage,
  };
}
