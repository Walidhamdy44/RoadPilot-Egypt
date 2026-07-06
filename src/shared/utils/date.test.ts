import { describe, it, expect } from 'vitest';
import {
  toISO8601,
  fromISO8601,
  elapsedMs,
  startOfDayUTC,
  startOfWeekUTC,
  startOfMonthUTC,
  formatTimeOfDay,
  formatDate,
  isWithinRange,
  msToHours,
  msToSeconds,
} from './date';

describe('toISO8601', () => {
  it('converts timestamp to ISO 8601 string', () => {
    // 2024-03-15T12:00:00.000Z
    const ts = 1710504000000;
    expect(toISO8601(ts)).toBe('2024-03-15T12:00:00.000Z');
  });

  it('handles epoch zero', () => {
    expect(toISO8601(0)).toBe('1970-01-01T00:00:00.000Z');
  });

  it('handles non-finite input', () => {
    expect(toISO8601(NaN)).toBe('1970-01-01T00:00:00.000Z');
    expect(toISO8601(Infinity)).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('fromISO8601', () => {
  it('parses valid ISO 8601 strings', () => {
    expect(fromISO8601('2024-03-15T12:00:00.000Z')).toBe(1710504000000);
    expect(fromISO8601('1970-01-01T00:00:00.000Z')).toBe(0);
  });

  it('returns null for invalid strings', () => {
    expect(fromISO8601('')).toBeNull();
    expect(fromISO8601('not-a-date')).toBeNull();
    expect(fromISO8601('Invalid Date')).toBeNull();
  });
});

describe('elapsedMs', () => {
  it('calculates positive elapsed time', () => {
    expect(elapsedMs(1000, 5000)).toBe(4000);
  });

  it('returns 0 when end is before start', () => {
    expect(elapsedMs(5000, 1000)).toBe(0);
  });

  it('returns 0 when start equals end', () => {
    expect(elapsedMs(1000, 1000)).toBe(0);
  });
});

describe('startOfDayUTC', () => {
  it('returns midnight UTC for a given timestamp', () => {
    // 2024-03-15T14:30:00.000Z → 2024-03-15T00:00:00.000Z
    const ts = 1710513000000; // 14:30
    const expected = 1710460800000; // midnight
    expect(startOfDayUTC(ts)).toBe(expected);
  });
});

describe('startOfWeekUTC', () => {
  it('returns Monday midnight for a Wednesday', () => {
    // 2024-03-13 is a Wednesday
    const wednesday = Date.UTC(2024, 2, 13, 10, 0, 0);
    const monday = Date.UTC(2024, 2, 11, 0, 0, 0);
    expect(startOfWeekUTC(wednesday)).toBe(monday);
  });

  it('returns same day for a Monday', () => {
    const monday = Date.UTC(2024, 2, 11, 15, 30, 0);
    const mondayMidnight = Date.UTC(2024, 2, 11, 0, 0, 0);
    expect(startOfWeekUTC(monday)).toBe(mondayMidnight);
  });

  it('handles Sunday (goes back to previous Monday)', () => {
    const sunday = Date.UTC(2024, 2, 17, 12, 0, 0);
    const monday = Date.UTC(2024, 2, 11, 0, 0, 0);
    expect(startOfWeekUTC(sunday)).toBe(monday);
  });
});

describe('startOfMonthUTC', () => {
  it('returns first day of month at midnight', () => {
    const mid = Date.UTC(2024, 2, 15, 10, 30, 0);
    const first = Date.UTC(2024, 2, 1, 0, 0, 0);
    expect(startOfMonthUTC(mid)).toBe(first);
  });
});

describe('formatTimeOfDay', () => {
  it('formats timestamps as HH:MM local time', () => {
    // We can't predict exact output due to timezone, but can verify format
    const result = formatTimeOfDay(1710504000000);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('handles non-finite values', () => {
    expect(formatTimeOfDay(NaN)).toBe('00:00');
    expect(formatTimeOfDay(Infinity)).toBe('00:00');
  });
});

describe('formatDate', () => {
  it('handles non-finite input', () => {
    expect(formatDate(NaN)).toBe('');
  });

  it('returns a non-empty string for valid timestamps', () => {
    const result = formatDate(1710504000000);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('isWithinRange', () => {
  it('returns true when within range', () => {
    expect(isWithinRange(5, 1, 10)).toBe(true);
  });

  it('returns true at boundaries', () => {
    expect(isWithinRange(1, 1, 10)).toBe(true);
    expect(isWithinRange(10, 1, 10)).toBe(true);
  });

  it('returns false when outside range', () => {
    expect(isWithinRange(0, 1, 10)).toBe(false);
    expect(isWithinRange(11, 1, 10)).toBe(false);
  });
});

describe('msToHours', () => {
  it('converts milliseconds to hours', () => {
    expect(msToHours(3_600_000)).toBe(1);
    expect(msToHours(7_200_000)).toBe(2);
    expect(msToHours(1_800_000)).toBe(0.5);
  });
});

describe('msToSeconds', () => {
  it('converts milliseconds to whole seconds', () => {
    expect(msToSeconds(1000)).toBe(1);
    expect(msToSeconds(1500)).toBe(1);
    expect(msToSeconds(2999)).toBe(2);
  });
});
