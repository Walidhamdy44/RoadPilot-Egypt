'use client';

import { type GeocodeResult } from '../../domain/geocoder-types';

interface RoadNameDisplayProps {
  /** The geocode result to display, or null while loading. */
  result: GeocodeResult | null;
}

/**
 * Displays the current road name resolved from GPS coordinates.
 *
 * - Shows a loading skeleton when result is null (awaiting first geocode).
 * - Shows the resolved road name via `displayText`.
 * - Shows a "cached" badge when the result is from offline cache.
 * - The displayText already contains "Unknown Road (lat, lng)" when no name is resolved,
 *   and truncation to 60 characters is handled at the domain layer.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.6
 */
export function RoadNameDisplay({ result }: RoadNameDisplayProps) {
  if (result === null) {
    return (
      <div className="flex items-center gap-2" aria-label="Loading road name">
        <div className="h-5 w-48 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="truncate text-sm font-medium text-foreground"
        title={result.displayText}
        aria-label={`Current road: ${result.displayText}`}
      >
        {result.displayText}
      </span>
      {result.cached && (
        <span
          className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          aria-label="Cached result"
        >
          cached
        </span>
      )}
    </div>
  );
}
