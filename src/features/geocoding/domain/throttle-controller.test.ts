import { describe, it, expect } from 'vitest';
import {
  createThrottleState,
  shouldRequest,
  THROTTLE_INTERVAL_MS,
} from './throttle-controller';

describe('ThrottleController', () => {
  it('allows the first request immediately', () => {
    const state = createThrottleState();
    const { allowed, nextState } = shouldRequest(state, 1000);

    expect(allowed).toBe(true);
    expect(nextState.lastRequestTimestamp).toBe(1000);
  });

  it('disallows requests within the 3-second interval', () => {
    const state = createThrottleState();
    const { nextState: afterFirst } = shouldRequest(state, 1000);

    // 1 second later — should be denied
    const { allowed } = shouldRequest(afterFirst, 2000);
    expect(allowed).toBe(false);
  });

  it('allows a request exactly at the 3-second boundary', () => {
    const state = createThrottleState();
    const { nextState: afterFirst } = shouldRequest(state, 1000);

    // Exactly 3000ms later
    const { allowed } = shouldRequest(afterFirst, 1000 + THROTTLE_INTERVAL_MS);
    expect(allowed).toBe(true);
  });

  it('allows a request after the 3-second interval', () => {
    const state = createThrottleState();
    const { nextState: afterFirst } = shouldRequest(state, 1000);

    // 4 seconds later
    const { allowed, nextState } = shouldRequest(afterFirst, 5000);
    expect(allowed).toBe(true);
    expect(nextState.lastRequestTimestamp).toBe(5000);
  });

  it('discards intermediate positions during cooldown', () => {
    const state = createThrottleState();
    const { nextState: s1 } = shouldRequest(state, 1000);

    // Rapid sequence of positions during cooldown
    const { allowed: a2, nextState: s2 } = shouldRequest(s1, 1500);
    const { allowed: a3, nextState: s3 } = shouldRequest(s2, 2000);
    const { allowed: a4, nextState: s4 } = shouldRequest(s3, 2500);
    const { allowed: a5, nextState: s5 } = shouldRequest(s4, 3000);

    expect(a2).toBe(false);
    expect(a3).toBe(false);
    expect(a4).toBe(false);
    expect(a5).toBe(false);

    // State should still point to the original request time
    expect(s5.lastRequestTimestamp).toBe(1000);
  });

  it('allows request after cooldown following discarded positions', () => {
    const state = createThrottleState();
    const { nextState: s1 } = shouldRequest(state, 1000);

    // Discarded positions
    const { nextState: s2 } = shouldRequest(s1, 1500);
    const { nextState: s3 } = shouldRequest(s2, 2000);

    // After full cooldown from last allowed request
    const { allowed, nextState } = shouldRequest(s3, 4001);
    expect(allowed).toBe(true);
    expect(nextState.lastRequestTimestamp).toBe(4001);
  });

  it('correctly tracks state through multiple allowed requests', () => {
    let state = createThrottleState();

    // Request at t=0
    const r1 = shouldRequest(state, 0);
    expect(r1.allowed).toBe(true);
    state = r1.nextState;

    // Request at t=3000
    const r2 = shouldRequest(state, 3000);
    expect(r2.allowed).toBe(true);
    state = r2.nextState;

    // Request at t=6000
    const r3 = shouldRequest(state, 6000);
    expect(r3.allowed).toBe(true);
    state = r3.nextState;

    expect(state.lastRequestTimestamp).toBe(6000);
  });

  it('does not mutate the original state', () => {
    const state = createThrottleState();
    const original = { ...state };

    shouldRequest(state, 5000);

    // Original state should remain unchanged (lastRequestTimestamp is still null)
    expect(state).toEqual(original);
  });

  it('handles zero timestamp', () => {
    const state = createThrottleState();
    const { allowed } = shouldRequest(state, 0);
    expect(allowed).toBe(true);
  });
});
