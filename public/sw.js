/// <reference lib="webworker" />

/**
 * RoadPilot Egypt - Service Worker
 *
 * Caching strategies:
 * - Cache-first: HTML shell, CSS, JS bundles, fonts, icons
 * - Network-first (5s timeout): API calls (/api/*)
 * - Cache-first with 30-day TTL + background refresh: Map tiles (tile.openstreetmap.org)
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const MAP_TILES_CACHE = 'roadpilot-map-tiles';

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
];

const MAP_TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAP_TILE_MAX_STORAGE_BYTES = 200 * 1024 * 1024; // 200 MB
const API_TIMEOUT_MS = 5000;

// ---------- Install ----------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---------- Activate ----------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            // Delete old versioned caches but keep map-tiles (unversioned)
            if (key === MAP_TILES_CACHE) return false;
            if (key === STATIC_CACHE || key === API_CACHE) return false;
            return true;
          })
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ---------- Fetch ----------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests for caching
  if (request.method !== 'GET') return;

  // Map tile requests
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
    return;
  }

  // API requests - network-first with timeout
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets - cache-first
  if (isStaticAsset(url, request)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// ---------- Helpers: Request classification ----------

function isMapTileRequest(url) {
  return (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tiles.openstreetmap.org') ||
    url.pathname.match(/\/\d+\/\d+\/\d+\.png$/)
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url, request) {
  // Same-origin navigation or static resources
  if (url.origin !== self.location.origin) return false;

  const pathname = url.pathname;
  const accept = request.headers.get('accept') || '';

  // HTML navigation requests
  if (request.mode === 'navigate') return true;

  // CSS
  if (pathname.endsWith('.css')) return true;

  // JavaScript
  if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) return true;

  // Fonts
  if (
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.otf')
  ) {
    return true;
  }

  // Icons and images in /public
  if (
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  ) {
    return true;
  }

  // Next.js static chunks
  if (pathname.startsWith('/_next/static/')) return true;

  return false;
}

// ---------- Strategy: Cache-first (static assets) ----------

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If offline and no cache, return a basic offline page or let browser handle
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ---------- Strategy: Network-first with 5s timeout (API) ----------

async function handleApiRequest(request) {
  try {
    const response = await fetchWithTimeout(request, API_TIMEOUT_MS);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed or timed out — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ---------- Strategy: Cache-first with 30-day TTL + background refresh (Map tiles) ----------

async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_TILES_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    const age = cachedDate ? Date.now() - parseInt(cachedDate, 10) : Infinity;

    if (age < MAP_TILE_MAX_AGE_MS) {
      // Cache is fresh — serve it, but trigger background refresh if online
      if (self.navigator && self.navigator.onLine) {
        refreshTileInBackground(request, cache);
      }
      return cached;
    }

    // Cache is stale — try network, fall back to stale cache
    try {
      const fresh = await fetchAndCacheTile(request, cache);
      return fresh;
    } catch (error) {
      // Serve stale tile rather than nothing
      return cached;
    }
  }

  // No cache — fetch from network
  try {
    const response = await fetchAndCacheTile(request, cache);
    return response;
  } catch (error) {
    return new Response('', {
      status: 503,
      statusText: 'Tile unavailable',
    });
  }
}

async function fetchAndCacheTile(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    await cacheTileWithQuotaCheck(request, response.clone(), cache);
  }
  return response;
}

function refreshTileInBackground(request, cache) {
  // Fire-and-forget background refresh
  fetch(request)
    .then((response) => {
      if (response.ok) {
        cacheTileWithQuotaCheck(request, response, cache);
      }
    })
    .catch(() => {
      // Silently ignore background refresh failures
    });
}

async function cacheTileWithQuotaCheck(request, response, cache) {
  // Check storage quota before caching
  const withinQuota = await isWithinMapTileQuota();
  if (!withinQuota) {
    // Evict oldest tiles to make room
    await evictOldestTiles(cache);
  }

  // Clone the response and add a timestamp header for TTL tracking
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));

  const timedResponse = new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  await cache.put(request, timedResponse);
}

async function isWithinMapTileQuota() {
  if (!navigator.storage || !navigator.storage.estimate) {
    // Can't check quota — assume OK
    return true;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    // If overall usage approaches map tile budget, signal over-quota
    // We approximate by checking if total usage is within a reasonable threshold
    // Since we can't measure individual cache sizes directly in all browsers,
    // use a heuristic based on overall storage usage
    if (quota > 0 && usage > MAP_TILE_MAX_STORAGE_BYTES) {
      return false;
    }
    return true;
  } catch (error) {
    return true;
  }
}

async function evictOldestTiles(cache) {
  const keys = await cache.keys();
  if (keys.length === 0) return;

  // Collect entries with their cached timestamps
  const entries = [];
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const cachedAt = response.headers.get('sw-cached-at');
      entries.push({
        request,
        cachedAt: cachedAt ? parseInt(cachedAt, 10) : 0,
      });
    }
  }

  // Sort by oldest first
  entries.sort((a, b) => a.cachedAt - b.cachedAt);

  // Delete the oldest 20% of tiles
  const deleteCount = Math.max(1, Math.floor(entries.length * 0.2));
  for (let i = 0; i < deleteCount; i++) {
    await cache.delete(entries[i].request);
  }
}

// ---------- Utility: Fetch with timeout ----------

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
