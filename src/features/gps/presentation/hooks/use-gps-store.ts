'use client';

import { create } from 'zustand';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';

/**
 * GPS Zustand store interface.
 *
 * Tracks the current GPS position, signal status, and consecutive failures.
 * Used by the GPS service to push validated positions and by UI components
 * to reactively render speed, heading, and coordinates.
 */
export interface GPSStore {
  /** Most recently validated position */
  position: ValidatedPosition | null;
  /** Last position that passed validation (retained on signal loss) */
  lastValidPosition: ValidatedPosition | null;
  /** Current signal acquisition status */
  signalStatus: 'acquiring' | 'active' | 'lost' | 'denied';
  /** Number of consecutive position acquisition failures */
  consecutiveFailures: number;

  /** Update position with a new validated GPS reading */
  setPosition: (pos: ValidatedPosition) => void;
  /** Mark GPS signal as lost and increment failure counter */
  setSignalLost: () => void;
  /** Mark GPS permission as denied */
  setSignalDenied: () => void;
  /** Update the consecutive failure count directly */
  setConsecutiveFailures: (count: number) => void;
  /** Reset the store to initial state */
  reset: () => void;
}

const initialState = {
  position: null as ValidatedPosition | null,
  lastValidPosition: null as ValidatedPosition | null,
  signalStatus: 'acquiring' as const,
  consecutiveFailures: 0,
};

export const useGPSStore = create<GPSStore>((set) => ({
  ...initialState,

  setPosition: (pos: ValidatedPosition) =>
    set({
      position: pos,
      lastValidPosition: pos,
      signalStatus: 'active',
      consecutiveFailures: 0,
    }),

  setSignalLost: () =>
    set((state) => ({
      signalStatus: 'lost',
      consecutiveFailures: state.consecutiveFailures + 1,
    })),

  setSignalDenied: () =>
    set({
      signalStatus: 'denied',
    }),

  setConsecutiveFailures: (count: number) =>
    set({
      consecutiveFailures: count,
    }),

  reset: () => set(initialState),
}));
