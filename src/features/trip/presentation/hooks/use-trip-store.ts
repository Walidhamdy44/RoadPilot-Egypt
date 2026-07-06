'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';
import type { TripState, Destination } from '@/features/trip/domain/trip-types';
import { createTripEngine } from '@/features/trip/domain/trip-engine';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';

/**
 * Trip Zustand store interface.
 *
 * Manages the active trip state, delegates position processing to the TripEngine,
 * and subscribes to the GPS store for real-time position updates.
 *
 * **Validates: Requirements 7.1, 7.5**
 */
export interface TripStore {
  /** Current trip state, null when no trip is active */
  tripState: TripState | null;
  /** Whether a trip is currently active */
  isActive: boolean;

  /** Start a new trip */
  startTrip: () => void;
  /** End the current trip */
  endTrip: () => void;
  /** Process a new GPS position update */
  updateFromPosition: (position: ValidatedPosition) => void;
  /** Set a destination for route/ETA calculations */
  setDestination: (dest: Destination) => void;
  /** Clear the current destination */
  clearDestination: () => void;
  /** Restore trip state from an IndexedDB checkpoint */
  restoreTrip: (state: TripState) => void;
}

/** Internal TripEngine instance shared across the store */
const tripEngine = createTripEngine();

export const useTripStore = create<TripStore>((set, get) => ({
  tripState: null,
  isActive: false,

  startTrip: () => {
    tripEngine.startTrip().then((newTripState) => {
      set({ tripState: newTripState, isActive: true });
    });
  },

  endTrip: () => {
    const { tripState } = get();
    if (!tripState) return;

    tripEngine.endTrip(tripState);
    set({ tripState: null, isActive: false });
  },

  updateFromPosition: (position: ValidatedPosition) => {
    const { tripState, isActive } = get();
    if (!tripState || !isActive) return;

    const updatedState = tripEngine.processPosition(tripState, position);
    set({ tripState: updatedState });
  },

  setDestination: (dest: Destination) => {
    const { tripState } = get();
    if (!tripState) return;

    set({
      tripState: {
        ...tripState,
        destination: dest,
      },
    });
  },

  clearDestination: () => {
    const { tripState } = get();
    if (!tripState) return;

    set({
      tripState: {
        ...tripState,
        destination: null,
        remainingDistanceKm: null,
        etaTimestamp: null,
      },
    });
  },

  restoreTrip: (state: TripState) => {
    set({
      tripState: state,
      isActive: state.status === 'active',
    });
  },
}));

/**
 * Granular selectors for trip store to minimize component re-renders.
 * Components should use these selectors instead of subscribing to full tripState.
 */
export const selectTripDistance = (s: TripStore) => s.tripState?.totalDistanceKm ?? 0;
export const selectTripSpeed = (s: TripStore) => s.tripState?.currentSpeedKmh ?? 0;
export const selectAvgSpeed = (s: TripStore) => s.tripState?.averageSpeedKmh ?? 0;
export const selectMaxSpeed = (s: TripStore) => s.tripState?.maxSpeedKmh ?? 0;
export const selectDrivingTime = (s: TripStore) => s.tripState?.drivingTimeMs ?? 0;
export const selectStopTime = (s: TripStore) => s.tripState?.stopTimeMs ?? 0;
export const selectStartTimestamp = (s: TripStore) => s.tripState?.startTimestamp ?? 0;
export const selectIsActive = (s: TripStore) => s.isActive;
export const selectDestination = (s: TripStore) => s.tripState?.destination ?? null;
export const selectRemainingDistance = (s: TripStore) => s.tripState?.remainingDistanceKm ?? null;
export const selectEta = (s: TripStore) => s.tripState?.etaTimestamp ?? null;
export const selectGpsTrace = (s: TripStore) => s.tripState?.gpsTrace ?? [];

/**
 * Hook for selecting multiple trip metrics at once with shallow comparison.
 * Use this in the trip metrics grid to avoid per-field subscriptions while
 * still preventing re-renders when unrelated state changes.
 */
export function useTripMetrics() {
  return useTripStore(
    useShallow((s) => ({
      distance: s.tripState?.totalDistanceKm ?? 0,
      avgSpeed: s.tripState?.averageSpeedKmh ?? 0,
      maxSpeed: s.tripState?.maxSpeedKmh ?? 0,
      drivingTime: s.tripState?.drivingTimeMs ?? 0,
      stopTime: s.tripState?.stopTimeMs ?? 0,
      startTimestamp: s.tripState?.startTimestamp ?? 0,
      isActive: s.isActive,
    }))
  );
}

/**
 * Subscribe to GPS store position updates.
 * When the GPS store emits a new position and a trip is active,
 * the trip store automatically processes the position update.
 */
useGPSStore.subscribe((gpsState, prevGpsState) => {
  if (
    gpsState.position &&
    gpsState.position !== prevGpsState.position
  ) {
    const { isActive } = useTripStore.getState();
    if (isActive) {
      useTripStore.getState().updateFromPosition(gpsState.position);
    }
  }
});
