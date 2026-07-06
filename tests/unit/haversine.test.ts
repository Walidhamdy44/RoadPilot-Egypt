/**
 * Unit tests for Haversine distance calculation.
 *
 * Tests known distances between Egyptian cities and edge cases.
 *
 * **Validates: Requirements 5.1**
 */
import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, toRadians } from '@/features/gps/domain/haversine';

describe('toRadians', () => {
  it('should convert 0 degrees to 0 radians', () => {
    expect(toRadians(0)).toBe(0);
  });

  it('should convert 180 degrees to π radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('should convert 90 degrees to π/2 radians', () => {
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('should convert 360 degrees to 2π radians', () => {
    expect(toRadians(360)).toBeCloseTo(2 * Math.PI, 10);
  });

  it('should handle negative degrees', () => {
    expect(toRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe('haversineDistanceKm', () => {
  it('should return 0 for identical points', () => {
    const distance = haversineDistanceKm(30.0444, 31.2357, 30.0444, 31.2357);
    expect(distance).toBe(0);
  });

  it('should calculate Cairo to Alexandria distance (~180 km)', () => {
    // Cairo: 30.0444°N, 31.2357°E
    // Alexandria: 31.2001°N, 29.9187°E
    const distance = haversineDistanceKm(30.0444, 31.2357, 31.2001, 29.9187);
    // Known distance is approximately 180 km (straight line)
    expect(distance).toBeGreaterThan(170);
    expect(distance).toBeLessThan(190);
  });

  it('should calculate Cairo to Hurghada distance (~400 km)', () => {
    // Cairo: 30.0444°N, 31.2357°E
    // Hurghada: 27.2579°N, 33.8116°E
    const distance = haversineDistanceKm(30.0444, 31.2357, 27.2579, 33.8116);
    // Straight-line (great-circle) distance is approximately 399 km
    expect(distance).toBeGreaterThan(390);
    expect(distance).toBeLessThan(410);
  });

  it('should calculate a short distance (within a city block ~1 km)', () => {
    // Two nearby points in Cairo
    const distance = haversineDistanceKm(30.0444, 31.2357, 30.0534, 31.2357);
    // ~1 km apart in latitude
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });

  it('should be symmetric (distance A→B equals B→A)', () => {
    const ab = haversineDistanceKm(30.0444, 31.2357, 31.2001, 29.9187);
    const ba = haversineDistanceKm(31.2001, 29.9187, 30.0444, 31.2357);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('should calculate antipodal distance (half circumference ~20,015 km)', () => {
    // Point and its antipodal point
    const distance = haversineDistanceKm(0, 0, 0, 180);
    // Half the Earth's circumference ≈ π * 6371 ≈ 20015 km
    expect(distance).toBeCloseTo(Math.PI * 6371, 0);
  });

  it('should handle crossing the prime meridian', () => {
    // Point west of Greenwich to point east of Greenwich
    const distance = haversineDistanceKm(51.5074, -0.1278, 51.5074, 0.1278);
    // Small distance, about 17.8 km along the same latitude
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20);
  });

  it('should handle crossing the equator', () => {
    // Point north of equator to south
    const distance = haversineDistanceKm(1, 31.2357, -1, 31.2357);
    // 2 degrees of latitude ≈ 222 km
    expect(distance).toBeGreaterThan(220);
    expect(distance).toBeLessThan(224);
  });

  it('should return non-negative for any valid input', () => {
    const distance = haversineDistanceKm(-90, -180, 90, 180);
    expect(distance).toBeGreaterThanOrEqual(0);
  });
});
