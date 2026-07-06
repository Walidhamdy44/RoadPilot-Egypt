/**
 * IndexedDB connection helper for RoadPilot Egypt.
 *
 * Provides a singleton `getDB()` function that opens (or reuses) the
 * IndexedDB connection with proper schema upgrade logic.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { type RoadPilotDB, DB_NAME, DB_VERSION } from './schema';

/** Singleton promise so we only open the database once. */
let dbPromise: Promise<IDBPDatabase<RoadPilotDB>> | null = null;

/**
 * Returns a singleton IndexedDB database instance.
 *
 * The database is opened lazily on first call. Subsequent calls return
 * the same promise without reopening the connection.
 */
export function getDB(): Promise<IDBPDatabase<RoadPilotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RoadPilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // Version 1: initial schema
        if (oldVersion < 1) {
          // Trips object store with indexes for querying
          const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripStore.createIndex('by-status', 'status');
          tripStore.createIndex('by-start-date', 'startTimestamp');
          tripStore.createIndex('by-sync-status', 'syncStatus');
          tripStore.createIndex('by-distance', 'totalDistanceKm');

          // Active trip store (single record keyed by 'current')
          db.createObjectStore('activeTrip');

          // Geocode cache with timestamp index for LRU eviction
          const geocodeStore = db.createObjectStore('geocodeCache', {
            keyPath: 'coordinates',
          });
          geocodeStore.createIndex('by-timestamp', 'timestamp');

          // Settings key-value store
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Version 2: add userId field and index to trips store
        if (oldVersion < 2) {
          const tripStore = transaction.objectStore('trips');
          tripStore.createIndex('by-user-id', 'userId');
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Resets the singleton connection. Useful for testing or when the
 * database needs to be reopened after deletion.
 */
export function resetDB(): void {
  dbPromise = null;
}
