'use client';

/**
 * Trip History List Page.
 *
 * Displays a scrollable list of completed trips loaded from IndexedDB
 * with pagination (initial batch of 20, "Load more" for next pages).
 *
 * Each trip card shows:
 * - Date (formatted)
 * - Distance (e.g., "152.45 km")
 * - Duration (HH:MM:SS)
 * - Start → End location names (or coordinates if no names)
 * - TripSyncBadge showing sync status
 *
 * Links each entry to the trip detail page (/trips/[id]).
 * Shows empty state when no trips exist.
 * Dark-mode-first design.
 *
 * **Validates: Requirements 12.3, 13.3**
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

import { queryTrips, type TripRecord } from '@/features/trip/infrastructure/trip-repository';
import { TripSyncBadge, type TripSyncStatus } from '@/features/sync/presentation/components/sync-indicator';
import { formatDistance, formatTime } from '@/shared/utils/format';
import { formatDate } from '@/shared/utils/date';

const PAGE_SIZE = 20;

export default function TripsPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadTrips = useCallback(async (currentOffset: number, append: boolean) => {
    try {
      const results = await queryTrips({
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      if (append) {
        setTrips((prev) => [...prev, ...results]);
      } else {
        setTrips(results);
      }

      setHasMore(results.length === PAGE_SIZE);
      setOffset(currentOffset + results.length);
    } catch {
      // Silently handle errors — trips will show empty state
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadTrips(0, false).finally(() => setLoading(false));
  }, [loadTrips]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTrips(offset, true);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Trip History</h1>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            <p className="text-sm text-zinc-400">Loading trips…</p>
          </div>
        </div>
      </main>
    );
  }

  if (trips.length === 0) {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Trip History</h1>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-8 w-8 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-zinc-200">No trips yet</h2>
            <p className="text-sm text-zinc-400">
              Start recording a trip from the dashboard to see your trip history here.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-4">Trip History</h1>

      <div className="flex flex-col gap-3 overflow-y-auto pb-6">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}

        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mt-2 w-full rounded-lg bg-zinc-800 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </main>
  );
}

/**
 * Formats location text for a trip entry.
 * Uses location name if available, falls back to coordinates.
 */
function formatLocation(
  name: string | null,
  coordinates: { lat: number; lng: number } | null
): string {
  if (name) return name;
  if (coordinates) return `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
  return 'Unknown';
}

interface TripCardProps {
  trip: TripRecord;
}

function TripCard({ trip }: TripCardProps) {
  const date = formatDate(trip.startTimestamp);
  const distance = `${formatDistance(trip.totalDistanceKm)} km`;
  const duration = formatTime(trip.drivingTimeMs + trip.stopTimeMs);
  const startLocation = formatLocation(trip.startLocationName, trip.startCoordinates);
  const endLocation = formatLocation(trip.endLocationName, trip.endCoordinates);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block rounded-xl bg-zinc-800/60 p-4 transition-colors hover:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Date */}
          <p className="text-xs text-zinc-400 mb-1">{date}</p>

          {/* Start → End */}
          <p className="text-sm font-medium text-zinc-200 truncate">
            {startLocation}
            <span className="mx-1.5 text-zinc-500">→</span>
            {endLocation}
          </p>

          {/* Distance and Duration */}
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              {distance}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              {duration}
            </span>
          </div>
        </div>

        {/* Sync status badge */}
        <div className="flex-shrink-0 pt-0.5">
          <TripSyncBadge syncStatus={trip.syncStatus as TripSyncStatus} />
        </div>
      </div>
    </Link>
  );
}
