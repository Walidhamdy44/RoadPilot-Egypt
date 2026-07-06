'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  isWakeLockSupported,
  requestWakeLock,
  releaseWakeLock,
} from '@/features/pwa/infrastructure/wake-lock';

/**
 * Hook that manages the Screen Wake Lock lifecycle tied to an active trip.
 *
 * - Acquires the wake lock when `isTripActive` is true.
 * - Releases it when the trip ends.
 * - Re-acquires on page visibility change (wake locks are released when
 *   the page becomes hidden and must be re-acquired on return).
 * - Reports whether the API is supported so the UI can show a notification
 *   if it is not.
 *
 * **Validates: Requirements 16.6, 16.7**
 */
export interface UseWakeLockResult {
  /** Whether the wake lock is currently held */
  isActive: boolean;
  /** Whether the Wake Lock API is supported in this browser */
  isSupported: boolean;
  /** Error message if the wake lock could not be acquired */
  error: string | null;
}

export function useWakeLock(isTripActive: boolean): UseWakeLockResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const supported = isWakeLockSupported();

  const acquire = useCallback(async () => {
    // Don't attempt if API not supported or already holding a lock
    if (!supported || sentinelRef.current) return;

    const result = await requestWakeLock();
    if (result.success && result.wakeLock) {
      sentinelRef.current = result.wakeLock;
      setIsActive(true);
      setError(null);

      // Listen for the sentinel being released externally (e.g., page hidden)
      result.wakeLock.addEventListener('release', () => {
        sentinelRef.current = null;
        setIsActive(false);
      });
    } else {
      setError(result.error ?? 'Wake lock request failed.');
      setIsActive(false);
    }
  }, [supported]);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      await releaseWakeLock(sentinelRef.current);
      sentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Acquire / release based on trip active state
  useEffect(() => {
    if (isTripActive) {
      acquire();
    } else {
      release();
    }

    return () => {
      // Cleanup on unmount
      release();
    };
  }, [isTripActive, acquire, release]);

  // Re-acquire wake lock when the page becomes visible again.
  // The browser automatically releases the wake lock when a page is hidden.
  useEffect(() => {
    if (!isTripActive || !supported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTripActive, supported, acquire]);

  return {
    isActive,
    isSupported: supported,
    error,
  };
}
