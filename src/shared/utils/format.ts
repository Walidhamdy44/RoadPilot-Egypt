/**
 * Shared formatting utilities for the RoadPilot Egypt dashboard.
 * All functions are pure (no side effects).
 */

/**
 * Formats a speed value in km/h with 1 decimal place.
 *
 * @param kmh - Speed in kilometers per hour (non-negative)
 * @returns Formatted speed string (e.g. "120.5")
 */
export function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh < 0) {
    return '0.0';
  }
  return kmh.toFixed(1);
}

/**
 * Formats a distance value in kilometers with 2 decimal places.
 *
 * @param km - Distance in kilometers (non-negative)
 * @returns Formatted distance string (e.g. "45.32")
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return '0.00';
  }
  return km.toFixed(2);
}

/**
 * Formats a number to a specified number of decimal places.
 *
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places (non-negative integer)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimalPlaces: number): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(decimalPlaces);
  }
  return value.toFixed(decimalPlaces);
}

/**
 * Formats a duration in milliseconds to HH:MM:SS format.
 * Supports display up to 99:59:59 (359,999,000 ms).
 * Values exceeding 99:59:59 are clamped.
 *
 * @param ms - Duration in milliseconds (non-negative, 0 to 359,999,000)
 * @returns Formatted time string in HH:MM:SS format (e.g. "02:15:30")
 */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '00:00:00';
  }

  // Round to nearest second
  const totalSeconds = Math.round(ms / 1000);

  // Clamp to 99:59:59
  const maxSeconds = 99 * 3600 + 59 * 60 + 59;
  const clampedSeconds = Math.min(totalSeconds, maxSeconds);

  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

/**
 * Parses an HH:MM:SS time string back to milliseconds.
 *
 * @param timeStr - Time string in HH:MM:SS format
 * @returns Duration in milliseconds, or null if the format is invalid
 */
export function parseTime(timeStr: string): number | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  if (hours > 99 || minutes > 59 || seconds > 59) {
    return null;
  }

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Formats a latitude value with 6 decimal places.
 *
 * @param lat - Latitude in decimal degrees (-90 to 90)
 * @returns Formatted latitude string (e.g. "30.044420")
 */
export function formatLatitude(lat: number): string {
  if (!Number.isFinite(lat)) {
    return '0.000000';
  }
  return lat.toFixed(6);
}

/**
 * Formats a longitude value with 6 decimal places.
 *
 * @param lng - Longitude in decimal degrees (-180 to 180)
 * @returns Formatted longitude string (e.g. "31.235712")
 */
export function formatLongitude(lng: number): string {
  if (!Number.isFinite(lng)) {
    return '0.000000';
  }
  return lng.toFixed(6);
}

/**
 * Formats coordinates as a "latitude, longitude" string with 6 decimal places.
 * Suitable for clipboard copy operations.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @returns Formatted coordinate string (e.g. "30.044420, 31.235712")
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${formatLatitude(lat)}, ${formatLongitude(lng)}`;
}

/** Type for the formatSpeed function */
export type FormatSpeedFn = typeof formatSpeed;

/** Type for the formatDistance function */
export type FormatDistanceFn = typeof formatDistance;

/** Type for the formatNumber function */
export type FormatNumberFn = typeof formatNumber;

/** Type for the formatTime function */
export type FormatTimeFn = typeof formatTime;

/** Type for the parseTime function */
export type ParseTimeFn = typeof parseTime;

/** Type for the formatLatitude function */
export type FormatLatitudeFn = typeof formatLatitude;

/** Type for the formatLongitude function */
export type FormatLongitudeFn = typeof formatLongitude;

/** Type for the formatCoordinates function */
export type FormatCoordinatesFn = typeof formatCoordinates;
