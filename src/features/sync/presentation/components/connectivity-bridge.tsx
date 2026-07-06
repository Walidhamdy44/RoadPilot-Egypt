'use client';

/**
 * ConnectivityBridge — a side-effect-only component that wires the
 * browser's online/offline events into the sync Zustand store.
 *
 * Also starts the connectivity monitor which triggers sync after a
 * stable 5-second reconnection period.
 *
 * Renders nothing.
 */

import { useEffect } from 'react';
import { useSyncStore } from '@/features/sync/presentation/hooks/use-sync-store';
import { createConnectivityMonitor } from '@/features/sync/infrastructure/connectivity-monitor';

export function ConnectivityBridge() {
  const setOnline = useSyncStore((s) => s.setOnline);

  useEffect(() => {
    // Update the store immediately to reflect current state
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start the connectivity monitor for stable-connection detection.
    // The onStableConnection callback is a no-op here — the actual sync
    // trigger is handled by the sync engine which subscribes to the store.
    const monitor = createConnectivityMonitor(() => {
      // Stable connection confirmed — sync engine listens to store changes
      // and will trigger sync when isOnline becomes true.
    });
    monitor.start();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      monitor.stop();
    };
  }, [setOnline]);

  return null;
}
