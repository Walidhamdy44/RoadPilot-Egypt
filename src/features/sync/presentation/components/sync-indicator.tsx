'use client';

/**
 * Compact sync status indicator for placement in headers or status bars.
 *
 * Displays:
 * - A small colored status dot (green = synced, blue = syncing, orange = pending, red = failed)
 * - Pending count badge when > 0
 * - Relative last-sync timestamp (e.g. "5 min ago")
 *
 * Dark-mode-first design with subtle, muted colors.
 *
 * **Validates: Requirements 12.8**
 */

import { useSyncStore } from '@/features/sync/presentation/hooks/use-sync-store';
import { useEffect, useState } from 'react';

type SyncStatus = 'synced' | 'syncing' | 'pending' | 'failed';

/**
 * Determines the overall sync status from store state.
 */
function deriveSyncStatus(
  isSyncing: boolean,
  pendingCount: number,
  isOnline: boolean
): SyncStatus {
  if (isSyncing) return 'syncing';
  if (!isOnline && pendingCount > 0) return 'failed';
  if (pendingCount > 0) return 'pending';
  return 'synced';
}

/**
 * Returns a human-readable relative time string from a timestamp.
 */
function formatRelativeTime(timestamp: number | null): string {
  if (timestamp === null) return 'Never';

  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 0) return 'Just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<SyncStatus, string> = {
  synced: 'bg-emerald-400',
  syncing: 'bg-blue-400',
  pending: 'bg-amber-400',
  failed: 'bg-red-400',
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing…',
  pending: 'Pending',
  failed: 'Sync failed',
};

export function SyncIndicator() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncTimestamp = useSyncStore((s) => s.lastSyncTimestamp);

  // Force re-render every 30s to update relative time
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const status = deriveSyncStatus(isSyncing, pendingCount, isOnline);
  const relativeTime = formatRelativeTime(lastSyncTimestamp);

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300"
      aria-label={`Sync status: ${STATUS_LABELS[status]}`}
      role="status"
    >
      {/* Status dot */}
      <span
        className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status]} ${
          status === 'syncing' ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />

      {/* Pending count badge */}
      {pendingCount > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-200">
          {pendingCount}
        </span>
      )}

      {/* Last sync time */}
      <span className="text-zinc-400">{relativeTime}</span>
    </div>
  );
}

/**
 * Small inline badge indicating a trip entry failed to sync.
 * Intended to be placed next to individual trip items in a history list.
 *
 * **Validates: Requirements 12.8**
 */
export function SyncFailedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
      role="status"
      aria-label="Sync failed"
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V5Zm.75 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
          fill="currentColor"
        />
      </svg>
      Sync failed
    </span>
  );
}

/**
 * Per-trip sync status badge for use in trip list items.
 * Shows the sync status of an individual trip record with an appropriate
 * color-coded indicator.
 *
 * **Validates: Requirements 12.8**
 */
export type TripSyncStatus = 'pending' | 'syncing' | 'synced' | 'sync_failed';

interface TripSyncBadgeProps {
  syncStatus: TripSyncStatus;
}

const TRIP_SYNC_COLORS: Record<TripSyncStatus, string> = {
  synced: 'bg-emerald-900/30 text-emerald-400',
  syncing: 'bg-blue-900/30 text-blue-400',
  pending: 'bg-amber-900/30 text-amber-400',
  sync_failed: 'bg-red-900/30 text-red-400',
};

const TRIP_SYNC_DOT_COLORS: Record<TripSyncStatus, string> = {
  synced: 'bg-emerald-400',
  syncing: 'bg-blue-400 animate-pulse',
  pending: 'bg-amber-400',
  sync_failed: 'bg-red-400',
};

const TRIP_SYNC_LABELS: Record<TripSyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  pending: 'Pending',
  sync_failed: 'Sync failed',
};

export function TripSyncBadge({ syncStatus }: TripSyncBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${TRIP_SYNC_COLORS[syncStatus]}`}
      role="status"
      aria-label={TRIP_SYNC_LABELS[syncStatus]}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${TRIP_SYNC_DOT_COLORS[syncStatus]}`}
        aria-hidden="true"
      />
      {TRIP_SYNC_LABELS[syncStatus]}
    </span>
  );
}
