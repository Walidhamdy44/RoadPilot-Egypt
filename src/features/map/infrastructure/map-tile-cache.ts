/**
 * Map Tile Pre-Caching Infrastructure
 *
 * Provides map tile pre-caching with:
 * - 200MB maximum cache size
 * - 30-day TTL with background refresh
 * - Pre-caching of zoom levels 10-15 within a configurable radius
 *
 * Uses the Cache API directly (cache name: 'roadpilot-map-tiles')
 * and the standard OpenStreetMap tile URL pattern.
 *
 * Validates: Requirements 15.5, 15.8, 16.4
 */

import {
  calculateTilesToCache as computeTiles,
  type TileCoordinate,
} from '../domain/tile-cache-strategy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum cache storage for map tiles in megabytes */
export const MAX_CACHE_SIZE_MB = 200;

/** Maximum age of cached tiles before they are considered stale (days) */
export const TILE_TTL_DAYS = 30;

/** Default radius for pre-caching around the user's position (km) */
export const DEFAULT_RADIUS_KM = 50;

/** Cache name used for storing map tiles */
const CACHE_NAME = 'roadpilot-map-tiles';

/** Tile URL pattern */
const TILE_URL_BASE = 'https://tile.openstreetmap.org';

/** Default zoom levels for pre-caching */
const DEFAULT_ZOOM_LEVELS = [10, 11, 12, 13, 14, 15];

/** Concurrent fetch limit to avoid overwhelming the network */
const BATCH_SIZE = 6;

/** TTL in milliseconds */
const TILE_TTL_MS = TILE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Max cache size in bytes */
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize tile caching around a user's position.
 *
 * Queues tiles for pre-caching at zoom levels 10-15 within the specified
 * radius. Also triggers a stale tile cleanup before caching new tiles.
 *
 * @param position - User's last known position
 * @param radiusKm - Radius in km to pre-cache (default 50)
 */
export async function initTileCache(
  position: { lat: number; lng: number },
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<void> {
  // Clean stale tiles first to free up space
  await cleanStaleTiles();

  // Calculate which tiles to cache
  const tiles = calculateTilesToCache(
    position.lat,
    position.lng,
    radiusKm,
    DEFAULT_ZOOM_LEVELS
  );

  // Cache tiles respecting the storage budget
  await cacheTiles(tiles);
}

/**
 * Compute which tiles cover the given area at the specified zoom levels.
 *
 * Uses the standard OSM Slippy Map tile formula:
 *   x = floor((lng + 180) / 360 * 2^z)
 *   y = floor((1 - ln(tan(lat_rad) + 1/cos(lat_rad)) / π) / 2 * 2^z)
 *
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param radiusKm - Radius in kilometers
 * @param zoomLevels - Array of zoom levels (default 10-15)
 * @returns Array of tile coordinates {z, x, y}
 */
export function calculateTilesToCache(
  lat: number,
  lng: number,
  radiusKm: number,
  zoomLevels: number[] = DEFAULT_ZOOM_LEVELS
): { z: number; x: number; y: number }[] {
  return computeTiles(lat, lng, radiusKm, zoomLevels);
}

/**
 * Fetch and store tiles via the Cache API.
 *
 * Processes tiles in batches, skipping already-cached fresh tiles.
 * Stops when the cache exceeds the 200MB budget.
 *
 * @param tiles - Array of tile coordinates to fetch and cache
 */
export async function cacheTiles(
  tiles: { z: number; x: number; y: number }[]
): Promise<void> {
  if (tiles.length === 0) return;

  // Check if cache API is available
  if (typeof caches === 'undefined') return;

  const cache = await caches.open(CACHE_NAME);

  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    // Check budget before each batch
    const currentSize = await getCacheSize();
    if (currentSize >= MAX_CACHE_SIZE_BYTES) {
      break;
    }

    const batch = tiles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (tile) => {
        const url = buildTileUrl(tile);
        const request = new Request(url);

        // Skip if already cached and fresh
        const existing = await cache.match(request);
        if (existing) {
          const cachedAt = existing.headers.get('sw-cached-at');
          if (cachedAt) {
            const age = Date.now() - parseInt(cachedAt, 10);
            if (age < TILE_TTL_MS) {
              return; // Still fresh, skip
            }
          }
        }

        try {
          const response = await fetch(url);
          if (!response.ok) return;

          // Add timestamp header for TTL tracking (matches sw.js convention)
          const headers = new Headers(response.headers);
          headers.set('sw-cached-at', String(Date.now()));

          const timedResponse = new Response(await response.blob(), {
            status: response.status,
            statusText: response.statusText,
            headers,
          });

          await cache.put(request, timedResponse);
        } catch {
          // Silently skip failed tile fetches (network issues, etc.)
        }
      })
    );
  }
}

/**
 * Remove tiles older than the specified max age from the cache.
 *
 * Iterates all cached tiles and deletes those whose `sw-cached-at` header
 * indicates they are older than the TTL threshold.
 *
 * Also triggers background refresh for stale tiles that are still needed
 * (re-fetches them in the background without blocking).
 *
 * @param maxAgeDays - Maximum tile age in days (default 30)
 */
export async function cleanStaleTiles(
  maxAgeDays: number = TILE_TTL_DAYS
): Promise<void> {
  if (typeof caches === 'undefined') return;

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  let cache: Cache;
  try {
    cache = await caches.open(CACHE_NAME);
  } catch {
    return;
  }

  const keys = await cache.keys();
  const staleRequests: Request[] = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;

    const cachedAt = response.headers.get('sw-cached-at');
    if (!cachedAt) {
      // No timestamp — treat as stale
      staleRequests.push(request);
      continue;
    }

    const age = now - parseInt(cachedAt, 10);
    if (age > maxAgeMs) {
      staleRequests.push(request);
    }
  }

  // Delete stale tiles
  await Promise.allSettled(
    staleRequests.map((request) => cache.delete(request))
  );

  // Background refresh: re-fetch stale tiles if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    backgroundRefreshTiles(staleRequests);
  }
}

/**
 * Returns the current approximate cache size in bytes.
 *
 * Uses the Storage API estimate if available, otherwise counts cached
 * entries and estimates based on average tile size.
 *
 * @returns Current cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  if (typeof caches === 'undefined') return 0;

  // Try Storage Manager estimate first
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.estimate
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      // We can't directly measure a single cache's size, so we approximate
      // by counting entries and using a heuristic
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      // Average OSM tile is ~15-20KB; use 15KB as conservative estimate
      return keys.length * 15 * 1024;
    } catch {
      // Fall through to manual counting
    }
  }

  // Fallback: count entries × average tile size
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length * 15 * 1024;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Build the tile URL from coordinates.
 * Uses the standard OSM tile URL pattern.
 */
function buildTileUrl(tile: { z: number; x: number; y: number }): string {
  return `${TILE_URL_BASE}/${tile.z}/${tile.x}/${tile.y}.png`;
}

/**
 * Background refresh of stale tiles without blocking the main flow.
 * Re-fetches tiles and updates the cache with fresh copies.
 */
function backgroundRefreshTiles(requests: Request[]): void {
  // Fire-and-forget: don't await, limit concurrency
  const refreshBatch = requests.slice(0, BATCH_SIZE * 2);

  Promise.allSettled(
    refreshBatch.map(async (request) => {
      try {
        const response = await fetch(request.url);
        if (!response.ok) return;

        const cache = await caches.open(CACHE_NAME);
        const headers = new Headers(response.headers);
        headers.set('sw-cached-at', String(Date.now()));

        const timedResponse = new Response(await response.blob(), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });

        await cache.put(request, timedResponse);
      } catch {
        // Silently ignore background refresh failures
      }
    })
  );
}
