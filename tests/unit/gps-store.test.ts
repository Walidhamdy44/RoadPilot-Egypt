/**
 * Unit tests for GPS Zustand store.
 *
 * Tests store actions: setPosition, setSignalLost, setSignalDenied,
 * setConsecutiveFailures, and reset.
 *
 * **Validates: Requirements 1.1, 1.5**
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';

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

describe('useGPSStore', () => {
  beforeEach(() => {
    useGPSStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have null position', () => {
      const state = useGPSStore.getState();
      expect(state.position).toBeNull();
    });

    it('should have null lastValidPosition', () => {
      const state = useGPSStore.getState();
      expect(state.lastValidPosition).toBeNull();
    });

    it('should have acquiring signal status', () => {
      const state = useGPSStore.getState();
      expect(state.signalStatus).toBe('acquiring');
    });

    it('should have 0 consecutive failures', () => {
      const state = useGPSStore.getState();
      expect(state.consecutiveFailures).toBe(0);
    });
  });

  describe('setPosition', () => {
    it('should update position with the provided validated position', () => {
      const pos = makePosition({ latitude: 29.9 });
      useGPSStore.getState().setPosition(pos);

      const state = useGPSStore.getState();
      expect(state.position).toEqual(pos);
    });

    it('should update lastValidPosition', () => {
      const pos = makePosition();
      useGPSStore.getState().setPosition(pos);

      expect(useGPSStore.getState().lastValidPosition).toEqual(pos);
    });

    it('should set signalStatus to active', () => {
      useGPSStore.getState().setSignalLost();
      useGPSStore.getState().setPosition(makePosition());

      expect(useGPSStore.getState().signalStatus).toBe('active');
    });

    it('should reset consecutiveFailures to 0', () => {
      useGPSStore.getState().setSignalLost();
      useGPSStore.getState().setSignalLost();
      expect(useGPSStore.getState().consecutiveFailures).toBe(2);

      useGPSStore.getState().setPosition(makePosition());
      expect(useGPSStore.getState().consecutiveFailures).toBe(0);
    });

    it('should keep updating lastValidPosition with each new position', () => {
      const pos1 = makePosition({ latitude: 30.0 });
      const pos2 = makePosition({ latitude: 30.1 });

      useGPSStore.getState().setPosition(pos1);
      useGPSStore.getState().setPosition(pos2);

      expect(useGPSStore.getState().lastValidPosition).toEqual(pos2);
    });
  });

  describe('setSignalLost', () => {
    it('should set signalStatus to lost', () => {
      useGPSStore.getState().setSignalLost();
      expect(useGPSStore.getState().signalStatus).toBe('lost');
    });

    it('should increment consecutiveFailures by 1', () => {
      useGPSStore.getState().setSignalLost();
      expect(useGPSStore.getState().consecutiveFailures).toBe(1);

      useGPSStore.getState().setSignalLost();
      expect(useGPSStore.getState().consecutiveFailures).toBe(2);

      useGPSStore.getState().setSignalLost();
      expect(useGPSStore.getState().consecutiveFailures).toBe(3);
    });

    it('should not clear the current position', () => {
      const pos = makePosition();
      useGPSStore.getState().setPosition(pos);
      useGPSStore.getState().setSignalLost();

      expect(useGPSStore.getState().position).toEqual(pos);
    });

    it('should not clear lastValidPosition', () => {
      const pos = makePosition();
      useGPSStore.getState().setPosition(pos);
      useGPSStore.getState().setSignalLost();

      expect(useGPSStore.getState().lastValidPosition).toEqual(pos);
    });
  });

  describe('setSignalDenied', () => {
    it('should set signalStatus to denied', () => {
      useGPSStore.getState().setSignalDenied();
      expect(useGPSStore.getState().signalStatus).toBe('denied');
    });

    it('should not modify consecutiveFailures', () => {
      useGPSStore.getState().setSignalLost();
      useGPSStore.getState().setSignalLost();
      const failures = useGPSStore.getState().consecutiveFailures;

      useGPSStore.getState().setSignalDenied();
      expect(useGPSStore.getState().consecutiveFailures).toBe(failures);
    });

    it('should not clear the position data', () => {
      const pos = makePosition();
      useGPSStore.getState().setPosition(pos);
      useGPSStore.getState().setSignalDenied();

      expect(useGPSStore.getState().position).toEqual(pos);
      expect(useGPSStore.getState().lastValidPosition).toEqual(pos);
    });
  });

  describe('setConsecutiveFailures', () => {
    it('should set consecutiveFailures to the provided count', () => {
      useGPSStore.getState().setConsecutiveFailures(5);
      expect(useGPSStore.getState().consecutiveFailures).toBe(5);
    });

    it('should allow setting to 0', () => {
      useGPSStore.getState().setConsecutiveFailures(3);
      useGPSStore.getState().setConsecutiveFailures(0);
      expect(useGPSStore.getState().consecutiveFailures).toBe(0);
    });

    it('should not affect signalStatus', () => {
      useGPSStore.getState().setPosition(makePosition());
      useGPSStore.getState().setConsecutiveFailures(10);
      expect(useGPSStore.getState().signalStatus).toBe('active');
    });
  });

  describe('reset', () => {
    it('should restore all state to initial values', () => {
      const pos = makePosition();
      useGPSStore.getState().setPosition(pos);
      useGPSStore.getState().setSignalLost();
      useGPSStore.getState().setSignalLost();

      useGPSStore.getState().reset();

      const state = useGPSStore.getState();
      expect(state.position).toBeNull();
      expect(state.lastValidPosition).toBeNull();
      expect(state.signalStatus).toBe('acquiring');
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should allow a fresh start after denied status', () => {
      useGPSStore.getState().setSignalDenied();
      useGPSStore.getState().reset();

      expect(useGPSStore.getState().signalStatus).toBe('acquiring');
    });
  });
});
