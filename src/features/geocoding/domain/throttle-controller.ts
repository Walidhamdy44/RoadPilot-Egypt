/**
 * Throttle Controller for reverse geocoding requests.
 *
 * Enforces a maximum of 1 Nominatim request per 3 seconds.
 * Intermediate GPS positions received during the cooldown period
 * are discarded (not queued).
 *
 * This is a pure state machine — it accepts timestamps and decides
 * whether a request should fire, without performing side effects.
 */

/** Minimum interval between geocoding requests in milliseconds. */
export const THROTTLE_INTERVAL_MS = 3_000;

export interface ThrottleState {
  /** Timestamp of the last allowed request (epoch ms), or null if none yet. */
  lastRequestTimestamp: number | null;
}

/**
 * Creates a new throttle controller state.
 */
export function createThrottleState(): ThrottleState {
  return { lastRequestTimestamp: null };
}

/**
 * Determines if a geocoding request should fire at the given timestamp.
 *
 * @param state - Current throttle state
 * @param timestamp - Current timestamp in epoch milliseconds
 * @returns An object with `allowed` flag and the updated state.
 *          If allowed is true, the caller should fire the request.
 *          If false, the position is discarded.
 */
export function shouldRequest(
  state: ThrottleState,
  timestamp: number
): { allowed: boolean; nextState: ThrottleState } {
  // First request is always allowed
  if (state.lastRequestTimestamp === null) {
    return {
      allowed: true,
      nextState: { lastRequestTimestamp: timestamp },
    };
  }

  const elapsed = timestamp - state.lastRequestTimestamp;

  if (elapsed >= THROTTLE_INTERVAL_MS) {
    return {
      allowed: true,
      nextState: { lastRequestTimestamp: timestamp },
    };
  }

  return {
    allowed: false,
    nextState: state,
  };
}
