/**
 * Unit tests for heading calculation, cardinal direction mapping,
 * heading fallback, and heading suppression.
 *
 * **Validates: Requirements 4.1, 4.3, 4.4, 4.5**
 */
import { describe, it, expect } from 'vitest';
import {
  calculateBearing,
  headingToCardinal,
  calculateHeadingFallback,
  shouldSuppressHeading,
} from '@/features/gps/domain/haversine';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';

describe('calculateBearing', () => {
  it('should return ~0 (north) when moving due north', () => {
    // Moving north along the same longitude
    const bearing = calculateBearing(30.0, 31.0, 31.0, 31.0);
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('should return ~90 (east) when moving due east', () => {
    // Moving east along the equator
    const bearing = calculateBearing(0, 0, 0, 1);
    expect(bearing).toBeCloseTo(90, 0);
  });

  it('should return ~180 (south) when moving due south', () => {
    // Moving south along the same longitude
    const bearing = calculateBearing(31.0, 31.0, 30.0, 31.0);
    expect(bearing).toBeCloseTo(180, 0);
  });

  it('should return ~270 (west) when moving due west', () => {
    // Moving west along the equator
    const bearing = calculateBearing(0, 1, 0, 0);
    expect(bearing).toBeCloseTo(270, 0);
  });

  it('should return a value in [0, 360)', () => {
    const bearing = calculateBearing(30.0444, 31.2357, 31.2001, 29.9187);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });

  it('should return ~45 (northeast) for a NE direction', () => {
    // Moving northeast
    const bearing = calculateBearing(0, 0, 1, 1);
    expect(bearing).toBeGreaterThan(30);
    expect(bearing).toBeLessThan(60);
  });

  it('should handle identical points (result may be 0 or NaN-like but not throw)', () => {
    // Same point — bearing is undefined but should return 0
    const bearing = calculateBearing(30.0, 31.0, 30.0, 31.0);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });

  it('should calculate bearing from Cairo to Alexandria (roughly NW)', () => {
    // Cairo: 30.0444°N, 31.2357°E
    // Alexandria: 31.2001°N, 29.9187°E → roughly northwest
    const bearing = calculateBearing(30.0444, 31.2357, 31.2001, 29.9187);
    expect(bearing).toBeGreaterThan(300);
    expect(bearing).toBeLessThan(360);
  });
});

describe('headingToCardinal', () => {
  it('should return N for 0 degrees', () => {
    expect(headingToCardinal(0)).toBe('N');
  });

  it('should return N for 359 degrees', () => {
    expect(headingToCardinal(359)).toBe('N');
  });

  it('should return N for 338 degrees (lower boundary)', () => {
    expect(headingToCardinal(338)).toBe('N');
  });

  it('should return N for 22 degrees (upper boundary)', () => {
    expect(headingToCardinal(22)).toBe('N');
  });

  it('should return NE for 23 degrees (lower boundary)', () => {
    expect(headingToCardinal(23)).toBe('NE');
  });

  it('should return NE for 45 degrees', () => {
    expect(headingToCardinal(45)).toBe('NE');
  });

  it('should return NE for 67 degrees (upper boundary)', () => {
    expect(headingToCardinal(67)).toBe('NE');
  });

  it('should return E for 68 degrees (lower boundary)', () => {
    expect(headingToCardinal(68)).toBe('E');
  });

  it('should return E for 90 degrees', () => {
    expect(headingToCardinal(90)).toBe('E');
  });

  it('should return E for 112 degrees (upper boundary)', () => {
    expect(headingToCardinal(112)).toBe('E');
  });

  it('should return SE for 113 degrees (lower boundary)', () => {
    expect(headingToCardinal(113)).toBe('SE');
  });

  it('should return SE for 135 degrees', () => {
    expect(headingToCardinal(135)).toBe('SE');
  });

  it('should return SE for 157 degrees (upper boundary)', () => {
    expect(headingToCardinal(157)).toBe('SE');
  });

  it('should return S for 158 degrees (lower boundary)', () => {
    expect(headingToCardinal(158)).toBe('S');
  });

  it('should return S for 180 degrees', () => {
    expect(headingToCardinal(180)).toBe('S');
  });

  it('should return S for 202 degrees (upper boundary)', () => {
    expect(headingToCardinal(202)).toBe('S');
  });

  it('should return SW for 203 degrees (lower boundary)', () => {
    expect(headingToCardinal(203)).toBe('SW');
  });

  it('should return SW for 225 degrees', () => {
    expect(headingToCardinal(225)).toBe('SW');
  });

  it('should return SW for 247 degrees (upper boundary)', () => {
    expect(headingToCardinal(247)).toBe('SW');
  });

  it('should return W for 248 degrees (lower boundary)', () => {
    expect(headingToCardinal(248)).toBe('W');
  });

  it('should return W for 270 degrees', () => {
    expect(headingToCardinal(270)).toBe('W');
  });

  it('should return W for 292 degrees (upper boundary)', () => {
    expect(headingToCardinal(292)).toBe('W');
  });

  it('should return NW for 293 degrees (lower boundary)', () => {
    expect(headingToCardinal(293)).toBe('NW');
  });

  it('should return NW for 315 degrees', () => {
    expect(headingToCardinal(315)).toBe('NW');
  });

  it('should return NW for 337 degrees (upper boundary)', () => {
    expect(headingToCardinal(337)).toBe('NW');
  });

  it('should handle negative heading by normalizing', () => {
    // -90 normalizes to 270 → W
    expect(headingToCardinal(-90)).toBe('W');
  });

  it('should handle heading >= 360 by normalizing', () => {
    // 450 normalizes to 90 → E
    expect(headingToCardinal(450)).toBe('E');
  });
});

describe('calculateHeadingFallback', () => {
  const makePosition = (
    lat: number,
    lon: number,
    overrides?: Partial<ValidatedPosition>
  ): ValidatedPosition => ({
    latitude: lat,
    longitude: lon,
    speedKmh: 50,
    heading: null,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides,
  });

  it('should return null when positions are less than 5 meters apart', () => {
    // Two points very close together (same location)
    const prev = makePosition(30.0444, 31.2357);
    const curr = makePosition(30.0444, 31.2357);
    expect(calculateHeadingFallback(prev, curr)).toBeNull();
  });

  it('should return null when positions are just under 5 meters apart', () => {
    // ~3 meters apart (approx 0.00003 degrees latitude)
    const prev = makePosition(30.044400, 31.2357);
    const curr = makePosition(30.044430, 31.2357);
    expect(calculateHeadingFallback(prev, curr)).toBeNull();
  });

  it('should return a heading when positions are ≥ 5 meters apart (moving north)', () => {
    // ~100 meters north (approx 0.001 degrees latitude)
    const prev = makePosition(30.0444, 31.2357);
    const curr = makePosition(30.0454, 31.2357);
    const heading = calculateHeadingFallback(prev, curr);
    expect(heading).not.toBeNull();
    // Should be roughly 0 (north)
    expect(heading!).toBeCloseTo(0, 0);
  });

  it('should return ~90 when moving due east with sufficient distance', () => {
    // ~100 meters east at equator
    const prev = makePosition(0, 31.2357);
    const curr = makePosition(0, 31.2367);
    const heading = calculateHeadingFallback(prev, curr);
    expect(heading).not.toBeNull();
    expect(heading!).toBeCloseTo(90, 0);
  });

  it('should return ~180 when moving due south with sufficient distance', () => {
    const prev = makePosition(30.0454, 31.2357);
    const curr = makePosition(30.0444, 31.2357);
    const heading = calculateHeadingFallback(prev, curr);
    expect(heading).not.toBeNull();
    expect(heading!).toBeCloseTo(180, 0);
  });

  it('should return a value in [0, 360) when positions are far enough apart', () => {
    const prev = makePosition(30.0444, 31.2357);
    const curr = makePosition(30.0500, 31.2400);
    const heading = calculateHeadingFallback(prev, curr);
    expect(heading).not.toBeNull();
    expect(heading!).toBeGreaterThanOrEqual(0);
    expect(heading!).toBeLessThan(360);
  });
});

describe('shouldSuppressHeading', () => {
  it('should return true when speed is 0 km/h', () => {
    expect(shouldSuppressHeading(0)).toBe(true);
  });

  it('should return true when speed is 1 km/h', () => {
    expect(shouldSuppressHeading(1)).toBe(true);
  });

  it('should return true when speed is 1.99 km/h', () => {
    expect(shouldSuppressHeading(1.99)).toBe(true);
  });

  it('should return false when speed is exactly 2 km/h', () => {
    expect(shouldSuppressHeading(2)).toBe(false);
  });

  it('should return false when speed is 5 km/h', () => {
    expect(shouldSuppressHeading(5)).toBe(false);
  });

  it('should return false when speed is 120 km/h', () => {
    expect(shouldSuppressHeading(120)).toBe(false);
  });
});
