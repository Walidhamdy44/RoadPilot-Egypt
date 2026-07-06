'use client';

/**
 * Crash Recovery component for RoadPilot Egypt.
 *
 * On mount, checks for an active trip checkpoint in IndexedDB via recoverTrip().
 * If found: shows a modal/banner asking "Resume interrupted trip?" with Resume/Discard buttons.
 * - On Resume: calls useTripStore.restoreTrip(state) and starts GPS
 * - On Discard: calls clearActiveTripCheckpoint() and clears the banner
 *
 * Must complete the recovery check within 5 seconds of app launch.
 *
 * **Validates: Requirements 7.4, 22.1**
 */

import { useEffect, useState, useCallback } from 'react';
import { recoverTrip, clearActiveTripCheckpoint } from '@/features/trip/infrastructure/trip-repository';
import { useTripStore } from '@/features/trip/presentation/hooks/use-trip-store';
import type { TripState } from '@/features/trip/domain/trip-types';

type RecoveryState = 'checking' | 'found' | 'none' | 'error';

interface CrashRecoveryProps {
  children: React.ReactNode;
}

export function CrashRecovery({ children }: CrashRecoveryProps) {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [recoveredTrip, setRecoveredTrip] = useState<TripState | null>(null);
  const restoreTrip = useTripStore((s) => s.restoreTrip);

  useEffect(() => {
    let didCancel = false;

    async function checkRecovery() {
      try {
        // Must complete within 5 seconds — use a race with a timeout
        const result = await Promise.race([
          recoverTrip(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);

        if (didCancel) return;

        if (result) {
          setRecoveredTrip(result);
          setRecoveryState('found');
        } else {
          setRecoveryState('none');
        }
      } catch {
        if (!didCancel) {
          setRecoveryState('none');
        }
      }
    }

    checkRecovery();

    return () => {
      didCancel = true;
    };
  }, []);

  const handleResume = useCallback(() => {
    if (recoveredTrip) {
      restoreTrip(recoveredTrip);
    }
    setRecoveryState('none');
    setRecoveredTrip(null);
  }, [recoveredTrip, restoreTrip]);

  const handleDiscard = useCallback(async () => {
    try {
      await clearActiveTripCheckpoint();
    } catch {
      // Best effort — clear the UI regardless
    }
    setRecoveryState('none');
    setRecoveredTrip(null);
  }, []);

  // While checking, show a brief loading state
  if (recoveryState === 'checking') {
    return <>{children}</>;
  }

  // No recovery needed — pass through
  if (recoveryState === 'none') {
    return <>{children}</>;
  }

  // Recovery found — show banner overlay on top of children
  return (
    <>
      {children}
      {recoveryState === 'found' && recoveredTrip && (
        <RecoveryBanner
          tripState={recoveredTrip}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
}

/* ─── Recovery Banner ───────────────────────────────────────── */

interface RecoveryBannerProps {
  tripState: TripState;
  onResume: () => void;
  onDiscard: () => void;
}

function RecoveryBanner({ tripState, onResume, onDiscard }: RecoveryBannerProps) {
  const distanceText = tripState.totalDistanceKm.toFixed(2);
  const elapsedMs = Date.now() - tripState.startTimestamp;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Banner card */}
      <div className="relative z-10 mx-4 mb-4 w-full max-w-[400px] rounded-2xl bg-zinc-900 border border-zinc-700/50 p-6 shadow-2xl sm:mb-0">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <svg
              className="h-6 w-6 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          id="recovery-title"
          className="text-center text-base font-semibold text-zinc-100 mb-2"
        >
          Resume interrupted trip?
        </h2>

        {/* Trip info */}
        <p className="text-center text-sm text-zinc-400 mb-6">
          A trip was in progress ({distanceText} km, ~{elapsedMinutes} min).
          Would you like to resume or discard it?
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 min-h-[44px] rounded-xl bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onResume}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
