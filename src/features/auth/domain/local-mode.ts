/**
 * Local-only mode logic for RoadPilot Egypt.
 *
 * The app is designed to be fully functional without authentication.
 * All trip recording, GPS tracking, and analytics work locally via IndexedDB.
 * Authentication only unlocks server sync and cross-device access.
 *
 * This module provides utilities to determine if the app is in local-only mode
 * and to handle session lifecycle events (login, expiration).
 */

/**
 * Determines if the user is operating in local-only mode.
 * Local-only mode means the user has no active session.
 *
 * @param isAuthenticated - Whether the user has an active session
 * @returns true if in local-only mode (no session), false if authenticated
 */
export function isLocalOnlyMode(isAuthenticated: boolean): boolean {
  return !isAuthenticated;
}

/**
 * Determines if the session has expired based on session state.
 * A session is considered expired when:
 * - The user was previously authenticated (had a session)
 * - The session check completed (not pending)
 * - The user is now unauthenticated
 *
 * @param isPending - Whether the session check is still in progress
 * @param isAuthenticated - Whether the user has an active session
 * @param hadPreviousSession - Whether the user previously had an active session
 * @returns true if the session has expired
 */
export function isSessionExpired(
  isPending: boolean,
  isAuthenticated: boolean,
  hadPreviousSession: boolean
): boolean {
  return !isPending && !isAuthenticated && hadPreviousSession;
}
