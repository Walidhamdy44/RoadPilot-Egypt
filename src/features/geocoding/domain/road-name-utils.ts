/**
 * Utilities for processing road names for display.
 */

import { MAX_ROAD_NAME_LENGTH } from './geocoder-types';
import { formatLatitude, formatLongitude } from '@/shared/utils/format';

/**
 * Truncates a road name to the maximum display length.
 * Names exceeding 60 characters are truncated to 57 chars + "...".
 * Names of 60 characters or fewer are returned unchanged.
 *
 * @param name - The road name to truncate
 * @returns Truncated road name (max 60 characters including ellipsis)
 */
export function truncateRoadName(name: string): string {
  if (name.length <= MAX_ROAD_NAME_LENGTH) {
    return name;
  }
  return name.slice(0, MAX_ROAD_NAME_LENGTH - 3) + '...';
}

/**
 * Builds the "Unknown Road" display text with coordinates.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @returns Display string like "Unknown Road (30.044420, 31.235712)"
 */
export function buildUnknownRoadText(lat: number, lng: number): string {
  return `Unknown Road (${formatLatitude(lat)}, ${formatLongitude(lng)})`;
}
