/**
 * Conflict resolver for sync operations.
 *
 * Implements a last-write-wins (LWW) strategy based on the clientUpdatedAt
 * timestamp. When both client and server have modified a record, the one
 * with the more recent clientUpdatedAt timestamp takes precedence.
 *
 * @module sync/domain/conflict-resolver
 *
 * **Validates: Requirements 12.6**
 */

export type ConflictResolution = 'client_wins' | 'server_wins';

/**
 * Resolves a sync conflict between a local record and the server record
 * using last-write-wins on `clientUpdatedAt`.
 *
 * @param local - The local record with its clientUpdatedAt timestamp (Unix epoch ms)
 * @param server - The server record with its clientUpdatedAt timestamp (Unix epoch ms)
 * @returns 'client_wins' if the local record is newer or equal, 'server_wins' otherwise
 */
export function resolveConflict(
  local: { clientUpdatedAt: number },
  server: { clientUpdatedAt: number }
): ConflictResolution {
  // Last-write-wins: the record with the later timestamp wins.
  // On tie, client wins to preserve local edits.
  if (local.clientUpdatedAt >= server.clientUpdatedAt) {
    return 'client_wins';
  }
  return 'server_wins';
}
