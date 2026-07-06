/**
 * Sync domain types for RoadPilot Egypt.
 *
 * Defines structures for offline-to-server synchronization
 * of trip records with retry and conflict handling.
 */

import type { CompletedTrip } from "@/features/trip/domain/trip-types";

/** A record in the sync queue representing a trip pending synchronization. */
export interface SyncRecord {
  /** Unique sync record identifier */
  id: string;
  /** Associated trip identifier */
  tripId: string;
  /** Current sync status */
  status: "pending" | "syncing" | "synced" | "sync_failed";
  /** Timestamp of last sync attempt (Unix epoch ms), null if never attempted */
  lastAttempt: number | null;
  /** Number of retry attempts */
  retryCount: number;
  /** The completed trip data to sync */
  data: CompletedTrip;
}

/** Configuration for the sync engine. */
export interface SyncConfig {
  /** Maximum number of trip records per sync batch */
  maxBatchSize: number; // 10
  /** Maximum number of retries before marking as sync_failed */
  maxRetries: number; // 10
  /** Initial backoff delay in milliseconds */
  initialBackoffMs: number; // 5000
  /** Maximum backoff delay in milliseconds */
  maxBackoffMs: number; // 300000
  /** Minimum stable connection duration before syncing (ms) */
  stableConnectionMs: number; // 5000
}

/** Default sync configuration values. */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  maxBatchSize: 10,
  maxRetries: 10,
  initialBackoffMs: 5000,
  maxBackoffMs: 300000,
  stableConnectionMs: 5000,
};

/** Result of a sync batch operation from the server. */
export interface SyncBatchResult {
  /** IDs of successfully synced trips */
  synced: string[];
  /** Conflicts resolved during sync */
  conflicts: Array<{
    id: string;
    resolution: "client_wins" | "server_wins";
  }>;
  /** Failed sync operations */
  failed: Array<{
    id: string;
    error: string;
  }>;
}
