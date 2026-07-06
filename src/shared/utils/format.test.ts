import { describe, it, expect } from 'vitest';
import {
  formatSpeed,
  formatDistance,
  formatNumber,
  formatTime,
  parseTime,
  formatLatitude,
  formatLongitude,
  formatCoordinates,
} from './format';

describe('formatSpeed', () => {
  it('formats speed with 1 decimal place', () => {
    expect(formatSpeed(120.5)).toBe('120.5');
    expect(formatSpeed(0)).toBe('0.0');
    expect(formatSpeed(99.99)).toBe('100.0');
  });

  it('handles edge cases', () => {
    expect(formatSpeed(-1)).toBe('0.0');
    expect(formatSpeed(NaN)).toBe('0.0');
    expect(formatSpeed(Infinity)).toBe('0.0');
  });
});

describe('formatDistance', () => {
  it('formats distance with 2 decimal places', () => {
    expect(formatDistance(45.123)).toBe('45.12');
    expect(formatDistance(0)).toBe('0.00');
    expect(formatDistance(100.999)).toBe('101.00');
  });

  it('handles edge cases', () => {
    expect(formatDistance(-5)).toBe('0.00');
    expect(formatDistance(NaN)).toBe('0.00');
    expect(formatDistance(Infinity)).toBe('0.00');
  });
});

describe('formatNumber', () => {
  it('formats to specified decimal places', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14');
    expect(formatNumber(3.14159, 4)).toBe('3.1416');
    expect(formatNumber(42, 0)).toBe('42');
  });

  it('handles non-finite values', () => {
    expect(formatNumber(NaN, 2)).toBe('0.00');
    expect(formatNumber(Infinity, 1)).toBe('0.0');
  });
});

describe('formatTime', () => {
  it('formats zero duration', () => {
    expect(formatTime(0)).toBe('00:00:00');
  });

  it('formats typical durations', () => {
    expect(formatTime(1000)).toBe('00:00:01');
    expect(formatTime(60000)).toBe('00:01:00');
    expect(formatTime(3600000)).toBe('01:00:00');
    expect(formatTime(5400000)).toBe('01:30:00');
  });

  it('formats durations near the maximum', () => {
    // 99:59:59 = 359999 seconds = 359,999,000 ms
    expect(formatTime(359999000)).toBe('99:59:59');
  });

  it('clamps values exceeding 99:59:59', () => {
    expect(formatTime(360000000)).toBe('99:59:59');
    expect(formatTime(500000000)).toBe('99:59:59');
  });

  it('handles edge cases', () => {
    expect(formatTime(-100)).toBe('00:00:00');
    expect(formatTime(NaN)).toBe('00:00:00');
    expect(formatTime(Infinity)).toBe('00:00:00');
  });

  it('rounds to nearest second', () => {
    expect(formatTime(1499)).toBe('00:00:01');
    expect(formatTime(1500)).toBe('00:00:02');
    expect(formatTime(500)).toBe('00:00:01');
  });
});

describe('parseTime', () => {
  it('parses valid HH:MM:SS strings', () => {
    expect(parseTime('00:00:00')).toBe(0);
    expect(parseTime('00:00:01')).toBe(1000);
    expect(parseTime('01:30:00')).toBe(5400000);
    expect(parseTime('99:59:59')).toBe(359999000);
  });

  it('rejects invalid formats', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('1:2:3')).toBeNull();
    expect(parseTime('100:00:00')).toBeNull();
    expect(parseTime('00:60:00')).toBeNull();
    expect(parseTime('00:00:60')).toBeNull();
    expect(parseTime('abc')).toBeNull();
  });
});

describe('formatLatitude', () => {
  it('formats with 6 decimal places', () => {
    expect(formatLatitude(30.04442)).toBe('30.044420');
    expect(formatLatitude(-90)).toBe('-90.000000');
    expect(formatLatitude(0)).toBe('0.000000');
  });

  it('handles non-finite values', () => {
    expect(formatLatitude(NaN)).toBe('0.000000');
    expect(formatLatitude(Infinity)).toBe('0.000000');
  });
});

describe('formatLongitude', () => {
  it('formats with 6 decimal places', () => {
    expect(formatLongitude(31.235712)).toBe('31.235712');
    expect(formatLongitude(-180)).toBe('-180.000000');
    expect(formatLongitude(0)).toBe('0.000000');
  });

  it('handles non-finite values', () => {
    expect(formatLongitude(NaN)).toBe('0.000000');
  });
});

describe('formatCoordinates', () => {
  it('formats as "lat, lng" with 6 decimal places', () => {
    expect(formatCoordinates(30.04442, 31.235712)).toBe('30.044420, 31.235712');
  });

  it('handles zero values', () => {
    expect(formatCoordinates(0, 0)).toBe('0.000000, 0.000000');
  });
});
