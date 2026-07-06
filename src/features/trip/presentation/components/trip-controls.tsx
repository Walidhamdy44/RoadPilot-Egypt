'use client';

/**
 * Trip controls component with start/stop trip buttons.
 *
 * Features:
 * - Shows "Start Trip" (green) when no trip is active
 * - Shows "Stop Trip" (red) when a trip is active
 * - Shows GPS permission prompt if location hasn't been granted when starting a trip
 * - Minimum 44x44 CSS pixel touch targets with 8px spacing
 * - Triggers trip start/end through Trip Zustand store
 * - Dark-mode-first design with Tailwind CSS
 *
 * **Validates: Requirements 7.5, 24.5**
 */

import { useState, useCallback } from 'react';
import { useTripStore } from '@/features/trip/presentation/hooks/use-trip-store';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import { GPSPermissionPrompt } from '@/features/gps/presentation/components/gps-permission-prompt';

export function TripControls() {
  const { isActive, startTrip, endTrip } = useTripStore();
  const signalStatus = useGPSStore((s) => s.signalStatus);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const handleStartTrip = useCallback(() => {
    // If GPS permission is denied or hasn't been acquired, show the permission prompt
    if (signalStatus === 'denied') {
      setShowPermissionPrompt(true);
      return;
    }

    // Check if the browser can provide GPS by querying Permissions API
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'denied') {
            setShowPermissionPrompt(true);
          } else if (result.state === 'prompt') {
            setShowPermissionPrompt(true);
          } else {
            // Permission already granted
            startTrip();
          }
        })
        .catch(() => {
          // Permissions API not available for geolocation, attempt to start
          startTrip();
        });
    } else {
      // No Permissions API — just start the trip, the GPSPermission wrapper handles it
      startTrip();
    }
  }, [signalStatus, startTrip]);

  const handlePermissionGranted = useCallback(() => {
    setShowPermissionPrompt(false);
    // Reset GPS store from denied state
    useGPSStore.getState().reset();
    startTrip();
  }, [startTrip]);

  const handleDismissPrompt = useCallback(() => {
    setShowPermissionPrompt(false);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={endTrip}
            aria-label="Stop Trip"
            className="min-w-[44px] min-h-[44px] px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop Trip
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartTrip}
            aria-label="Start Trip"
            className="min-w-[44px] min-h-[44px] px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-500 active:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Trip
          </button>
        )}
      </div>

      {/* GPS Permission Prompt — shown when starting a trip without location access */}
      {showPermissionPrompt && (
        <GPSPermissionPrompt
          onPermissionGranted={handlePermissionGranted}
          onDismiss={handleDismissPrompt}
        />
      )}
    </>
  );
}
