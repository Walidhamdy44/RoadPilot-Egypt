/**
 * Unit tests for the Trip Repository (IndexedDB persistence layer).
 *
 * Since fake-indexeddb isn't available, we mock the getDB function to
 * simulate IndexedDB operations.
 *
 * **Validates: Requirements 12.1, 12.3, 12.4, 12.7, 22.1**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompletedTrip, TripState } from '@/features/trip/domain/trip-types';
import type { ActiveTripCheckpoint, TripRecord } from '@/features/trip/infrastructure/trip-repository';

// Polyfill IDBKeyRange for jsdom environment
if (typeof globalThis.IDBKeyRange === 'undefined') {
  class IDBKeyRangePolyfill {
    lower: unknown;
    upper: unknown;
    lowerOpen: boolean;
    upperOpen: boolean;

    constructor(lower: unknown, upper: unknown, lowerOpen = false, upperOpen = false) {
      this.lower = lower;
      this.upper = upper;
      this.lowerOpen = lowerOpen;
      this.upperOpen = upperOpen;
    }

    static bound(lower: unknown, upper: unknown, lowerOpen = false, upperOpen = false) {
      return new IDBKeyRangePolyfill(lower, upper, lowerOpen, upperOpen);
    }

    static only(value: unknown) {
      return new IDBKeyRangePolyfill(value, value, false, false);
    }

    static lowerBound(lower: unknown, open = false) {
      return new IDBKeyRangePolyfill(lower, undefined, open, false);
    }

    static upperBound(upper: unknown, open = false) {
      return new IDBKeyRangePolyfill(undefined, upper, false, open);
    }
  }

  (globalThis as unknown as Record<string, unknown>).IDBKeyRange = IDBKeyRangePolyfill;
}

// Mock store to simulate IndexedDB
let tripsStore: Map<string, TripRecord>;
let activeTripStore: Map<string, ActiveTripCheckpoint>;

const mockPut = vi.fn(async (storeName: string, value: unknown, key?: string) => {
  if (storeName === 'trips') {
    tripsStore.set((value as TripRecord).id, value as TripRecord);
  } else if (storeName === 'activeTrip') {
    activeTripStore.set(key ?? 'current', value as ActiveTripCheckpoint);
  }
});

const mockGet = vi.fn(async (storeName: string, key: string) => {
  if (storeName === 'trips') {
    return tripsStore.get(key) ?? undefined;
  } else if (storeName === 'activeTrip') {
    return activeTripStore.get(key) ?? undefined;
  }
  return undefined;
});

const mockDelete = vi.fn(async (storeName: string, key: string) => {
  if (storeName === 'trips') {
    tripsStore.delete(key);
  } else if (storeName === 'activeTrip') {
    activeTripStore.delete(key);
  }
});

const mockGetAll = vi.fn(async (_storeName: string) => {
  return Array.from(tripsStore.values());
});

const mockGetAllFromIndex = vi.fn(
  async (_storeName: string, indexName: string, query?: unknown) => {
    const records = Array.from(tripsStore.values());

    if (indexName === 'by-user-id') {
      return records.filter((r) => r.userId === query);
    }

    if (indexName === 'by-start-date' && query instanceof IDBKeyRange) {
      return records.filter(
        (r) => r.startTimestamp >= query.lower && r.startTimestamp <= query.upper
      );
    }

    return records;
  }
);

vi.mock('@/lib/idb/index', () => ({
  getDB: vi.fn(async () => ({
    put: mockPut,
    get: mockGet,
    delete: mockDelete,
    getAll: mockGetAll,
    getAllFromIndex: mockGetAllFromIndex,
  })),
}));

// Mock the storage quota utility
const mockGetStorageQuota = vi.fn();
vi.mock('@/shared/utils/storage', () => ({
  getStorageQuota: (...args: unknown[]) => mockGetStorageQuota(...args),
}));

// Import after mocks are set up
import {
  saveTripRecord,
  getTripById,
  queryTrips,
  deleteTripById,
  getActiveTripCheckpoint,
  saveActiveTripCheckpoint,
  clearActiveTripCheckpoint,
  recoverTrip,
  checkStorageQuota,
  getPendingWrites,
  clearPendingWrites,
} from '@/features/trip/infrastructure/trip-repository';

/** Helper to create a CompletedTrip with defaults. */
function makeCompletedTrip(overrides: Partial<CompletedTrip> = {}): CompletedTrip {
  return {
    id: 'trip-001',
    startTimestamp: 1700000000000,
    endTimestamp: 1700003600000,
    totalDistanceKm: 50.5,
    drivingTimeMs: 3_600_000,
    stopTimeMs: 600_000,
    averageSpeedKmh: 50.5,
    maxSpeedKmh: 120.3,
    maxSpeedTimestamp: 1700001800000,
    maxSpeedCoordinates: { lat: 30.05, lng: 31.24 },
    numberOfStops: 2,
    startLocationName: 'Cairo',
    endLocationName: 'Alexandria',
    startCoordinates: { lat: 30.0444, lng: 31.2357 },
    endCoordinates: { lat: 31.2001, lng: 29.9187 },
    gpsTrace: [
      { lat: 30.0444, lng: 31.2357, speedKmh: 60, timestamp: 1700000000000 },
      { lat: 31.2001, lng: 29.9187, speedKmh: 80, timestamp: 1700003600000 },
    ],
    stopEvents: [
      { startTimestamp: 1700001000000, durationMs: 300_000, coordinates: { lat: 30.5, lng: 30.5 } },
    ],
    ...overrides,
  };
}

/** Helper to create an ActiveTripCheckpoint with defaults. */
function makeCheckpoint(overrides: Partial<ActiveTripCheckpoint> = {}): ActiveTripCheckpoint {
  return {
    tripId: 'trip-active-001',
    startTimestamp: 1700000000000,
    totalDistanceKm: 25.3,
    drivingTimeMs: 1_800_000,
    stopTimeMs: 300_000,
    maxSpeedKmh: 110.5,
    maxSpeedTimestamp: 1700000900000,
    maxSpeedCoordinates: { lat: 30.05, lng: 31.24 },
    lastPosition: {
      latitude: 30.5,
      longitude: 31.0,
      speedKmh: 80,
      heading: 45,
      accuracy: 10,
      timestamp: 1700001800000,
    },
    gpsTrace: [
      { lat: 30.0444, lng: 31.2357, speedKmh: 60, timestamp: 1700000000000 },
    ],
    stopEvents: [],
    lastCheckpoint: 1700001800000,
    ...overrides,
  };
}

describe('Trip Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default implementations after tests that override them
    mockPut.mockImplementation(async (storeName: string, value: unknown, key?: string) => {
      if (storeName === 'trips') {
        tripsStore.set((value as TripRecord).id, value as TripRecord);
      } else if (storeName === 'activeTrip') {
        activeTripStore.set(key ?? 'current', value as ActiveTripCheckpoint);
      }
    });
    mockGet.mockImplementation(async (storeName: string, key: string) => {
      if (storeName === 'trips') {
        return tripsStore.get(key) ?? undefined;
      } else if (storeName === 'activeTrip') {
        return activeTripStore.get(key) ?? undefined;
      }
      return undefined;
    });
    mockDelete.mockImplementation(async (storeName: string, key: string) => {
      if (storeName === 'trips') {
        tripsStore.delete(key);
      } else if (storeName === 'activeTrip') {
        activeTripStore.delete(key);
      }
    });
    mockGetAll.mockImplementation(async () => {
      return Array.from(tripsStore.values());
    });
    mockGetAllFromIndex.mockImplementation(
      async (_storeName: string, indexName: string, query?: unknown) => {
        const records = Array.from(tripsStore.values());
        if (indexName === 'by-user-id') {
          return records.filter((r) => r.userId === query);
        }
        if (indexName === 'by-start-date' && query instanceof IDBKeyRange) {
          return records.filter(
            (r) => r.startTimestamp >= query.lower && r.startTimestamp <= query.upper
          );
        }
        return records;
      }
    );
    tripsStore = new Map();
    activeTripStore = new Map();
    clearPendingWrites();
    mockGetStorageQuota.mockResolvedValue({ used: 0, total: 100, percentage: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveTripRecord', () => {
    it('should save a completed trip to IndexedDB (Req 12.1)', async () => {
      const trip = makeCompletedTrip();

      await saveTripRecord(trip, 'user-123');

      expect(mockPut).toHaveBeenCalledWith(
        'trips',
        expect.objectContaining({
          id: 'trip-001',
          userId: 'user-123',
          status: 'completed',
          totalDistanceKm: 50.5,
          syncStatus: 'pending',
        })
      );
    });

    it('should set syncStatus to pending on new saves', async () => {
      const trip = makeCompletedTrip();

      await saveTripRecord(trip, null);

      const savedRecord = mockPut.mock.calls[0][1] as TripRecord;
      expect(savedRecord.syncStatus).toBe('pending');
      expect(savedRecord.retryCount).toBe(0);
      expect(savedRecord.lastSyncAttempt).toBeNull();
    });

    it('should store userId as null for local-only mode', async () => {
      const trip = makeCompletedTrip();

      await saveTripRecord(trip, null);

      const savedRecord = mockPut.mock.calls[0][1] as TripRecord;
      expect(savedRecord.userId).toBeNull();
    });

    it('should retry up to 3 times on failure (Req 12.7)', async () => {
      mockPut.mockRejectedValueOnce(new Error('Write failed'))
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(undefined);

      const trip = makeCompletedTrip();

      await saveTripRecord(trip, 'user-123');

      // Should have been called 3 times (2 failures + 1 success)
      expect(mockPut).toHaveBeenCalledTimes(3);
    });

    it('should succeed on second retry', async () => {
      mockPut.mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(undefined);

      const trip = makeCompletedTrip();

      await expect(saveTripRecord(trip, 'user-123')).resolves.toBeUndefined();
      expect(mockPut).toHaveBeenCalledTimes(2);
    });

    it('should hold trip in memory and throw after all retries exhausted (Req 12.7)', async () => {
      mockPut.mockRejectedValue(new Error('Write failed'));

      const trip = makeCompletedTrip();

      await expect(saveTripRecord(trip, 'user-123')).rejects.toThrow(
        /Failed to save trip record after 3 retries/
      );

      // Trip should be held in memory
      const pending = getPendingWrites();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('trip-001');
    });

    it('should set updatedAt to current time', async () => {
      const trip = makeCompletedTrip();
      const before = Date.now();

      await saveTripRecord(trip, 'user-123');

      const savedRecord = mockPut.mock.calls[0][1] as TripRecord;
      expect(savedRecord.updatedAt).toBeGreaterThanOrEqual(before);
      expect(savedRecord.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should map all CompletedTrip fields to TripRecord correctly', async () => {
      const trip = makeCompletedTrip();

      await saveTripRecord(trip, 'user-123');

      const savedRecord = mockPut.mock.calls[0][1] as TripRecord;
      expect(savedRecord.startTimestamp).toBe(trip.startTimestamp);
      expect(savedRecord.endTimestamp).toBe(trip.endTimestamp);
      expect(savedRecord.drivingTimeMs).toBe(trip.drivingTimeMs);
      expect(savedRecord.stopTimeMs).toBe(trip.stopTimeMs);
      expect(savedRecord.averageSpeedKmh).toBe(trip.averageSpeedKmh);
      expect(savedRecord.maxSpeedKmh).toBe(trip.maxSpeedKmh);
      expect(savedRecord.maxSpeedTimestamp).toBe(trip.maxSpeedTimestamp);
      expect(savedRecord.maxSpeedCoordinates).toEqual(trip.maxSpeedCoordinates);
      expect(savedRecord.startLocationName).toBe(trip.startLocationName);
      expect(savedRecord.endLocationName).toBe(trip.endLocationName);
      expect(savedRecord.startCoordinates).toEqual(trip.startCoordinates);
      expect(savedRecord.endCoordinates).toEqual(trip.endCoordinates);
      expect(savedRecord.gpsTrace).toEqual(trip.gpsTrace);
      expect(savedRecord.stopEvents).toEqual(trip.stopEvents);
      expect(savedRecord.numberOfStops).toBe(trip.numberOfStops);
    });
  });

  describe('getTripById', () => {
    it('should return the trip record when it exists', async () => {
      const trip = makeCompletedTrip();
      await saveTripRecord(trip, 'user-123');

      const result = await getTripById('trip-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('trip-001');
    });

    it('should return null when trip does not exist', async () => {
      const result = await getTripById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('queryTrips', () => {
    beforeEach(async () => {
      // Seed with multiple trips
      const trips = [
        makeCompletedTrip({ id: 'trip-1', startTimestamp: 1700000000000, totalDistanceKm: 10 }),
        makeCompletedTrip({ id: 'trip-2', startTimestamp: 1700100000000, totalDistanceKm: 50 }),
        makeCompletedTrip({ id: 'trip-3', startTimestamp: 1700200000000, totalDistanceKm: 100 }),
      ];

      for (const trip of trips) {
        await saveTripRecord(trip, 'user-123');
      }
      vi.clearAllMocks();
    });

    it('should return all completed trips when no filters are provided', async () => {
      const results = await queryTrips();

      expect(results).toHaveLength(3);
    });

    it('should filter by date range (Req 12.3)', async () => {
      const results = await queryTrips({
        dateFrom: 1700050000000,
        dateTo: 1700150000000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('trip-2');
    });

    it('should filter by minimum distance', async () => {
      const results = await queryTrips({ minDistance: 50 });

      expect(results).toHaveLength(2);
    });

    it('should filter by maximum distance', async () => {
      const results = await queryTrips({ maxDistance: 50 });

      expect(results).toHaveLength(2);
    });

    it('should filter by distance range', async () => {
      const results = await queryTrips({ minDistance: 20, maxDistance: 80 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('trip-2');
    });

    it('should filter by userId', async () => {
      // Add a trip with different userId
      const otherTrip = makeCompletedTrip({ id: 'trip-other', startTimestamp: 1700300000000 });
      await saveTripRecord(otherTrip, 'user-456');
      vi.clearAllMocks();

      const results = await queryTrips({ userId: 'user-123' });

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.userId === 'user-123')).toBe(true);
    });

    it('should return results sorted by start date descending', async () => {
      const results = await queryTrips();

      expect(results[0].startTimestamp).toBeGreaterThan(results[1].startTimestamp);
      expect(results[1].startTimestamp).toBeGreaterThan(results[2].startTimestamp);
    });

    it('should support limit pagination', async () => {
      const results = await queryTrips({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should support offset pagination', async () => {
      const results = await queryTrips({ offset: 1, limit: 2 });

      expect(results).toHaveLength(2);
      // Should skip the first (most recent) trip
      expect(results[0].id).toBe('trip-2');
    });

    it('should return empty array when no trips match', async () => {
      const results = await queryTrips({ dateFrom: 9999999999999 });

      expect(results).toHaveLength(0);
    });
  });

  describe('deleteTripById', () => {
    it('should delete the trip record', async () => {
      const trip = makeCompletedTrip();
      await saveTripRecord(trip, 'user-123');

      await deleteTripById('trip-001');

      expect(mockDelete).toHaveBeenCalledWith('trips', 'trip-001');
    });

    it('should not throw when deleting non-existent trip', async () => {
      await expect(deleteTripById('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('Active Trip Checkpoint', () => {
    describe('saveActiveTripCheckpoint', () => {
      it('should persist checkpoint to IndexedDB', async () => {
        const checkpoint = makeCheckpoint();

        await saveActiveTripCheckpoint(checkpoint);

        expect(mockPut).toHaveBeenCalledWith('activeTrip', checkpoint, 'current');
      });
    });

    describe('getActiveTripCheckpoint', () => {
      it('should return the checkpoint when it exists', async () => {
        const checkpoint = makeCheckpoint();
        await saveActiveTripCheckpoint(checkpoint);

        const result = await getActiveTripCheckpoint();

        expect(result).not.toBeNull();
        expect(result!.tripId).toBe('trip-active-001');
      });

      it('should return null when no checkpoint exists', async () => {
        const result = await getActiveTripCheckpoint();

        expect(result).toBeNull();
      });
    });

    describe('clearActiveTripCheckpoint', () => {
      it('should remove the active trip checkpoint', async () => {
        const checkpoint = makeCheckpoint();
        await saveActiveTripCheckpoint(checkpoint);

        await clearActiveTripCheckpoint();

        expect(mockDelete).toHaveBeenCalledWith('activeTrip', 'current');
      });
    });
  });

  describe('recoverTrip', () => {
    it('should reconstruct TripState from checkpoint (Req 22.1)', async () => {
      const checkpoint = makeCheckpoint();
      await saveActiveTripCheckpoint(checkpoint);

      const recovered = await recoverTrip();

      expect(recovered).not.toBeNull();
      expect(recovered!.id).toBe('trip-active-001');
      expect(recovered!.status).toBe('active');
      expect(recovered!.startTimestamp).toBe(1700000000000);
      expect(recovered!.totalDistanceKm).toBe(25.3);
      expect(recovered!.drivingTimeMs).toBe(1_800_000);
      expect(recovered!.stopTimeMs).toBe(300_000);
      expect(recovered!.maxSpeedKmh).toBe(110.5);
      expect(recovered!.gpsTrace).toHaveLength(1);
    });

    it('should return null when no active trip exists', async () => {
      const recovered = await recoverTrip();

      expect(recovered).toBeNull();
    });

    it('should calculate average speed from checkpoint data', async () => {
      const checkpoint = makeCheckpoint({
        totalDistanceKm: 50,
        drivingTimeMs: 3_600_000, // 1 hour
      });
      await saveActiveTripCheckpoint(checkpoint);

      const recovered = await recoverTrip();

      // 50 km / 1 hour = 50 km/h
      expect(recovered!.averageSpeedKmh).toBeCloseTo(50, 1);
    });

    it('should set averageSpeedKmh to 0 when drivingTimeMs is 0', async () => {
      const checkpoint = makeCheckpoint({
        totalDistanceKm: 0,
        drivingTimeMs: 0,
      });
      await saveActiveTripCheckpoint(checkpoint);

      const recovered = await recoverTrip();

      expect(recovered!.averageSpeedKmh).toBe(0);
    });

    it('should set endTimestamp to null (trip still active)', async () => {
      const checkpoint = makeCheckpoint();
      await saveActiveTripCheckpoint(checkpoint);

      const recovered = await recoverTrip();

      expect(recovered!.endTimestamp).toBeNull();
    });

    it('should set currentSpeedKmh to 0 (speed will be re-acquired from GPS)', async () => {
      const checkpoint = makeCheckpoint();
      await saveActiveTripCheckpoint(checkpoint);

      const recovered = await recoverTrip();

      expect(recovered!.currentSpeedKmh).toBe(0);
    });
  });

  describe('checkStorageQuota', () => {
    it('should return shouldWarn: true when usage >= 80% (Req 12.4)', async () => {
      mockGetStorageQuota.mockResolvedValue({ used: 80, total: 100, percentage: 80 });

      const result = await checkStorageQuota();

      expect(result.shouldWarn).toBe(true);
      expect(result.percentage).toBe(80);
    });

    it('should return shouldWarn: false when usage < 80%', async () => {
      mockGetStorageQuota.mockResolvedValue({ used: 50, total: 100, percentage: 50 });

      const result = await checkStorageQuota();

      expect(result.shouldWarn).toBe(false);
      expect(result.percentage).toBe(50);
    });

    it('should return shouldWarn: true when usage is at 90%', async () => {
      mockGetStorageQuota.mockResolvedValue({ used: 90, total: 100, percentage: 90 });

      const result = await checkStorageQuota();

      expect(result.shouldWarn).toBe(true);
      expect(result.percentage).toBe(90);
    });

    it('should return shouldWarn: false when storage is empty', async () => {
      mockGetStorageQuota.mockResolvedValue({ used: 0, total: 100, percentage: 0 });

      const result = await checkStorageQuota();

      expect(result.shouldWarn).toBe(false);
      expect(result.percentage).toBe(0);
    });
  });

  describe('pendingWrites', () => {
    it('should accumulate failed writes in memory', async () => {
      mockPut.mockRejectedValue(new Error('Write failed'));

      try {
        await saveTripRecord(makeCompletedTrip({ id: 'fail-1' }), null);
      } catch { /* expected */ }

      try {
        await saveTripRecord(makeCompletedTrip({ id: 'fail-2' }), null);
      } catch { /* expected */ }

      const pending = getPendingWrites();
      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe('fail-1');
      expect(pending[1].id).toBe('fail-2');
    });

    it('should clear pending writes when clearPendingWrites is called', async () => {
      mockPut.mockRejectedValue(new Error('Write failed'));

      try {
        await saveTripRecord(makeCompletedTrip(), null);
      } catch { /* expected */ }

      clearPendingWrites();

      expect(getPendingWrites()).toHaveLength(0);
    });
  });
});
