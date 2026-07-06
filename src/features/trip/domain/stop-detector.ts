/**
 * Stop Detection State Machine for RoadPilot Egypt.
 *
 * Implements a 3-state machine to classify driving vs. stop time:
 * - 'driving': speed >= threshold (2 km/h)
 * - 'maybe_stopped': speed < threshold for < 30 seconds (grace period)
 * - 'stopped': speed < threshold for >= 30 seconds (confirmed stop)
 *
 * The processor is pure — no side effects. Persistence decisions
 * (IndexedDB writes every 60s, stop event records) are made by the caller
 * based on the returned events.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6, 8.7**
 */

import type { StopEvent } from './trip-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible movement states in the stop detection state machine. */
export type MovementState = 'driving' | 'maybe_stopped' | 'stopped';

/** Internal state of the stop detector, carried across readings. */
export interface StopDetectorState {
  /** Current movement classification. */
  movementState: MovementState;
  /** Timestamp (ms) when the current state was entered. */
  stateEnteredAt: number;
  /** Grace period before confirming a stop, in milliseconds. Default 30,000. */
  gracePeriodMs: number;
  /** Speed threshold below which vehicle is considered not moving. Default 2. */
  speedThresholdKmh: number;
  /** Accumulated driving time in milliseconds. */
  drivingTimeMs: number;
  /** Accumulated stop time in milliseconds. */
  stopTimeMs: number;
  /** Timestamp of the last processed reading (for delta calculations). */
  lastReadingTimestamp: number;
  /** Whether the detector is paused due to GPS signal loss. */
  signalLost: boolean;
  /** Threshold (ms) for considering GPS signal lost. Default 10,000. */
  signalLossThresholdMs: number;
  /** Coordinates at the start of a potential/confirmed stop (for stop event records). */
  stopCoordinates: { lat: number; lng: number } | null;
  /**
   * Time tentatively counted as driving during the maybe_stopped grace period.
   * On confirmation, this amount gets moved from drivingTimeMs to stopTimeMs.
   */
  tentativeGraceDrivingMs: number;
}

/** Events emitted by the stop detector for the caller to act upon. */
export type StopDetectorEvent =
  | StopConfirmedEvent
  | StopEndedEvent
  | SignalLostEvent
  | SignalRestoredEvent
  | PersistCheckpointEvent;

/** Emitted when a stop is confirmed (grace period elapsed). */
export interface StopConfirmedEvent {
  type: 'stop_confirmed';
  /** The grace period duration that was retroactively reclassified as stop time. */
  retroactiveMs: number;
}

/** Emitted when a confirmed stop ends (speed picks back up). */
export interface StopEndedEvent {
  type: 'stop_ended';
  /** The completed stop event record. */
  stopEvent: StopEvent;
}

/** Emitted when GPS signal is considered lost (no data for > signalLossThreshold). */
export interface SignalLostEvent {
  type: 'signal_lost';
}

/** Emitted when GPS signal is restored after a loss. */
export interface SignalRestoredEvent {
  type: 'signal_restored';
}

/** Emitted when persistence should occur (caller decides — e.g., every 60s). */
export interface PersistCheckpointEvent {
  type: 'persist_checkpoint';
  drivingTimeMs: number;
  stopTimeMs: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Creates the initial stop detector state. */
export function createStopDetectorState(
  timestamp: number,
  options?: Partial<Pick<StopDetectorState, 'gracePeriodMs' | 'speedThresholdKmh' | 'signalLossThresholdMs'>>
): StopDetectorState {
  return {
    movementState: 'driving',
    stateEnteredAt: timestamp,
    gracePeriodMs: options?.gracePeriodMs ?? 30_000,
    speedThresholdKmh: options?.speedThresholdKmh ?? 2,
    drivingTimeMs: 0,
    stopTimeMs: 0,
    lastReadingTimestamp: timestamp,
    signalLost: false,
    signalLossThresholdMs: options?.signalLossThresholdMs ?? 10_000,
    stopCoordinates: null,
    tentativeGraceDrivingMs: 0,
  };
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

/**
 * Processes a new speed reading and advances the state machine.
 *
 * This function is pure — it returns the new state and any events
 * that should be handled by the caller (persistence, UI updates, etc.).
 *
 * @param state - Current stop detector state
 * @param speedKmh - Current speed in km/h
 * @param timestamp - Current reading timestamp in ms (Unix epoch)
 * @param coordinates - Optional coordinates for this reading (used in stop event records)
 * @returns New state and any events produced
 */
export function processSpeedReading(
  state: StopDetectorState,
  speedKmh: number,
  timestamp: number,
  coordinates?: { lat: number; lng: number }
): { newState: StopDetectorState; events: StopDetectorEvent[] } {
  const events: StopDetectorEvent[] = [];
  let newState = { ...state };

  // --- Handle GPS signal loss detection ---
  const gap = timestamp - state.lastReadingTimestamp;

  if (gap > state.signalLossThresholdMs && !state.signalLost) {
    // Signal was lost — pause counters, don't accumulate any time for the gap
    newState.signalLost = true;
    newState.lastReadingTimestamp = timestamp;
    events.push({ type: 'signal_lost' });
    return { newState, events };
  }

  if (state.signalLost) {
    // Signal restored — resume but don't count this reading's gap
    newState.signalLost = false;
    newState.lastReadingTimestamp = timestamp;
    events.push({ type: 'signal_restored' });
    // Don't process state machine for this reading — just restore signal
    // The next reading will resume normal processing
    return { newState, events };
  }

  // --- Calculate time delta for accumulation ---
  const deltaMs = Math.max(0, timestamp - state.lastReadingTimestamp);
  newState.lastReadingTimestamp = timestamp;

  const belowThreshold = speedKmh < state.speedThresholdKmh;

  // --- State machine transitions ---
  switch (state.movementState) {
    case 'driving': {
      if (belowThreshold) {
        // Transition to grace period.
        // This reading's delta is tentatively counted as driving
        // (will be retroactively reclassified as stop time if stop confirms).
        newState.drivingTimeMs += deltaMs;
        newState.movementState = 'maybe_stopped';
        newState.stateEnteredAt = timestamp;
        newState.stopCoordinates = coordinates ?? null;
        newState.tentativeGraceDrivingMs = deltaMs;
      } else {
        // Continue driving
        newState.drivingTimeMs += deltaMs;
      }
      break;
    }

    case 'maybe_stopped': {
      if (!belowThreshold) {
        // Speed picked up — grace period stays as driving time (already counted)
        newState.drivingTimeMs += deltaMs;
        newState.movementState = 'driving';
        newState.stateEnteredAt = timestamp;
        newState.stopCoordinates = null;
        newState.tentativeGraceDrivingMs = 0;
      } else {
        // Still below threshold — check if grace period elapsed
        const timeInGrace = timestamp - state.stateEnteredAt;

        if (timeInGrace >= state.gracePeriodMs) {
          // Confirmed stop — retroactively reclassify grace period as stop time.
          // Move the tentatively-counted driving time back to stop time.
          const retroactiveMs = state.tentativeGraceDrivingMs;
          newState.drivingTimeMs -= retroactiveMs;
          if (newState.drivingTimeMs < 0) {
            newState.drivingTimeMs = 0;
          }
          newState.stopTimeMs += retroactiveMs + deltaMs;
          newState.movementState = 'stopped';
          // stateEnteredAt stays as when maybe_stopped was entered (for stop duration calc)
          newState.tentativeGraceDrivingMs = 0;

          events.push({
            type: 'stop_confirmed',
            retroactiveMs,
          });
        } else {
          // Still in grace period — count as driving time tentatively
          newState.drivingTimeMs += deltaMs;
          newState.tentativeGraceDrivingMs += deltaMs;
        }
      }
      break;
    }

    case 'stopped': {
      if (!belowThreshold) {
        // Stop ended — emit stop event with duration
        const stopDurationMs = timestamp - state.stateEnteredAt;
        const stopEvent: StopEvent = {
          startTimestamp: state.stateEnteredAt,
          durationMs: stopDurationMs,
          coordinates: state.stopCoordinates ?? coordinates ?? { lat: 0, lng: 0 },
        };

        // The delta for this reading counts as stop time (transition happens at this moment)
        newState.stopTimeMs += deltaMs;
        newState.movementState = 'driving';
        newState.stateEnteredAt = timestamp;
        newState.stopCoordinates = null;

        events.push({
          type: 'stop_ended',
          stopEvent,
        });
      } else {
        // Continue stopped
        newState.stopTimeMs += deltaMs;
      }
      break;
    }
  }

  return { newState, events };
}

/**
 * Checks if a persistence checkpoint should be triggered.
 *
 * The caller should invoke this periodically (e.g., every reading) and
 * persist when it returns an event. The persistence interval is managed
 * by the caller (every 60 seconds).
 *
 * @param state - Current stop detector state
 * @param lastPersistTimestamp - Timestamp of last persistence
 * @param currentTimestamp - Current timestamp
 * @param persistIntervalMs - Interval between persists (default 60,000 ms)
 * @returns A persist event if checkpoint is due, null otherwise
 */
export function checkPersistCheckpoint(
  state: StopDetectorState,
  lastPersistTimestamp: number,
  currentTimestamp: number,
  persistIntervalMs: number = 60_000
): PersistCheckpointEvent | null {
  if (currentTimestamp - lastPersistTimestamp >= persistIntervalMs) {
    return {
      type: 'persist_checkpoint',
      drivingTimeMs: state.drivingTimeMs,
      stopTimeMs: state.stopTimeMs,
    };
  }
  return null;
}
