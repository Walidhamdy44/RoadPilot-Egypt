/**
 * Unit tests for GPS Service — core business logic.
 *
 * Tests speed conversion, clamping, fallback speed calculation,
 * consecutive failure tracking, and stale data timeout.
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.7, 1.8, 22.3**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GPSService,
  createGPSService,
  convertSpeedToKmh,
  clampSpeed,
  calculateSpeedKmh,
  type GPSServiceCallbacks,
  type GPSError,
} from '@/features/gps/domain/gps-service';
import type { GeolocationAdapter } from '@/features/gps/infrastructure/geolocation-adapter';
import type { GPSPosition, ValidatedPosition } from '@/features/gps/domain/gps-types';

// --- Helper: mock adapter ---

type PositionCb = (position: GPSPosition) => void;
type ErrorCb = (error: GeolocationPositionError) => void;

function createMockAdapter() {
  let positionCb: PositionCb | null = null;
  let errorCb: ErrorCb | null = null;
  const cleanupFn = vi.fn();

  const adapter: GeolocationAdapter = {
    watchPosition(onPosition, onError) {
      positionCb = onPosition;
      errorCb = onError;
      return cleanupFn;
    },
  };

  return {
    adapter,
    cleanupFn,
    emitPosition(pos: GPSPosition) {
      positionCb?.(pos);
    },
    emitError(code: number = 2) {
      const err = {
        code,
        message: 'Test error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;
      errorCb?.(err);
    },
  };
}

function createCallbacks() {
  return {
    onPosition: vi.fn<[ValidatedPosition], void>(),
    onError: vi.fn<[GPSError], void>(),
    onStateChange: vi.fn(),
  } satisfies GPSServiceCallbacks;
}

function makePosition(overrides: Partial<GPSPosition> = {}): GPSPosition {
  return {
    latitude: 30.0444,
    longitude: 31.2357,
    speed: 10, // 10 m/s = 36 km/h
    heading: 90,
    accuracy: 5,
    altitude: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

// --- Tests ---

describe('convertSpeedToKmh', () => {
  it('should convert 0 m/s to 0 km/h', () => {
    expect(convertSpeedToKmh(0)).toBe(0);
  });

  it('should convert 1 m/s to 3.6 km/h', () => {
    expect(convertSpeedToKmh(1)).toBeCloseTo(3.6, 10);
  });

  it('should convert 10 m/s to 36 km/h', () => {
    expect(convertSpeedToKmh(10)).toBeCloseTo(36, 10);
  });

  it('should convert 27.78 m/s to ~100 km/h', () => {
    expect(convertSpeedToKmh(27.78)).toBeCloseTo(100.008, 1);
  });
});

describe('clampSpeed', () => {
  it('should clamp 0 to 0.0', () => {
    expect(clampSpeed(0)).toBe(0.0);
  });

  it('should clamp 1.9 km/h to 0.0', () => {
    expect(clampSpeed(1.9)).toBe(0.0);
  });

  it('should NOT clamp 2.0 km/h (threshold is below, not at)', () => {
    expect(clampSpeed(2.0)).toBe(2.0);
  });

  it('should NOT clamp 2.1 km/h', () => {
    expect(clampSpeed(2.1)).toBe(2.1);
  });

  it('should NOT clamp 100 km/h', () => {
    expect(clampSpeed(100)).toBe(100);
  });
});

describe('calculateSpeedKmh (fallback speed)', () => {
  it('should return 0 when time delta is 0', () => {
    const prev: ValidatedPosition = {
      latitude: 30.0,
      longitude: 31.0,
      speedKmh: 0,
      heading: null,
      accuracy: 5,
      timestamp: 1000,
    };
    const curr = { latitude: 30.001, longitude: 31.001, timestamp: 1000 };
    expect(calculateSpeedKmh(prev, curr)).toBe(0);
  });

  it('should return 0 when time delta is negative', () => {
    const prev: ValidatedPosition = {
      latitude: 30.0,
      longitude: 31.0,
      speedKmh: 0,
      heading: null,
      accuracy: 5,
      timestamp: 2000,
    };
    const curr = { latitude: 30.001, longitude: 31.001, timestamp: 1000 };
    expect(calculateSpeedKmh(prev, curr)).toBe(0);
  });

  it('should calculate positive speed for positions 1 second apart', () => {
    const prev: ValidatedPosition = {
      latitude: 30.0,
      longitude: 31.0,
      speedKmh: 0,
      heading: null,
      accuracy: 5,
      timestamp: 0,
    };
    // Move ~0.01 degrees latitude ≈ ~1.11 km
    const curr = { latitude: 30.01, longitude: 31.0, timestamp: 1000 };
    const speed = calculateSpeedKmh(prev, curr);
    // 1.11 km in 1 second = 1.11 * 3600 ≈ ~4000 km/h (extreme but mathematical)
    expect(speed).toBeGreaterThan(0);
  });

  it('should produce realistic speed for realistic deltas', () => {
    const prev: ValidatedPosition = {
      latitude: 30.0,
      longitude: 31.0,
      speedKmh: 36,
      heading: null,
      accuracy: 5,
      timestamp: 0,
    };
    // ~10 meters north in 1 second ≈ 36 km/h
    // 10m = 0.000090 degrees latitude
    const curr = { latitude: 30.000090, longitude: 31.0, timestamp: 1000 };
    const speed = calculateSpeedKmh(prev, curr);
    // Should be around 36 km/h (±5 km/h for spherical approximation)
    expect(speed).toBeGreaterThan(30);
    expect(speed).toBeLessThan(42);
  });

  it('should return 0 for same position regardless of time', () => {
    const prev: ValidatedPosition = {
      latitude: 30.0,
      longitude: 31.0,
      speedKmh: 0,
      heading: null,
      accuracy: 5,
      timestamp: 0,
    };
    const curr = { latitude: 30.0, longitude: 31.0, timestamp: 5000 };
    expect(calculateSpeedKmh(prev, curr)).toBe(0);
  });
});

describe('GPSService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start/stop lifecycle', () => {
    it('should start watching positions via the adapter', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());

      expect(callbacks.onPosition).toHaveBeenCalledTimes(1);
    });

    it('should not start twice if already running', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      service.start(callbacks); // second call should be no-op

      mock.emitPosition(makePosition());
      expect(callbacks.onPosition).toHaveBeenCalledTimes(1);
    });

    it('should stop watching when stop is called', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      service.stop();

      expect(mock.cleanupFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('position validation and normalization', () => {
    it('should convert speed from m/s to km/h', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ speed: 10 })); // 10 m/s = 36 km/h

      const emitted = callbacks.onPosition.mock.calls[0][0];
      expect(emitted.speedKmh).toBeCloseTo(36, 1);
    });

    it('should clamp speed below 2 km/h to 0.0', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      // 0.5 m/s = 1.8 km/h → clamped to 0.0
      mock.emitPosition(makePosition({ speed: 0.5 }));

      const emitted = callbacks.onPosition.mock.calls[0][0];
      expect(emitted.speedKmh).toBe(0.0);
    });

    it('should not clamp speed at exactly 2 km/h', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      // 2.0 / 3.6 ≈ 0.5556 m/s → 2.0 km/h → not clamped
      mock.emitPosition(makePosition({ speed: 2.0 / 3.6 }));

      const emitted = callbacks.onPosition.mock.calls[0][0];
      expect(emitted.speedKmh).toBeCloseTo(2.0, 1);
    });

    it('should discard positions with invalid latitude', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ latitude: 91 })); // invalid

      expect(callbacks.onPosition).not.toHaveBeenCalled();
    });

    it('should discard positions with invalid longitude', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ longitude: -181 })); // invalid

      expect(callbacks.onPosition).not.toHaveBeenCalled();
    });

    it('should discard positions with negative accuracy', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ accuracy: -1 })); // invalid

      expect(callbacks.onPosition).not.toHaveBeenCalled();
    });
  });

  describe('fallback speed calculation', () => {
    it('should calculate speed from position delta when GPS speed is null', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);

      // First position with speed
      mock.emitPosition(makePosition({ speed: 10, timestamp: 0 }));

      // Second position with null speed, moved ~10m north in 1 second
      mock.emitPosition(
        makePosition({
          speed: null,
          latitude: 30.0444 + 0.000090, // ~10m north
          timestamp: 1000,
        })
      );

      const secondEmitted = callbacks.onPosition.mock.calls[1][0];
      // Fallback calculated speed should be approximately 36 km/h
      expect(secondEmitted.speedKmh).toBeGreaterThan(0);
    });

    it('should emit 0.0 when speed is null and no previous position', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ speed: null, timestamp: 1000 }));

      const emitted = callbacks.onPosition.mock.calls[0][0];
      expect(emitted.speedKmh).toBe(0.0);
    });
  });

  describe('consecutive failure tracking', () => {
    it('should emit signal_lost after 3 consecutive errors', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);

      mock.emitError(2); // failure 1
      mock.emitError(2); // failure 2
      expect(callbacks.onError).not.toHaveBeenCalled();

      mock.emitError(2); // failure 3 → signal lost
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signal_lost' })
      );
    });

    it('should reset failure counter on successful position', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);

      mock.emitError(2); // failure 1
      mock.emitError(2); // failure 2
      mock.emitPosition(makePosition()); // success → resets counter
      mock.emitError(2); // failure 1 again
      mock.emitError(2); // failure 2 again

      // Should not have emitted signal_lost since counter reset
      expect(callbacks.onError).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signal_lost' })
      );
    });

    it('should update state with consecutiveFailures count', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);

      mock.emitError(2);
      expect(service.getState().consecutiveFailures).toBe(1);

      mock.emitError(2);
      expect(service.getState().consecutiveFailures).toBe(2);

      mock.emitError(2);
      expect(service.getState().consecutiveFailures).toBe(3);
      expect(service.getState().signalStatus).toBe('lost');
    });

    it('should emit permission_denied for PERMISSION_DENIED error code', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitError(1); // PERMISSION_DENIED

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'permission_denied' })
      );
      expect(service.getState().signalStatus).toBe('denied');
    });
  });

  describe('stale data timeout (5 minutes)', () => {
    it('should clear currentPosition after 5 minutes with no valid position', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());

      // Fast-forward 5 minutes
      vi.advanceTimersByTime(300_000);

      expect(service.getState().currentPosition).toBeNull();
      expect(service.getState().signalStatus).toBe('lost');
    });

    it('should emit signal_lost error on stale data timeout', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());

      vi.advanceTimersByTime(300_000);

      // Should have been called with signal_lost (from stale timeout)
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signal_lost' })
      );
    });

    it('should reset stale timer on each valid position', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition({ timestamp: 0 }));

      // Advance 4 minutes (less than 5)
      vi.advanceTimersByTime(240_000);

      // Another valid position resets the timer
      mock.emitPosition(makePosition({ timestamp: 240_000 }));

      // Advance another 4 minutes (total 8 from start, but only 4 from reset)
      vi.advanceTimersByTime(240_000);

      // Should still be active (not stale)
      expect(service.getState().signalStatus).toBe('active');
      expect(service.getState().currentPosition).not.toBeNull();
    });

    it('should not trigger stale timeout if stopped', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());
      service.stop();

      // Advance past 5 minutes
      vi.advanceTimersByTime(400_000);

      // onError should NOT have been called for stale timeout (only if it was called during active operation)
      // The initial position doesn't cause an error, stale timer was cleared on stop
      const signalLostCalls = callbacks.onError.mock.calls.filter(
        (call) => call[0].type === 'signal_lost'
      );
      expect(signalLostCalls).toHaveLength(0);
    });
  });

  describe('state management', () => {
    it('should start with acquiring status', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);

      expect(service.getState().signalStatus).toBe('acquiring');
      expect(service.getState().currentPosition).toBeNull();
      expect(service.getState().consecutiveFailures).toBe(0);
    });

    it('should transition to active on first valid position', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());

      expect(service.getState().signalStatus).toBe('active');
    });

    it('should reset all state on reset()', () => {
      const mock = createMockAdapter();
      const service = createGPSService(mock.adapter);
      const callbacks = createCallbacks();

      service.start(callbacks);
      mock.emitPosition(makePosition());
      mock.emitError(2);

      service.reset();

      expect(service.getState()).toEqual({
        currentPosition: null,
        lastValidPosition: null,
        signalStatus: 'acquiring',
        consecutiveFailures: 0,
      });
    });
  });
});
