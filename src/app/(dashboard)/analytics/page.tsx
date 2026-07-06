'use client';

/**
 * Analytics page for RoadPilot Egypt.
 *
 * Displays weekly/monthly aggregate metrics as numeric summary cards
 * and a time-series chart showing distance and trip count over time.
 * Uses Recharts for visualizations and IndexedDB for trip data retrieval.
 *
 * Chart components are dynamically imported to keep Recharts (~300KB)
 * out of the initial JS bundle, improving first meaningful paint.
 *
 * **Validates: Requirements 13.2, 14.2**
 */

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { queryTrips } from '@/features/trip/infrastructure/trip-repository';
import {
  computeWeeklyAggregates,
  computeMonthlyAggregates,
  type WeeklyAggregate,
  type MonthlyAggregate,
} from '@/features/analytics/domain/aggregate-analytics';
import type { DistanceChartPoint } from '@/features/analytics/presentation/components/distance-chart';
import { formatDistance, formatTime, formatSpeed } from '@/shared/utils/format';
import type { CompletedTrip } from '@/features/trip/domain/trip-types';
import type { TripRecord } from '@/features/trip/infrastructure/trip-repository';

/** Dynamically imported DistanceChart — keeps Recharts out of the initial bundle */
const DistanceChart = dynamic(
  () =>
    import('@/features/analytics/presentation/components/distance-chart').then(
      (mod) => mod.DistanceChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full animate-pulse rounded-xl border border-border bg-neutral-800/40" />
    ),
  }
);

type ViewMode = 'weekly' | 'monthly';

/** Converts a TripRecord from IndexedDB to a CompletedTrip for analytics */
function recordToCompletedTrip(record: TripRecord): CompletedTrip {
  return {
    id: record.id,
    startTimestamp: record.startTimestamp,
    endTimestamp: record.endTimestamp ?? record.startTimestamp,
    totalDistanceKm: record.totalDistanceKm,
    drivingTimeMs: record.drivingTimeMs,
    stopTimeMs: record.stopTimeMs,
    averageSpeedKmh: record.averageSpeedKmh,
    maxSpeedKmh: record.maxSpeedKmh,
    maxSpeedTimestamp: record.maxSpeedTimestamp,
    maxSpeedCoordinates: record.maxSpeedCoordinates,
    numberOfStops: record.numberOfStops ?? record.stopEvents?.length ?? 0,
    startLocationName: record.startLocationName,
    endLocationName: record.endLocationName,
    startCoordinates: record.startCoordinates,
    endCoordinates: record.endCoordinates ?? record.startCoordinates,
    gpsTrace: record.gpsTrace,
    stopEvents: record.stopEvents,
  };
}

/** Format a week-start timestamp into a readable label */
function formatWeekLabel(weekStartMs: number): string {
  const date = new Date(weekStartMs);
  const month = date.toLocaleString('en', { month: 'short' });
  const day = date.getUTCDate();
  return `${month} ${day}`;
}

/** Format a month-start timestamp into a readable label */
function formatMonthLabel(monthStartMs: number): string {
  const date = new Date(monthStartMs);
  return date.toLocaleString('en', { month: 'short', year: '2-digit' });
}

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [weeklyAggregates, setWeeklyAggregates] = useState<WeeklyAggregate[]>([]);
  const [monthlyAggregates, setMonthlyAggregates] = useState<MonthlyAggregate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const records = await queryTrips();
      const trips = records.map(recordToCompletedTrip);

      const weekly = computeWeeklyAggregates(trips);
      const monthly = computeMonthlyAggregates(trips);

      setWeeklyAggregates(weekly);
      setMonthlyAggregates(monthly);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load analytics data'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Compute overall totals from selected view
  const aggregates = viewMode === 'weekly' ? weeklyAggregates : monthlyAggregates;

  const totalDistance = aggregates.reduce((sum, a) => sum + a.totalDistanceKm, 0);
  const totalDrivingTime = aggregates.reduce((sum, a) => sum + a.totalDrivingTimeMs, 0);
  const totalStopTime = aggregates.reduce((sum, a) => sum + a.totalStopTimeMs, 0);
  const totalTrips = aggregates.reduce((sum, a) => sum + a.tripCount, 0);
  const overallAvgSpeed =
    totalDrivingTime > 0
      ? totalDistance / (totalDrivingTime / 3_600_000)
      : 0;
  const isPartial = aggregates.some((a) => a.isPartial);

  // Build chart data
  const chartData: DistanceChartPoint[] = aggregates.map((a) => ({
    label:
      viewMode === 'weekly'
        ? formatWeekLabel((a as WeeklyAggregate).weekStart)
        : formatMonthLabel((a as MonthlyAggregate).monthStart),
    distanceKm: Math.round(a.totalDistanceKm * 10) / 10,
    tripCount: a.tripCount,
  }));

  if (isLoading) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Analytics</h1>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Analytics</h1>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  if (totalTrips === 0) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Analytics</h1>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No trip data available. Complete some trips to see analytics.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Analytics</h1>

      {/* View mode toggle */}
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setViewMode('weekly')}
        >
          Weekly
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setViewMode('monthly')}
        >
          Monthly
        </button>
      </div>

      {/* Partial data warning */}
      {isPartial && (
        <div className="mb-4 rounded-lg border border-yellow-600/30 bg-yellow-900/20 px-3 py-2">
          <p className="text-xs text-yellow-400">
            Some trip data was excluded due to corrupted or missing records.
          </p>
        </div>
      )}

      {/* Numeric summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <SummaryCard label="Total Distance" value={`${formatDistance(totalDistance)} km`} />
        <SummaryCard label="Total Trips" value={`${totalTrips}`} />
        <SummaryCard label="Driving Time" value={formatTime(totalDrivingTime)} />
        <SummaryCard label="Stop Time" value={formatTime(totalStopTime)} />
        <SummaryCard label="Avg Speed" value={`${formatSpeed(overallAvgSpeed)} km/h`} />
        <SummaryCard
          label="Periods"
          value={`${aggregates.length} ${viewMode === 'weekly' ? 'weeks' : 'months'}`}
        />
      </div>

      {/* Time-series chart */}
      <DistanceChart data={chartData} useBarChart height={220} />
    </main>
  );
}

/** A numeric summary card for the analytics grid */
function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
