/**
 * Trace Buffer for GPS point thinning during long trips.
 *
 * Prevents memory growth by keeping only the last N points in memory
 * while persisting the full trace to IndexedDB. This allows the dashboard
 * to render a manageable number of points while retaining full trip
 * fidelity in storage.
 *
 * Strategy:
 * - Keep a sliding window of the last `maxInMemory` points (default 1000)
 * - When the buffer exceeds the threshold, flush older points to IndexedDB
 * - Flushes are debounced to avoid excessive IndexedDB writes
 *
 * **Validates: Requirements 21.4, 22.5**
 */

import type { GPSTracePoint } from './trip-types';
import { getDB } from '@/lib/idb/index';

/** Default maximum points kept in memory for display. */
const DEFAULT_MAX_IN_MEMORY = 1000;

/** Number of points to flush to IndexedDB at once when buffer overflows. */
const FLUSH_BATCH_SIZE = 200;

/** Minimum interval between IndexedDB flushes in ms (5 seconds). */
const FLUSH_DEBOUNCE_MS = 5000;

export interface TraceBufferOptions {
  /** Max points to keep in the in-memory window. Default: 1000 */
  maxInMemory?: number;
  /** Trip ID for persisting overflow points. */
  tripId: string;
}

export interface TraceBuffer {
  /** Add a new GPS trace point to the buffer. */
  push(point: GPSTracePoint): void;
  /** Get the current in-memory points (sliding window). */
  getDisplayPoints(): GPSTracePoint[];
  /** Get total number of points recorded (in-memory + flushed). */
  getTotalCount(): number;
  /** Force flush any pending overflow points to IndexedDB. */
  flush(): Promise<void>;
  /** Dispose the buffer, flushing remaining data and clearing timers. */
  dispose(): Promise<void>;
}

/**
 * Creates a trace buffer that manages GPS points with a sliding window.
 *
 * @param options - Configuration for the buffer
 * @returns A TraceBuffer instance
 */
export function createTraceBuffer(options: TraceBufferOptions): TraceBuffer {
  const maxInMemory = options.maxInMemory ?? DEFAULT_MAX_IN_MEMORY;
  const tripId = options.tripId;

  /** In-memory sliding window of recent points for display. */
  let inMemoryPoints: GPSTracePoint[] = [];

  /** Points waiting to be flushed to IndexedDB. */
  let pendingFlush: GPSTracePoint[] = [];

  /** Total count of all points ever recorded. */
  let totalCount = 0;

  /** Debounce timer for flushing. */
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether a flush is currently in progress. */
  let flushing = false;

  /**
   * Schedules a debounced flush of pending points to IndexedDB.
   */
  function scheduleFlush(): void {
    if (flushTimer !== null) return; // Already scheduled
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushPendingPoints();
    }, FLUSH_DEBOUNCE_MS);
  }

  /**
   * Flushes pending overflow points to IndexedDB.
   */
  async function flushPendingPoints(): Promise<void> {
    if (flushing || pendingFlush.length === 0) return;
    flushing = true;

    const pointsToFlush = pendingFlush.splice(0);

    try {
      const db = await getDB();
      const existing = await db.get('activeTrip', 'current');
      if (existing && existing.tripId === tripId) {
        // Append flushed points to the stored trace
        const updatedTrace = [...existing.gpsTrace, ...pointsToFlush];
        await db.put(
          'activeTrip',
          {
            ...existing,
            gpsTrace: updatedTrace,
            lastCheckpoint: Date.now(),
          },
          'current'
        );
      }
    } catch {
      // On failure, put points back for next flush attempt
      pendingFlush = [...pointsToFlush, ...pendingFlush];
    } finally {
      flushing = false;
    }
  }

  return {
    push(point: GPSTracePoint): void {
      inMemoryPoints.push(point);
      totalCount++;

      // When in-memory exceeds the threshold, move older points to pending flush
      if (inMemoryPoints.length > maxInMemory + FLUSH_BATCH_SIZE) {
        const overflow = inMemoryPoints.splice(0, inMemoryPoints.length - maxInMemory);
        pendingFlush.push(...overflow);
        scheduleFlush();
      }
    },

    getDisplayPoints(): GPSTracePoint[] {
      return inMemoryPoints;
    },

    getTotalCount(): number {
      return totalCount;
    },

    async flush(): Promise<void> {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flushPendingPoints();
    },

    async dispose(): Promise<void> {
      // Move all remaining in-memory points to pending and flush
      if (inMemoryPoints.length > 0) {
        pendingFlush.push(...inMemoryPoints);
        inMemoryPoints = [];
      }
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flushPendingPoints();
    },
  };
}
