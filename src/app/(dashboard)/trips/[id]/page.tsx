'use client';

/**
 * Trip detail/summary page for RoadPilot Egypt.
 *
 * Displays the complete trip summary including:
 * - Numeric metrics (distance, time, speeds, stops)
 * - Map with trip route polyline (MapLibre GL JS)
 * - Speed-over-time chart (Recharts)
 *
 * Loads the trip from IndexedDB by ID and generates the summary.
 * Omits map and speed chart if the GPS trace has fewer than 10 points.
 *
 * **Validates: Requirements 13.2, 13.3, 13.4, 14.2**
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getTripById, type TripRecord } from '@/features/trip/infrastructure/trip-repository';
import {
  generateTripSummary,
  generateSpeedChartData,
  type TripSummary,
  type SpeedChartPoint,
} from '@/features/analytics/domain/analytics-engine';
import { reducePolyline } from '@/features/map/domain/polyline-reducer';
import { MapContainer } from '@/features/map/presentation/components/map-container';
import { TripPolyline } from '@/features/map/presentation/components/trip-polyline';
import { formatDistance, formatTime, formatSpeed } from '@/shared/utils/format';
import { formatDate } from '@/shared/utils/date';
import type { CompletedTrip, GPSTracePoint } from '@/features/trip/domain/trip-types';

/** Dynamically imported SpeedChart — keeps Recharts out of the initial trip detail bundle */
const SpeedChart = dynamic(
  () =>
    import('@/features/analytics/presentation/components/speed-chart').then(
      (mod) => mod.SpeedChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full animate-pulse rounded-xl border border-border bg-neutral-800/40" />
    ),
  }
);

/** Converts a TripRecord from IndexedDB to a CompletedTrip */
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

/** Calculate the center of a GPS trace for map centering */
function traceCenter(trace: GPSTracePoint[]): [number, number] {
  if (trace.length === 0) return [31.2357, 30.0444]; // Default: Cairo

  const sumLng = trace.reduce((s, p) => s + p.lng, 0);
  const sumLat = trace.reduce((s, p) => s + p.lat, 0);

  return [sumLng / trace.length, sumLat / trace.length];
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [speedChartData, setSpeedChartData] = useState<SpeedChartPoint[]>([]);
  const [reducedTrace, setReducedTrace] = useState<GPSTracePoint[]>([]);
  const [fullTrace, setFullTrace] = useState<GPSTracePoint[]>([]);
  const [tripDate, setTripDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const loadTrip = useCallback(async () => {
    if (!tripId) {
      setError('No trip ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const record = await getTripById(tripId);
      if (!record) {
        setError('Trip not found');
        setIsLoading(false);
        return;
      }

      const trip = recordToCompletedTrip(record);
      const tripSummary = generateTripSummary(trip);
      const chartData = generateSpeedChartData(trip.gpsTrace);
      const reduced = reducePolyline(trip.gpsTrace, 500);

      setSummary(tripSummary);
      setSpeedChartData(chartData);
      setReducedTrace(reduced);
      setFullTrace(trip.gpsTrace);
      setTripDate(formatDate(trip.startTimestamp));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load trip'
      );
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const handleMapToggle = useCallback(() => {
    setMapExpanded((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Trip Summary</h1>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Trip Summary</h1>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">{error ?? 'Trip data unavailable'}</p>
        </div>
      </main>
    );
  }

  const mapCenter = traceCenter(reducedTrace);

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Trip Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tripDate}
          {summary.startLocation && ` · ${summary.startLocation}`}
          {summary.endLocation && ` → ${summary.endLocation}`}
        </p>
      </div>

      {/* Numeric metrics grid */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <MetricCard label="Distance" value={`${formatDistance(summary.distance)} km`} />
        <MetricCard label="Elapsed Time" value={formatTime(summary.elapsedTime)} />
        <MetricCard label="Driving Time" value={formatTime(summary.drivingTime)} />
        <MetricCard label="Stop Time" value={formatTime(summary.stopTime)} />
        <MetricCard label="Avg Speed" value={`${formatSpeed(summary.avgSpeed)} km/h`} />
        <MetricCard label="Max Speed" value={`${formatSpeed(summary.maxSpeed)} km/h`} />
        <MetricCard label="Stops" value={`${summary.stopsCount}`} />
      </div>

      {/* Map with polyline (only if sufficient data) */}
      {summary.hasVisualization && (
        <section className="mb-5">
          <MapContainer
            center={mapCenter}
            zoom={12}
            expanded={mapExpanded}
            onToggle={handleMapToggle}
          >
            <TripPolyline tracePoints={reducedTrace} />
          </MapContainer>
        </section>
      )}

      {/* Speed chart (only if sufficient data) */}
      {summary.hasVisualization && (
        <section className="mb-5">
          <SpeedChart data={speedChartData} />
        </section>
      )}

      {/* Insufficient data message */}
      {!summary.hasVisualization && (
        <div className="mb-5 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">
            Insufficient GPS data for map view and speed chart (fewer than 10
            recorded points).
          </p>
        </div>
      )}
    </main>
  );
}

/** A metric card for the trip summary grid */
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
