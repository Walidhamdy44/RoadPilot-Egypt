/**
 * Rate limiting utility using an in-memory sliding window approach.
 *
 * Enforces:
 * - 100 requests/minute per authenticated user (identified by userId)
 * - 20 requests/minute per unauthenticated IP address
 *
 * NOTE: This uses in-memory storage, which works for single-instance deployments.
 * For production with multiple serverless instances, replace with a Redis-based
 * solution (e.g., Upstash Redis) to share state across instances.
 *
 * **Validates: Requirements 23.3, 23.4**
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // seconds until the window resets
}

interface SlidingWindowEntry {
  timestamps: number[];
}

const WINDOW_MS = 60_000; // 1 minute sliding window
const AUTHENTICATED_LIMIT = 100;
const UNAUTHENTICATED_LIMIT = 20;

/** In-memory store keyed by identifier (userId or IP) */
const store = new Map<string, SlidingWindowEntry>();

/**
 * Cleans up expired timestamps from the sliding window.
 */
function pruneExpired(entry: SlidingWindowEntry, now: number): void {
  const windowStart = now - WINDOW_MS;
  // Remove timestamps older than the window
  while (entry.timestamps.length > 0 && entry.timestamps[0] <= windowStart) {
    entry.timestamps.shift();
  }
}

/**
 * Check rate limit for a given identifier.
 *
 * @param identifier - userId for authenticated users, IP for unauthenticated
 * @param isAuthenticated - whether the request comes from an authenticated user
 * @returns RateLimitResult with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean
): RateLimitResult {
  const now = Date.now();
  const limit = isAuthenticated ? AUTHENTICATED_LIMIT : UNAUTHENTICATED_LIMIT;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  pruneExpired(entry, now);

  if (entry.timestamps.length >= limit) {
    // Rate limit exceeded — calculate when the oldest request in the window expires
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + WINDOW_MS - now;
    const resetSeconds = Math.ceil(resetMs / 1000);

    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.max(resetSeconds, 1),
    };
  }

  // Allow the request
  entry.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - entry.timestamps.length,
    reset: Math.ceil(WINDOW_MS / 1000),
  };
}

/**
 * Reset the rate limit store. Useful for testing.
 */
export function resetRateLimitStore(): void {
  store.clear();
}

/**
 * Get the configured limits. Useful for testing or documentation.
 */
export function getRateLimitConfig() {
  return {
    windowMs: WINDOW_MS,
    authenticatedLimit: AUTHENTICATED_LIMIT,
    unauthenticatedLimit: UNAUTHENTICATED_LIMIT,
  };
}
