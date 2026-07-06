/**
 * Unit tests for Trip Zustand store.
 *
 * Tests store actions: startTrip, endTrip, updateFromPosition,
 * setDestination, clearDestination, restoreTrip, and GPS subscription.
 *
 * **Validates: Requirements 7.1, 7.5**
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTripStore } from '@/features/trip/presentation/hooks/use-trip-store';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';
import type { TripState, Destination } from '@/features/trip/domain/trip-types';

// Mock IndexedDB via the idb module
vi.mock('@/lib/idb/index', () => ({
  getDB: vi.fn().mockResolvedValue({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  }),
}));

function makePosition(overrides: Partial<ValidatedPosition> = {}): ValidatedPosition {
  return {
    latitude: 30.0444,
    longitude: 31.2357,
    speedKmh: 80,
    heading: 45,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeTripState(overrides: Partial<TripState> = {}): TripState {
  return {
    id: 'test-trip-123',
    status: 'active',
    startTimestamp: Date.now() - 60000,
    endTimestamp: null,
    totalDistanceKm: 5.5,
    drivingTimeMs: 300000,
    stopTimeMs: 60000,
    averageSpeedKmh: 66.0,
    maxSpeedKmh: 120.0,
    maxSpeedTimestamp: Date.now() - 30000,
    maxSpeedCoordinates: { lat: 30.05, lng: 31.24 },
    currentSpeedKmh: 80,
    gpsTrace: [],
    stopEvents: [],
    destination: null,
    remainingDistanceKm: null,
    etaTimestamp: null,
    ...overrides,
  };
}

describe('useTripStore', () => {
  beforeEach(() => {
    // Reset both stores before each test
    useTripStore.setState({ tripState: null, isActive: false });
    useGPSStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have null tripState', () => {
      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
    });

    it('should have isActive as false', () => {
      const state = useTripStore.getState();
      expect(state.isActive).toBe(false);
    });
  });

  describe('startTrip', () => {
    it('should set tripState and isActive after starting', async () => {
      useTripStore.getState().startTrip();

      // startTrip is async internally, wait for state update
      await vi.waitFor(() => {
        const state = useTripStore.getState();
        expect(state.tripState).not.toBeNull();
        expect(state.isActive).toBe(true);
      });
    });

    it('should initialize trip with active status', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        const state = useTripStore.getState();
        expect(state.tripState!.status).toBe('active');
      });
    });

    it('should initialize trip with zero distance', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        const state = useTripStore.getState();
        expect(state.tripState!.totalDistanceKm).toBe(0);
      });
    });

    it('should initialize trip with a valid ID', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        const state = useTripStore.getState();
        expect(state.tripState!.id).toBeTruthy();
        expect(typeof state.tripState!.id).toBe('string');
      });
    });

    it('should initialize trip with a start timestamp close to now', async () => {
      const before = Date.now();
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        const state = useTripStore.getState();
        expect(state.tripState!.startTimestamp).toBeGreaterThanOrEqual(before);
        expect(state.tripState!.startTimestamp).toBeLessThanOrEqual(Date.now());
      });
    });
  });

  describe('endTrip', () => {
    it('should set tripState to null and isActive to false', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      useTripStore.getState().endTrip();

      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
      expect(state.isActive).toBe(false);
    });

    it('should be a no-op if no trip is active', () => {
      useTripStore.getState().endTrip();

      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
      expect(state.isActive).toBe(false);
    });
  });

  describe('updateFromPosition', () => {
    it('should update tripState with new position data', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const pos = makePosition({ speedKmh: 100 });
      useTripStore.getState().updateFromPosition(pos);

      const state = useTripStore.getState();
      expect(state.tripState!.currentSpeedKmh).toBe(100);
    });

    it('should add GPS trace point on position update', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const pos = makePosition({ latitude: 30.05, longitude: 31.24 });
      useTripStore.getState().updateFromPosition(pos);

      const state = useTripStore.getState();
      expect(state.tripState!.gpsTrace.length).toBe(1);
      expect(state.tripState!.gpsTrace[0].lat).toBe(30.05);
      expect(state.tripState!.gpsTrace[0].lng).toBe(31.24);
    });

    it('should be a no-op if no trip is active', () => {
      const pos = makePosition();
      useTripStore.getState().updateFromPosition(pos);

      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
    });

    it('should be a no-op if isActive is false', () => {
      // Manually set tripState but keep isActive false
      useTripStore.setState({ tripState: makeTripState(), isActive: false });

      const pos = makePosition();
      useTripStore.getState().updateFromPosition(pos);

      // State should remain unchanged since isActive is false
      const state = useTripStore.getState();
      expect(state.tripState!.gpsTrace.length).toBe(0);
    });
  });

  describe('setDestination', () => {
    it('should set the destination on the trip state', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const dest: Destination = { lat: 31.2, lng: 29.9, name: 'Alexandria' };
      useTripStore.getState().setDestination(dest);

      const state = useTripStore.getState();
      expect(state.tripState!.destination).toEqual(dest);
    });

    it('should be a no-op if no trip is active', () => {
      const dest: Destination = { lat: 31.2, lng: 29.9, name: 'Alexandria' };
      useTripStore.getState().setDestination(dest);

      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
    });
  });

  describe('clearDestination', () => {
    it('should clear the destination, remainingDistance, and ETA', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const dest: Destination = { lat: 31.2, lng: 29.9, name: 'Alexandria' };
      useTripStore.getState().setDestination(dest);
      expect(useTripStore.getState().tripState!.destination).not.toBeNull();

      useTripStore.getState().clearDestination();

      const state = useTripStore.getState();
      expect(state.tripState!.destination).toBeNull();
      expect(state.tripState!.remainingDistanceKm).toBeNull();
      expect(state.tripState!.etaTimestamp).toBeNull();
    });

    it('should be a no-op if no trip is active', () => {
      useTripStore.getState().clearDestination();
      expect(useTripStore.getState().tripState).toBeNull();
    });
  });

  describe('restoreTrip', () => {
    it('should restore trip state and set isActive based on status', () => {
      const tripState = makeTripState({ status: 'active' });
      useTripStore.getState().restoreTrip(tripState);

      const state = useTripStore.getState();
      expect(state.tripState).toEqual(tripState);
      expect(state.isActive).toBe(true);
    });

    it('should set isActive to false if restored trip is not active', () => {
      const tripState = makeTripState({ status: 'completed' });
      useTripStore.getState().restoreTrip(tripState);

      const state = useTripStore.getState();
      expect(state.tripState).toEqual(tripState);
      expect(state.isActive).toBe(false);
    });

    it('should set isActive to false for idle status', () => {
      const tripState = makeTripState({ status: 'idle' });
      useTripStore.getState().restoreTrip(tripState);

      expect(useTripStore.getState().isActive).toBe(false);
    });
  });

  describe('GPS store subscription', () => {
    it('should update trip when GPS store receives a new position during active trip', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const pos = makePosition({ speedKmh: 90 });
      useGPSStore.getState().setPosition(pos);

      // The subscription should have triggered updateFromPosition
      const state = useTripStore.getState();
      expect(state.tripState!.currentSpeedKmh).toBe(90);
      expect(state.tripState!.gpsTrace.length).toBe(1);
    });

    it('should not update trip when no trip is active', () => {
      const pos = makePosition({ speedKmh: 50 });
      useGPSStore.getState().setPosition(pos);

      const state = useTripStore.getState();
      expect(state.tripState).toBeNull();
    });

    it('should not trigger on repeated same position reference', async () => {
      useTripStore.getState().startTrip();

      await vi.waitFor(() => {
        expect(useTripStore.getState().isActive).toBe(true);
      });

      const pos = makePosition({ speedKmh: 60 });
      useGPSStore.getState().setPosition(pos);

      const traceLength = useTripStore.getState().tripState!.gpsTrace.length;

      // Setting the same position object shouldn't trigger update
      // because the subscriber checks gpsState.position !== prevGpsState.position
      useGPSStore.setState({ position: pos });

      expect(useTripStore.getState().tripState!.gpsTrace.length).toBe(traceLength);
    });
  });
});
