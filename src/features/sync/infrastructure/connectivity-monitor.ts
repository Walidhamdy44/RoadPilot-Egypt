/**
 * Connectivity monitor for RoadPilot Egypt.
 *
 * Listens to browser online/offline events and provides a stable connection
 * callback. When transitioning from offline to online, waits 5 consecutive
 * seconds of stable connectivity before signaling "ready to sync". If the
 * connection drops during stabilization, the timer resets.
 *
 * @module sync/infrastructure/connectivity-monitor
 */

import { DEFAULT_SYNC_CONFIG } from '@/features/sync/domain/sync-types';

export interface ConnectivityMonitor {
  /** Start listening to connectivity events */
  start: () => void;
  /** Stop listening and clean up timers */
  stop: () => void;
  /** Check current online status */
  isOnline: () => boolean;
}

/**
 * Creates a connectivity monitor that detects online/offline transitions
 * and invokes a callback after a stable connection period.
 *
 * @param onStableConnection - Callback fired when connection has been stable
 *   for at least `stableConnectionMs` (default 5000ms) after coming online.
 * @param options - Optional configuration overrides.
 * @returns An object with start, stop, and isOnline methods.
 */
export function createConnectivityMonitor(
  onStableConnection: () => void,
  options?: { stableConnectionMs?: number }
): ConnectivityMonitor {
  const stableMs = options?.stableConnectionMs ?? DEFAULT_SYNC_CONFIG.stableConnectionMs;

  let stabilizationTimer: ReturnType<typeof setTimeout> | null = null;
  let online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let listening = false;

  function clearStabilizationTimer(): void {
    if (stabilizationTimer !== null) {
      clearTimeout(stabilizationTimer);
      stabilizationTimer = null;
    }
  }

  function startStabilizationTimer(): void {
    clearStabilizationTimer();
    stabilizationTimer = setTimeout(() => {
      stabilizationTimer = null;
      // Connection has been stable for the required duration
      if (online) {
        onStableConnection();
      }
    }, stableMs);
  }

  function handleOnline(): void {
    const wasOffline = !online;
    online = true;

    if (wasOffline) {
      // Transitioning from offline → online: start stabilization wait
      startStabilizationTimer();
    }
  }

  function handleOffline(): void {
    online = false;
    // Connection dropped — reset any pending stabilization timer
    clearStabilizationTimer();
  }

  function start(): void {
    if (listening) return;
    listening = true;

    // Sync initial state
    online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If already online at start, begin stabilization immediately
    // so sync can trigger shortly after the monitor starts
    if (online) {
      startStabilizationTimer();
    }
  }

  function stop(): void {
    if (!listening) return;
    listening = false;

    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearStabilizationTimer();
  }

  function isOnline(): boolean {
    return online;
  }

  return { start, stop, isOnline };
}
