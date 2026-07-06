'use client';

/**
 * Trip metrics grid component.
 *
 * Displays active trip statistics in a compact grid layout:
 * - Distance traveled (km)
 * - Elapsed time (HH:MM:SS)
 * - Average speed (km/h)
 * - Max speed (km/h)
 * - Driving time (HH:MM:SS)
 * - Stop time (HH:MM:SS)
 *
 * Optimized for 360-428px mobile width with a 2-column grid.
 * Shows placeholder dashes when no trip is active.
 *
 * Uses granular Zustand selectors and memoized sub-components
 * to minimize re-renders during frequent GPS updates.
 *
 * **Validates: Requirements 5.3, 7.2, 8.4, 9.2, 10.5**
 */

import { memo } from 'react';
import { useTripMetrics } from '@/features/trip/presentation/hooks/use-trip-store';
import { formatDistance, formatSpeed, formatTime } from '@/shared/utils/format';

export function TripMetrics() {
  const { distance, avgSpeed, maxSpeed, drivingTime, stopTime, startTimestamp, isActive } =
    useTripMetrics();

  // Format values
  const formattedDistance = isActive ? formatDistance(distance) : '0.00';
  const formattedElapsed = isActive
    ? formatTime(Date.now() - startTimestamp)
    : '00:00:00';
  const formattedAvgSpeed = isActive ? formatSpeed(avgSpeed) : '0.0';
  const formattedMaxSpeed = isActive ? formatSpeed(maxSpeed) : '0.0';
  const formattedDrivingTime = isActive ? formatTime(drivingTime) : '00:00:00';
  const formattedStopTime = isActive ? formatTime(stopTime) : '00:00:00';

  return (
    <div
      className="grid grid-cols-2 gap-3"
      role="region"
      aria-label="Trip metrics"
    >
      <MetricCard
        label="Distance"
        value={formattedDistance}
        unit="km"
        active={isActive}
      />
      <MetricCard
        label="Elapsed"
        value={formattedElapsed}
        active={isActive}
      />
      <MetricCard
        label="Avg Speed"
        value={formattedAvgSpeed}
        unit="km/h"
        active={isActive}
      />
      <MetricCard
        label="Max Speed"
        value={formattedMaxSpeed}
        unit="km/h"
        active={isActive}
      />
      <MetricCard
        label="Driving"
        value={formattedDrivingTime}
        active={isActive}
      />
      <MetricCard
        label="Stops"
        value={formattedStopTime}
        active={isActive}
      />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  active: boolean;
}

/**
 * Memoized metric card to prevent re-renders when sibling metrics change
 * but this card's props remain identical.
 */
const MetricCard = memo(function MetricCard({ label, value, unit, active }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`text-lg font-semibold tabular-nums ${
            active ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
});
