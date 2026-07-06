/**
 * Unit tests for the stop detection state machine.
 *
 * Tests the 3-state machine (driving → maybe_stopped → stopped),
 * the 30-second grace period with retroactive reclassification,
 * GPS signal loss detection, and persistence checkpoint logic.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6, 8.7**
 */
import { describe, it, expect } from 'vitest';
import {
  createStopDetectorState,
  processSpeedReading,
  checkPersistCheckpoint,
  type StopDetectorState,
  type StopDetectorEvent,
} from '@/features/trip/domain/stop-detector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Feeds a sequence of speed readings into the detector and returns final state + all events. */
function feedReadings(
  initialState: StopDetectorState,
  readings: Array<{ speedKmh: number; timestamp: number; coordinates?: { lat: number; lng: number } }>
): { state: StopDetectorState; events: StopDetectorEvent[] } {
  let state = initialState;
  const allEvents: StopDetectorEvent[] = [];

  for (const reading of readings) {
    const result = processSpeedReading(state, reading.speedKmh, reading.timestamp, reading.coordinates);
    state = result.newState;
    allEvents.push(...result.events);
  }

  return { state, events: allEvents };
}

/**
 * Generates readings at 1-second intervals with the given speed.
 * This simulates realistic GPS data where readings arrive every second.
 */
function generateReadings(
  startTimestamp: number,
  count: number,
  speedKmh: number,
  coordinates?: { lat: number; lng: number }
): Array<{ speedKmh: number; timestamp: number; coordinates?: { lat: number; lng: number } }> {
  return Array.from({ length: count }, (_, i) => ({
    speedKmh,
    timestamp: startTimestamp + i * 1000,
    ...(coordinates ? { coordinates } : {}),
  }));
}

// ---------------------------------------------------------------------------
// State Initialization
// ---------------------------------------------------------------------------

describe('createStopDetectorState', () => {
  it('should initialize in driving state', () => {
    const state = createStopDetectorState(1000);
    expect(state.movementState).toBe('driving');
    expect(state.drivingTimeMs).toBe(0);
    expect(state.stopTimeMs).toBe(0);
    expect(state.signalLost).toBe(false);
  });

  it('should use default thresholds', () => {
    const state = createStopDetectorState(1000);
    expect(state.gracePeriodMs).toBe(30_000);
    expect(state.speedThresholdKmh).toBe(2);
    expect(state.signalLossThresholdMs).toBe(10_000);
  });

  it('should allow custom thresholds', () => {
    const state = createStopDetectorState(1000, {
      gracePeriodMs: 15_000,
      speedThresholdKmh: 5,
      signalLossThresholdMs: 20_000,
    });
    expect(state.gracePeriodMs).toBe(15_000);
    expect(state.speedThresholdKmh).toBe(5);
    expect(state.signalLossThresholdMs).toBe(20_000);
  });
});

// ---------------------------------------------------------------------------
// Driving State
// ---------------------------------------------------------------------------

describe('driving state', () => {
  it('should stay in driving state when speed >= threshold', () => {
    const state = createStopDetectorState(0);
    const { newState } = processSpeedReading(state, 50, 1000);
    expect(newState.movementState).toBe('driving');
  });

  it('should accumulate driving time when speed >= threshold', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    const { newState: s2 } = processSpeedReading(s1, 60, 2000);
    expect(s2.drivingTimeMs).toBe(2000);
  });

  it('should transition to maybe_stopped when speed drops below threshold', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    const { newState: s2 } = processSpeedReading(s1, 1, 2000);
    expect(s2.movementState).toBe('maybe_stopped');
  });

  it('should record stop coordinates on transition to maybe_stopped', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    const { newState: s2 } = processSpeedReading(s1, 1, 2000, { lat: 30.0, lng: 31.2 });
    expect(s2.stopCoordinates).toEqual({ lat: 30.0, lng: 31.2 });
  });

  it('should not emit events when staying in driving state', () => {
    const state = createStopDetectorState(0);
    const { events } = processSpeedReading(state, 50, 1000);
    expect(events).toHaveLength(0);
  });

  it('should treat exactly 2 km/h as driving (>= threshold)', () => {
    const state = createStopDetectorState(0);
    const { newState } = processSpeedReading(state, 2, 1000);
    expect(newState.movementState).toBe('driving');
  });
});

// ---------------------------------------------------------------------------
// Maybe Stopped State (Grace Period)
// ---------------------------------------------------------------------------

describe('maybe_stopped state (grace period)', () => {
  it('should return to driving if speed picks up before grace period ends', () => {
    const state = createStopDetectorState(0);
    // Drive for 2s, then slow down for 5s, then speed up
    const readings = [
      ...generateReadings(1000, 2, 50),       // driving: 1000, 2000
      ...generateReadings(3000, 5, 1),        // maybe_stopped: 3000-7000
      { speedKmh: 50, timestamp: 8000 },      // back to driving
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('driving');
  });

  it('should count grace period time as driving time when speed picks up', () => {
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),       // driving: 1000, 2000
      ...generateReadings(3000, 5, 1),        // maybe_stopped: 3000-7000
      { speedKmh: 50, timestamp: 8000 },      // back to driving
    ];
    const { state: finalState } = feedReadings(state, readings);
    // All 8 seconds should be driving time
    expect(finalState.drivingTimeMs).toBe(8000);
    expect(finalState.stopTimeMs).toBe(0);
  });

  it('should transition to stopped after grace period elapses', () => {
    const state = createStopDetectorState(0);
    // Drive for 2s, then stay below threshold for 31s (exceeds 30s grace)
    const readings = [
      ...generateReadings(1000, 2, 50),        // driving: 1000, 2000
      ...generateReadings(3000, 31, 0),        // maybe_stopped → stopped
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('stopped');
  });

  it('should emit stop_confirmed event when grace period elapses', () => {
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),
      ...generateReadings(3000, 31, 0),
    ];
    const { events } = feedReadings(state, readings);
    const confirmed = events.find(e => e.type === 'stop_confirmed');
    expect(confirmed).toBeDefined();
    if (confirmed && confirmed.type === 'stop_confirmed') {
      expect(confirmed.retroactiveMs).toBe(30_000);
    }
  });

  it('should retroactively reclassify grace period as stop time', () => {
    const state = createStopDetectorState(0);
    // Drive 2s, then 31s below threshold
    const readings = [
      ...generateReadings(1000, 2, 50),        // 2s driving
      ...generateReadings(3000, 31, 0),        // 31s: 30s grace → stop time, 1s stopped
    ];
    const { state: finalState } = feedReadings(state, readings);
    // Total elapsed: 33000ms (from 0 to 33000)
    // Driving: first 2000ms (before entering maybe_stopped) + 1000ms transition into maybe_stopped
    // Actually: readings start at 1000, so from state init (0) to last reading (33000) = 33000ms
    // The grace period (30s) should be reclassified as stop time
    // driving should be: time before entering maybe_stopped = 3000ms (0→1000, 1000→2000, 2000→3000)
    // But wait: reading at 3000 is the FIRST below-threshold reading, so at that point we're
    // transitioning from driving to maybe_stopped. The delta (3000-2000=1000) is counted as driving.
    // Then the grace period starts at timestamp 3000.
    // After 30s (at timestamp 33000), stop is confirmed.
    // Total driving = 3000ms (0→3000), stop = 30000ms (grace) + 0ms extra = 30000ms
    // But actually the 31st reading is at 33000 and adds another second of stop...
    // Let me just check the invariant: driving + stop = total elapsed
    const totalElapsed = 33000; // last timestamp (3000 + 30*1000)
    expect(finalState.drivingTimeMs + finalState.stopTimeMs).toBe(totalElapsed);
    // And stop time should include the retroactive grace period
    expect(finalState.stopTimeMs).toBeGreaterThanOrEqual(30000);
  });

  it('should correctly handle multiple readings during grace period', () => {
    const state = createStopDetectorState(0);
    // Drive 2s, slow 15s, more slow 16s (total 31s below threshold → confirmed)
    const readings = [
      ...generateReadings(1000, 2, 50),      // 2s driving
      ...generateReadings(3000, 31, 0.5),    // 31s below threshold
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('stopped');
    // Total elapsed = 33000ms
    expect(finalState.drivingTimeMs + finalState.stopTimeMs).toBe(33000);
  });
});

// ---------------------------------------------------------------------------
// Stopped State
// ---------------------------------------------------------------------------

describe('stopped state', () => {
  it('should stay in stopped state when speed remains below threshold', () => {
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),       // driving
      ...generateReadings(3000, 31, 0),       // → stopped
      ...generateReadings(34000, 5, 0),       // still stopped
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('stopped');
  });

  it('should accumulate stop time while stopped', () => {
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),       // 2s driving
      ...generateReadings(3000, 31, 0),       // 31s → confirmed stop
      ...generateReadings(34000, 10, 0),      // 10s more stopped
    ];
    const { state: finalState } = feedReadings(state, readings);
    // Stop time = 30s grace + 1s (confirmation reading) + 10s additional = 41s
    expect(finalState.stopTimeMs).toBeGreaterThanOrEqual(40000);
  });

  it('should transition back to driving when speed >= threshold', () => {
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),       // driving
      ...generateReadings(3000, 31, 0),       // → stopped
      { speedKmh: 50, timestamp: 35000 },     // → driving
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('driving');
  });

  it('should emit stop_ended event with correct duration and coordinates', () => {
    const coords = { lat: 30.0444, lng: 31.2357 };
    const state = createStopDetectorState(0);
    const readings = [
      ...generateReadings(1000, 2, 50),
      { speedKmh: 1, timestamp: 3000, coordinates: coords }, // → maybe_stopped
      ...generateReadings(4000, 30, 0),                       // grace period fills + confirmed
      ...generateReadings(34000, 10, 0),                      // more stop time
      { speedKmh: 50, timestamp: 44000 },                     // → driving (stop_ended)
    ];
    const { events } = feedReadings(state, readings);
    const ended = events.find(e => e.type === 'stop_ended');
    expect(ended).toBeDefined();
    if (ended && ended.type === 'stop_ended') {
      expect(ended.stopEvent.coordinates).toEqual(coords);
      // Stop started at 3000 (when maybe_stopped entered), ended at 44000
      expect(ended.stopEvent.startTimestamp).toBe(3000);
      expect(ended.stopEvent.durationMs).toBe(41000); // 44000 - 3000
    }
  });
});

// ---------------------------------------------------------------------------
// GPS Signal Loss
// ---------------------------------------------------------------------------

describe('GPS signal loss', () => {
  it('should detect signal loss when gap > 10 seconds', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    // Next reading after 15 seconds gap (simulates lost signal)
    const { newState: s2, events } = processSpeedReading(s1, 50, 16000);
    expect(s2.signalLost).toBe(true);
    expect(events.some(e => e.type === 'signal_lost')).toBe(true);
  });

  it('should NOT detect signal loss when gap <= 10 seconds', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    // Gap of exactly 10s (at the boundary, not exceeding)
    const { newState: s2, events } = processSpeedReading(s1, 50, 11000);
    expect(s2.signalLost).toBe(false);
    expect(events.some(e => e.type === 'signal_lost')).toBe(false);
  });

  it('should pause both counters during signal loss', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);  // driving += 1000
    // Big gap → signal lost (counters paused, no time added)
    const { newState: s2 } = processSpeedReading(s1, 50, 16000);
    // Driving time should not include the gap
    expect(s2.drivingTimeMs).toBe(1000);
    expect(s2.stopTimeMs).toBe(0);
  });

  it('should restore signal on next reading after loss', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);
    // Signal lost
    const { newState: s2 } = processSpeedReading(s1, 50, 16000);
    expect(s2.signalLost).toBe(true);
    // Next reading restores signal
    const { newState: s3, events } = processSpeedReading(s2, 60, 17000);
    expect(s3.signalLost).toBe(false);
    expect(events.some(e => e.type === 'signal_restored')).toBe(true);
  });

  it('should resume normal accumulation after signal restoration', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);  // driving=1000
    // Signal lost (gap > 10s)
    const { newState: s2 } = processSpeedReading(s1, 50, 16000);    // signal_lost, driving stays 1000
    // Signal restored (next reading within normal interval)
    const { newState: s3 } = processSpeedReading(s2, 60, 17000);    // signal_restored
    // 1s after restoration → normal driving accumulation
    const { newState: s4 } = processSpeedReading(s3, 60, 18000);
    // driving should be 1000 (before gap) + 1000 (after restoration)
    expect(s4.drivingTimeMs).toBe(2000);
  });

  it('should not accumulate time for the restoration reading itself', () => {
    const state = createStopDetectorState(0);
    const { newState: s1 } = processSpeedReading(state, 50, 1000);  // driving=1000
    const { newState: s2 } = processSpeedReading(s1, 50, 16000);    // signal_lost
    const { newState: s3 } = processSpeedReading(s2, 60, 17000);    // signal_restored
    // The restoration reading doesn't add its gap to counters
    expect(s3.drivingTimeMs).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Persistence Checkpoint
// ---------------------------------------------------------------------------

describe('checkPersistCheckpoint', () => {
  it('should return persist event when interval elapsed', () => {
    const state = createStopDetectorState(0);
    const updated = { ...state, drivingTimeMs: 50000, stopTimeMs: 10000 };
    const event = checkPersistCheckpoint(updated, 0, 60000);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('persist_checkpoint');
    expect(event!.drivingTimeMs).toBe(50000);
    expect(event!.stopTimeMs).toBe(10000);
  });

  it('should return null when interval not yet elapsed', () => {
    const state = createStopDetectorState(0);
    const event = checkPersistCheckpoint(state, 0, 30000);
    expect(event).toBeNull();
  });

  it('should use custom interval', () => {
    const state = createStopDetectorState(0);
    const event = checkPersistCheckpoint(state, 0, 5000, 5000);
    expect(event).not.toBeNull();
  });

  it('should return null exactly at boundary (not yet elapsed)', () => {
    const state = createStopDetectorState(0);
    // Exactly 59999ms since last persist (< 60000)
    const event = checkPersistCheckpoint(state, 0, 59999);
    expect(event).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge Cases and Integration Scenarios
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('should handle speed exactly at threshold boundary', () => {
    const state = createStopDetectorState(0);
    // Speed = 1.999 (below 2 km/h threshold)
    const { newState } = processSpeedReading(state, 1.999, 1000);
    expect(newState.movementState).toBe('maybe_stopped');
  });

  it('should handle zero speed', () => {
    const state = createStopDetectorState(0);
    const { newState } = processSpeedReading(state, 0, 1000);
    expect(newState.movementState).toBe('maybe_stopped');
  });

  it('should handle the first reading correctly (no time delta)', () => {
    const state = createStopDetectorState(1000);
    // First reading at the exact same timestamp as initialization
    const { newState } = processSpeedReading(state, 50, 1000);
    expect(newState.drivingTimeMs).toBe(0); // No time elapsed
    expect(newState.movementState).toBe('driving');
  });

  it('should maintain time invariant: driving + stop = elapsed', () => {
    const state = createStopDetectorState(0);
    // Realistic scenario: drive, stop, drive again
    const readings = [
      ...generateReadings(1000, 5, 80),       // 5s driving
      ...generateReadings(6000, 31, 0),       // 31s → confirmed stop
      ...generateReadings(37000, 5, 0),       // 5s more stop
      ...generateReadings(42000, 10, 60),     // 10s driving again
    ];
    const { state: finalState } = feedReadings(state, readings);
    const totalElapsed = 51000; // from 0 to 51000 (last reading at 42000+9*1000=51000)
    expect(finalState.drivingTimeMs + finalState.stopTimeMs).toBe(totalElapsed);
  });

  it('should handle rapid transitions without data loss', () => {
    const state = createStopDetectorState(0);
    const readings = [
      { speedKmh: 50, timestamp: 1000 },
      { speedKmh: 1, timestamp: 2000 },   // brief slowdown → maybe_stopped
      { speedKmh: 50, timestamp: 3000 },  // immediately speed up → driving
      { speedKmh: 1, timestamp: 4000 },   // brief slowdown → maybe_stopped
      { speedKmh: 50, timestamp: 5000 },  // speed up → driving
    ];
    const { state: finalState } = feedReadings(state, readings);
    expect(finalState.movementState).toBe('driving');
    expect(finalState.drivingTimeMs).toBe(5000);
    expect(finalState.stopTimeMs).toBe(0);
  });

  it('should handle grace period exactly at boundary (30s)', () => {
    const state = createStopDetectorState(0);
    // Drive 1s, then exactly 30 readings at 1s intervals below threshold
    const readings = [
      { speedKmh: 50, timestamp: 1000 },
      ...generateReadings(2000, 30, 0),   // 30s below threshold (2000 to 31000)
    ];
    const { state: finalState } = feedReadings(state, readings);
    // At exactly 30s, the stop should be confirmed
    // stateEnteredAt = 2000, last reading = 31000, timeInGrace = 31000-2000 = 29000 < 30000
    // Wait: 30 readings from 2000 means last is at 2000 + 29*1000 = 31000
    // timeInGrace for last reading: 31000 - 2000 = 29000 < 30000
    // So it's still maybe_stopped (need one more second)
    expect(finalState.movementState).toBe('maybe_stopped');
  });

  it('should confirm stop at exactly grace period + 1 reading', () => {
    const state = createStopDetectorState(0);
    const readings = [
      { speedKmh: 50, timestamp: 1000 },
      ...generateReadings(2000, 31, 0),   // 31 readings = 30s + 1 more
    ];
    const { state: finalState } = feedReadings(state, readings);
    // stateEnteredAt = 2000, 31st reading at 2000 + 30*1000 = 32000
    // timeInGrace = 32000 - 2000 = 30000 >= 30000 → confirmed
    expect(finalState.movementState).toBe('stopped');
  });
});
