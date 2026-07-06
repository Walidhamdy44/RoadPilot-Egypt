'use client';

import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import { formatSpeed } from '@/shared/utils/format';

/**
 * SpeedDisplay component.
 *
 * Displays the current GPS speed prominently with a large, high-contrast font.
 * Subscribes to the GPS Zustand store and updates within 100ms of new data.
 *
 * Display states:
 * - "—" when acquiring GPS (no position received yet)
 * - "0.0" when speed is below 2 km/h
 * - Formatted speed (1 decimal place) otherwise
 * - Stale indicator when GPS signal is lost
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8
 */
export function SpeedDisplay() {
  const position = useGPSStore((state) => state.position);
  const signalStatus = useGPSStore((state) => state.signalStatus);

  const isAcquiring = signalStatus === 'acquiring';
  const isSignalLost = signalStatus === 'lost';

  // Determine speed display value
  let speedValue: string;
  if (isAcquiring || position === null) {
    // No GPS position received yet — show dash
    speedValue = '—';
  } else if (position.speedKmh < 2) {
    // Below 2 km/h threshold — show zero
    speedValue = '0.0';
  } else {
    speedValue = formatSpeed(position.speedKmh);
  }

  return (
    <div
      className="flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Current speed"
    >
      {/* Speed value — 72px equivalent, high-contrast (4.5:1 minimum) */}
      <span
        className="text-[72px] font-bold leading-none tracking-tight text-foreground tabular-nums"
        aria-label={
          isAcquiring
            ? 'Acquiring GPS signal'
            : `${speedValue} kilometers per hour`
        }
      >
        {speedValue}
      </span>

      {/* Unit label */}
      <span className="mt-1 text-sm font-medium text-muted-foreground">
        km/h
      </span>

      {/* Status indicators */}
      {isAcquiring && (
        <span className="mt-2 text-xs font-medium text-muted-foreground animate-pulse">
          Acquiring GPS…
        </span>
      )}

      {isSignalLost && (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive">
          <span
            className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse"
            aria-hidden="true"
          />
          No GPS Signal
        </span>
      )}
    </div>
  );
}
