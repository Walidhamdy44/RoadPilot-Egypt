/**
 * Unit tests for the Trip Engine.
 *
 * Tests core trip functionality: starting trips, processing positions,
 * distance accumulation, accuracy filtering, elapsed time calculation,
 * average speed, and ETA computation.
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 7.1, 7.3, 7.4**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';
import {
  createTripEngine,
  calculateAverageSpeed,
  calculateETA,
  getElapsedTimeMs,
} from '@/features/trip/domain/trip-engine';

// Mock IndexedDB via the idb module
const mockPut = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue(null);

vi.mock('@/lib/idb/index', () => ({
  getDB: vi.fn().mockResolvedValue({
    put: (...args: unknown[]) => mockPut(...args),
    get: (...args: unknown[]) => mockGet(...args),
  }),
}));

/** Helper to create a ValidatedPosition with defaults. */
function makePosition(
  overrides: Partial<ValidatedPosition> = {}
): ValidatedPosition {
  return {
    latitude: 30.0444,
    longitude: 31.2357,
    speedKmh: 60,
    heading: null,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('TripEngine', () => {
  let engine: ReturnType<typeof createTripEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createTripEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startTrip', () => {
    it('should return a trip state with status active', async () => {
      const state = await engine.startTrip();

      expect(state.status).toBe('active');
      expect(state.id).toBeTruthy();
      expect(state.startTimestamp).toBeGreaterThan(0);
      expect(state.endTimestamp).toBeNull();
      expect(state.totalDistanceKm).toBe(0);
      expect(state.drivingTimeMs).toBe(0);
      expect(state.stopTimeMs).toBe(0);
      expect(state.averageSpeedKmh).toBe(0);
      expect(state.maxSpeedKmh).toBe(0);
      expect(state.currentSpeedKmh).toBe(0);
      expect(state.gpsTrace).toEqual([]);
      expect(state.stopEvents).toEqual([]);
      expect(state.destination).toBeNull();
      expect(state.remainingDistanceKm).toBeNull();
      expect(state.etaTimestamp).toBeNull();
    });

    it('should persist start timestamp to IndexedDB immediately (Req 7.1)', async () => {
      const state = await engine.startTrip();

      expect(mockPut).toHaveBeenCalledWith(
        'activeTrip',
        expect.objectContaining({
          tripId: state.id,
          startTimestamp: state.startTimestamp,
          totalDistanceKm: 0,
        }),
        'current'
      );
    });

    it('should generate a unique ID for each trip', async () => {
      const state1 = await engine.startTrip();
      // Need a new engine instance since the first one has internal state
      const engine2 = createTripEngine();
      const state2 = await engine2.startTrip();

      expect(state1.id).not.toBe(state2.id);
    });
  });

  describe('processPosition', () => {
    it('should update current speed from position', async () => {
      const state = await engine.startTrip();
      const position = makePosition({ speedKmh: 80 });

      const newState = engine.processPosition(state, position);

      expect(newState.currentSpeedKmh).toBe(80);
    });

    it('should add GPS trace point for each valid position', async () => {
      const state = await engine.startTrip();
      const position = makePosition({
        latitude: 30.05,
        longitude: 31.24,
        speedKmh: 60,
        timestamp: 1000000,
      });

      const newState = engine.processPosition(state, position);

      expect(newState.gpsTrace).toHaveLength(1);
      expect(newState.gpsTrace[0]).toEqual({
        lat: 30.05,
        lng: 31.24,
        speedKmh: 60,
        timestamp: 1000000,
      });
    });

    it('should not accumulate distance for the first position (no previous)', async () => {
      const state = await engine.startTrip();
      const position = makePosition({ accuracy: 10 });

      const newState = engine.processPosition(state, position);

      expect(newState.totalDistanceKm).toBe(0);
    });

    it('should accumulate distance from the second position onward (Req 5.1)', async () => {
      const state = await engine.startTrip();

      // First position - establishes baseline
      const pos1 = makePosition({
        latitude: 30.0444,
        longitude: 31.2357,
        accuracy: 10,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      // Second position - ~1 km north
      const pos2 = makePosition({
        latitude: 30.0534,
        longitude: 31.2357,
        accuracy: 10,
        timestamp: 2000,
      });
      const state2 = engine.processPosition(state1, pos2);

      // Distance should be approximately 1 km
      expect(state2.totalDistanceKm).toBeGreaterThan(0.9);
      expect(state2.totalDistanceKm).toBeLessThan(1.1);
    });

    it('should discard distance when accuracy > 50m (Req 5.2)', async () => {
      const state = await engine.startTrip();

      // First position with good accuracy
      const pos1 = makePosition({
        latitude: 30.0444,
        longitude: 31.2357,
        accuracy: 10,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      // Second position with bad accuracy (> 50m)
      const pos2 = makePosition({
        latitude: 30.0534,
        longitude: 31.2357,
        accuracy: 75,
        timestamp: 2000,
      });
      const state2 = engine.processPosition(state1, pos2);

      // Distance should not have increased
      expect(state2.totalDistanceKm).toBe(0);
    });

    it('should discard distance when previous position had accuracy > 50m', async () => {
      const state = await engine.startTrip();

      // First position with bad accuracy
      const pos1 = makePosition({
        latitude: 30.0444,
        longitude: 31.2357,
        accuracy: 75,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      // Second position with good accuracy - but prev was bad
      const pos2 = makePosition({
        latitude: 30.0534,
        longitude: 31.2357,
        accuracy: 10,
        timestamp: 2000,
      });
      const state2 = engine.processPosition(state1, pos2);

      // Distance should not accumulate since the prev position had bad accuracy
      expect(state2.totalDistanceKm).toBe(0);
    });

    it('should accumulate distance correctly across multiple positions', async () => {
      const state = await engine.startTrip();

      // Three positions along a line going north
      const positions = [
        makePosition({ latitude: 30.0000, longitude: 31.0000, accuracy: 5, timestamp: 1000 }),
        makePosition({ latitude: 30.0090, longitude: 31.0000, accuracy: 5, timestamp: 2000 }), // ~1 km
        makePosition({ latitude: 30.0180, longitude: 31.0000, accuracy: 5, timestamp: 3000 }), // ~1 km more
      ];

      let current = state;
      for (const pos of positions) {
        current = engine.processPosition(current, pos);
      }

      // Should be approximately 2 km total
      expect(current.totalDistanceKm).toBeGreaterThan(1.8);
      expect(current.totalDistanceKm).toBeLessThan(2.2);
    });

    it('should still add trace point even when accuracy > 50m', async () => {
      const state = await engine.startTrip();
      const position = makePosition({ accuracy: 75 });

      const newState = engine.processPosition(state, position);

      // Trace point is always added
      expect(newState.gpsTrace).toHaveLength(1);
      // But distance is not accumulated
      expect(newState.totalDistanceKm).toBe(0);
    });

    it('should persist distance to IndexedDB every 100m of travel (Req 5.4)', async () => {
      const state = await engine.startTrip();

      mockGet.mockResolvedValue({
        tripId: state.id,
        startTimestamp: state.startTimestamp,
        totalDistanceKm: 0,
        drivingTimeMs: 0,
        stopTimeMs: 0,
        maxSpeedKmh: 0,
        maxSpeedTimestamp: null,
        maxSpeedCoordinates: null,
        lastPosition: null,
        gpsTrace: [],
        stopEvents: [],
        lastCheckpoint: state.startTimestamp,
      });

      // Reset the call count after startTrip
      mockPut.mockClear();

      // First position
      const pos1 = makePosition({
        latitude: 30.0000,
        longitude: 31.0000,
        accuracy: 5,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      // Second position ~155m away (> 100m threshold)
      engine.processPosition(state1, makePosition({
        latitude: 30.0014, // ~155m north
        longitude: 31.0000,
        accuracy: 5,
        timestamp: 2000,
      }));

      // Give the async persistence time to execute
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have persisted because > 100m traveled
      expect(mockPut).toHaveBeenCalled();
    });

    it('should not persist distance before 100m threshold is reached', async () => {
      const state = await engine.startTrip();
      mockPut.mockClear();

      // First position
      const pos1 = makePosition({
        latitude: 30.0000,
        longitude: 31.0000,
        accuracy: 5,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      // Second position ~50m away (< 100m threshold)
      engine.processPosition(state1, makePosition({
        latitude: 30.00045, // ~50m north
        longitude: 31.0000,
        accuracy: 5,
        timestamp: 2000,
      }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should NOT have persisted
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('should accept position with accuracy exactly 50m (boundary)', async () => {
      const state = await engine.startTrip();

      const pos1 = makePosition({
        latitude: 30.0000,
        longitude: 31.0000,
        accuracy: 50,
        timestamp: 1000,
      });
      const state1 = engine.processPosition(state, pos1);

      const pos2 = makePosition({
        latitude: 30.0090,
        longitude: 31.0000,
        accuracy: 50,
        timestamp: 2000,
      });
      const state2 = engine.processPosition(state1, pos2);

      // Distance should be accumulated (accuracy = 50 is allowed, only > 50 is discarded)
      expect(state2.totalDistanceKm).toBeGreaterThan(0);
    });
  });

  describe('endTrip', () => {
    it('should return a CompletedTrip with correct fields', async () => {
      const state = await engine.startTrip();

      // Process some positions
      const pos1 = makePosition({ latitude: 30.0, longitude: 31.0, accuracy: 5, timestamp: 1000 });
      const pos2 = makePosition({ latitude: 30.009, longitude: 31.0, accuracy: 5, timestamp: 2000 });
      const state1 = engine.processPosition(state, pos1);
      const state2 = engine.processPosition(state1, pos2);

      const completed = engine.endTrip(state2);

      expect(completed.id).toBe(state.id);
      expect(completed.startTimestamp).toBe(state.startTimestamp);
      expect(completed.endTimestamp).toBeGreaterThan(0);
      expect(completed.totalDistanceKm).toBe(state2.totalDistanceKm);
      expect(completed.numberOfStops).toBe(0);
      expect(completed.gpsTrace).toHaveLength(2);
      expect(completed.stopEvents).toEqual([]);
      expect(completed.startCoordinates).toEqual({ lat: 30.0, lng: 31.0 });
      expect(completed.endCoordinates).toEqual({ lat: 30.009, lng: 31.0 });
    });

    it('should handle empty trip (no positions)', async () => {
      const state = await engine.startTrip();
      const completed = engine.endTrip(state);

      expect(completed.startCoordinates).toEqual({ lat: 0, lng: 0 });
      expect(completed.endCoordinates).toEqual({ lat: 0, lng: 0 });
      expect(completed.totalDistanceKm).toBe(0);
      expect(completed.gpsTrace).toHaveLength(0);
    });

    it('should calculate final average speed on end', async () => {
      const state = await engine.startTrip();
      // Simulate driving 100 km in 3,600,000ms (1 hour) -> 100 km/h
      const stateWithDriving = {
        ...state,
        totalDistanceKm: 100,
        drivingTimeMs: 3_600_000,
        gpsTrace: [{ lat: 30.0, lng: 31.0, speedKmh: 100, timestamp: 1000 }],
      };

      const completed = engine.endTrip(stateWithDriving);

      expect(completed.averageSpeedKmh).toBeCloseTo(100, 0);
    });
  });

  describe('calculateAverageSpeed', () => {
    it('should return 0 when driving time is 0', () => {
      expect(calculateAverageSpeed(10, 0)).toBe(0);
    });

    it('should return 0 when driving time is negative', () => {
      expect(calculateAverageSpeed(10, -1000)).toBe(0);
    });

    it('should calculate correctly for 100 km in 1 hour', () => {
      // 1 hour = 3,600,000 ms
      expect(calculateAverageSpeed(100, 3_600_000)).toBeCloseTo(100, 5);
    });

    it('should calculate correctly for 50 km in 30 minutes', () => {
      // 30 min = 1,800,000 ms
      expect(calculateAverageSpeed(50, 1_800_000)).toBeCloseTo(100, 5);
    });

    it('should cap at 999.9 km/h', () => {
      // 1000 km in 1 hour would be 1000 km/h, but capped at 999.9
      expect(calculateAverageSpeed(1000, 3_600_000)).toBe(999.9);
    });

    it('should return 0 when distance is 0', () => {
      expect(calculateAverageSpeed(0, 3_600_000)).toBe(0);
    });
  });

  describe('calculateETA', () => {
    it('should return null when average speed < 5 km/h', () => {
      expect(calculateETA(100, 4.9)).toBeNull();
      expect(calculateETA(100, 0)).toBeNull();
    });

    it('should return null when average speed is exactly 0', () => {
      expect(calculateETA(50, 0)).toBeNull();
    });

    it('should calculate ETA in milliseconds for valid inputs', () => {
      // 100 km at 100 km/h = 1 hour = 3,600,000 ms
      expect(calculateETA(100, 100)).toBeCloseTo(3_600_000, 0);
    });

    it('should calculate correctly for 50 km at 50 km/h', () => {
      // 50 km at 50 km/h = 1 hour = 3,600,000 ms
      expect(calculateETA(50, 50)).toBeCloseTo(3_600_000, 0);
    });

    it('should calculate correctly for small distances', () => {
      // 5 km at 60 km/h = 5 min = 300,000 ms
      expect(calculateETA(5, 60)).toBeCloseTo(300_000, 0);
    });

    it('should return a value when speed is exactly 5 km/h', () => {
      // 10 km at 5 km/h = 2 hours = 7,200,000 ms
      expect(calculateETA(10, 5)).toBeCloseTo(7_200_000, 0);
    });
  });

  describe('getElapsedTimeMs', () => {
    it('should calculate elapsed time as current time minus start timestamp (Req 7.3)', () => {
      const startTimestamp = Date.now() - 5000; // 5 seconds ago
      const elapsed = getElapsedTimeMs(startTimestamp);

      // Should be approximately 5000ms (allow small variance for execution time)
      expect(elapsed).toBeGreaterThanOrEqual(5000);
      expect(elapsed).toBeLessThan(5100);
    });

    it('should return 0 for a trip that just started', () => {
      const startTimestamp = Date.now();
      const elapsed = getElapsedTimeMs(startTimestamp);

      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle large elapsed times (Req 7.4 - recovery)', () => {
      // Simulate 2 hours elapsed (app was in background)
      const twoHoursAgo = Date.now() - 7_200_000;
      const elapsed = getElapsedTimeMs(twoHoursAgo);

      expect(elapsed).toBeGreaterThanOrEqual(7_200_000);
      expect(elapsed).toBeLessThan(7_200_100);
    });
  });
});
