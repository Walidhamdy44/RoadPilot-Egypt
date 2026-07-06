'use client';

/**
 * Persistent offline indicator displayed as a fixed-position pill/banner
 * visible on all screens when the device is offline.
 *
 * Uses the sync store's `isOnline` state to determine visibility.
 * Dark-mode-first design with subtle but visible styling.
 *
 * **Validates: Requirements 15.6, 15.7**
 */

import { useSyncStore } from '@/features/sync/presentation/hooks/use-sync-store';
import { CloudOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useSyncStore((s) => s.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm font-medium text-zinc-200 shadow-lg ring-1 ring-zinc-700 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="You are offline"
    >
      <CloudOff className="h-4 w-4 text-zinc-400" aria-hidden="true" />
      <span>Offline</span>
    </div>
  );
}
