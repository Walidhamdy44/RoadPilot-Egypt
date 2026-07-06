/**
 * LRU geocode cache backed by IndexedDB.
 *
 * Caches reverse geocoding results keyed by rounded coordinates
 * (4 decimal places ≈ ~11m precision). Evicts oldest entries when
 * the cache exceeds the configured maximum size (default 1000).
 *
 * The geocodeCache store uses a string key (the rounded "lat,lng" pair).
 * The IDB schema keyPath is 'coordinates' — we store our cache key string
 * there so it functions as both the IndexedDB key and a readable identifier.
 */

import { getDB } from '@/lib/idb';
import type { GeocodeCacheEntry } from '../domain/geocoder-types';

/** Maximum entries in the geocode cache before LRU eviction. */
const MAX_CACHE_SIZE = 1_000;

/**
 * Rounds coordinates to 4 decimal places for cache key generation.
 * 4 decimals gives ~11 meter precision — close enough for road names.
 */
function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Generates a cache key from latitude and longitude.
 * Uses rounded coordinates (4 decimal places) as a string key.
 */
export function generateCacheKey(lat: number, lng: number): string {
  const rLat = roundCoordinate(lat);
  const rLng = roundCoordinate(lng);
  return `${rLat},${rLng}`;
}

/**
 * Retrieves a cached geocode entry for the given coordinates.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @returns The cached entry or null if not found
 */
export async function getCachedGeocode(
  lat: number,
  lng: number
): Promise<GeocodeCacheEntry | null> {
  const db = await getDB();
  const key = generateCacheKey(lat, lng);

  const entry = await db.get('geocodeCache', key);
  if (!entry) return null;

  // Update the timestamp to mark as recently used (LRU touch)
  const updatedEntry: GeocodeCacheEntry & { coordinates: { lat: number; lng: number } } = {
    roadName: entry.roadName,
    localityName: entry.localityName,
    timestamp: Date.now(),
    coordinates: entry.coordinates,
  };
  await db.put('geocodeCache', updatedEntry as never);

  return updatedEntry;
}

/**
 * Stores a geocode result in the cache.
 * Triggers LRU eviction if cache size exceeds the maximum.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @param roadName - Resolved road name or null
 * @param localityName - Resolved locality name or null
 */
export async function setCachedGeocode(
  lat: number,
  lng: number,
  roadName: string | null,
  localityName: string | null
): Promise<void> {
  const db = await getDB();

  const record = {
    roadName,
    localityName,
    timestamp: Date.now(),
    coordinates: { lat, lng },
  };

  await db.put('geocodeCache', record as never);

  // Evict old entries if cache exceeds max size
  await evictOldEntries();
}

/**
 * Evicts the oldest entries from the cache when it exceeds MAX_CACHE_SIZE.
 * Uses the 'by-timestamp' index to find the oldest entries.
 */
async function evictOldEntries(): Promise<void> {
  const db = await getDB();
  const count = await db.count('geocodeCache');

  if (count <= MAX_CACHE_SIZE) return;

  const entriesToRemove = count - MAX_CACHE_SIZE;

  // Get oldest entries via the 'by-timestamp' index
  const tx = db.transaction('geocodeCache', 'readwrite');
  const index = tx.store.index('by-timestamp');
  let cursor = await index.openCursor();
  let removed = 0;

  while (cursor && removed < entriesToRemove) {
    await cursor.delete();
    removed++;
    cursor = await cursor.continue();
  }

  await tx.done;
}

/**
 * Clears all entries from the geocode cache.
 * Primarily used for testing.
 */
export async function clearGeocodeCache(): Promise<void> {
  const db = await getDB();
  await db.clear('geocodeCache');
}
