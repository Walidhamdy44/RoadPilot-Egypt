/**
 * Date and time helper utilities for the RoadPilot Egypt dashboard.
 * All functions are pure (no side effects) unless otherwise noted.
 */

/**
 * Converts a Unix epoch timestamp (milliseconds) to an ISO 8601 string.
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @returns ISO 8601 formatted date-time string (e.g. "2024-03-15T14:30:00.000Z")
 */
export function toISO8601(timestampMs: number): string {
  if (!Number.isFinite(timestampMs)) {
    return new Date(0).toISOString();
  }
  return new Date(timestampMs).toISOString();
}

/**
 * Parses an ISO 8601 date-time string to a Unix epoch timestamp (milliseconds).
 *
 * @param isoString - ISO 8601 formatted date-time string
 * @returns Unix epoch timestamp in milliseconds, or null if parsing fails
 */
export function fromISO8601(isoString: string): number | null {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date.getTime();
}

/**
 * Returns the current timestamp in milliseconds (Unix epoch).
 * This is the only impure function — it reads the system clock.
 *
 * @returns Current Unix epoch timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Calculates the elapsed duration between two timestamps.
 *
 * @param startMs - Start timestamp in milliseconds
 * @param endMs - End timestamp in milliseconds
 * @returns Duration in milliseconds (non-negative; returns 0 if end < start)
 */
export function elapsedMs(startMs: number, endMs: number): number {
  const diff = endMs - startMs;
  return diff > 0 ? diff : 0;
}

/**
 * Returns the start of the day (00:00:00.000) for a given timestamp.
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @returns Timestamp of the start of that day in UTC
 */
export function startOfDayUTC(timestampMs: number): number {
  const date = new Date(timestampMs);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Returns the start of the week (Monday 00:00:00.000 UTC) for a given timestamp.
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @returns Timestamp of Monday 00:00:00.000 UTC of that week
 */
export function startOfWeekUTC(timestampMs: number): number {
  const date = new Date(timestampMs);
  date.setUTCHours(0, 0, 0, 0);
  // getUTCDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  const day = date.getUTCDay();
  // Shift so Monday=0, Sunday=6
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.getTime();
}

/**
 * Returns the start of the month (1st day, 00:00:00.000 UTC) for a given timestamp.
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @returns Timestamp of the first day of that month at 00:00:00.000 UTC
 */
export function startOfMonthUTC(timestampMs: number): number {
  const date = new Date(timestampMs);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Formats a timestamp as HH:MM in 24-hour format (for ETA display).
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @returns Time string in HH:MM 24-hour format (e.g. "14:30")
 */
export function formatTimeOfDay(timestampMs: number): string {
  if (!Number.isFinite(timestampMs)) {
    return '00:00';
  }
  const date = new Date(timestampMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats a timestamp as a localized date string for display in trip history.
 *
 * @param timestampMs - Unix epoch timestamp in milliseconds
 * @param locale - Locale string (default: 'en')
 * @returns Formatted date string (e.g. "Mar 15, 2024")
 */
export function formatDate(timestampMs: number, locale: string = 'en'): string {
  if (!Number.isFinite(timestampMs)) {
    return '';
  }
  const date = new Date(timestampMs);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Checks whether a given timestamp falls within a date range (inclusive).
 *
 * @param timestampMs - The timestamp to check
 * @param startMs - Start of range (inclusive)
 * @param endMs - End of range (inclusive)
 * @returns true if timestampMs is within [startMs, endMs]
 */
export function isWithinRange(
  timestampMs: number,
  startMs: number,
  endMs: number
): boolean {
  return timestampMs >= startMs && timestampMs <= endMs;
}

/**
 * Converts milliseconds to hours (floating point).
 *
 * @param ms - Duration in milliseconds
 * @returns Duration in hours
 */
export function msToHours(ms: number): number {
  return ms / 3_600_000;
}

/**
 * Converts milliseconds to seconds (integer, rounded down).
 *
 * @param ms - Duration in milliseconds
 * @returns Duration in whole seconds
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

/** Type for the toISO8601 function */
export type ToISO8601Fn = typeof toISO8601;

/** Type for the fromISO8601 function */
export type FromISO8601Fn = typeof fromISO8601;

/** Type for the formatTimeOfDay function */
export type FormatTimeOfDayFn = typeof formatTimeOfDay;

/** Type for the formatDate function */
export type FormatDateFn = typeof formatDate;
