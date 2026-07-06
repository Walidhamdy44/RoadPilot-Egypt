/**
 * Property 1: Speed Conversion and Display
 *
 * Tests that:
 * 1. convertSpeedToKmh(x) === x * 3.6 for all non-negative x
 * 2. clampSpeed(x) === 0.0 for all x < 2, and clampSpeed(x) === x for all x >= 2
 * 3. calculateSpeedKmh always produces non-negative result
 * 4. The combined pipeline: if speed < 2/3.6 m/s, result should be 0.0 after conversion + clamping
 *
 * **Validates: Requirements 1.2, 1.4, 1.7**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbSpeedMs, arbValidatedPosition } from '../helpers'
import {
  convertSpeedToKmh,
  clampSpeed,
  calculateSpeedKmh,
} from '@/features/gps/domain/gps-service'

describe('Property 1: Speed Conversion and Display', () => {
  describe('convertSpeedToKmh correctness', () => {
    it('converts m/s to km/h by multiplying by 3.6 for all non-negative speeds', () => {
      runProperty(
        fc.property(arbSpeedMs, (speedMs) => {
          const result = convertSpeedToKmh(speedMs)
          const expected = speedMs * 3.6
          expect(result).toBeCloseTo(expected, 10)
        })
      )
    })

    it('conversion preserves zero: convertSpeedToKmh(0) === 0', () => {
      expect(convertSpeedToKmh(0)).toBe(0)
    })

    it('conversion result is always non-negative for non-negative input', () => {
      runProperty(
        fc.property(arbSpeedMs, (speedMs) => {
          expect(convertSpeedToKmh(speedMs)).toBeGreaterThanOrEqual(0)
        })
      )
    })
  })

  describe('clampSpeed below-2-km/h handling', () => {
    it('returns 0.0 for all speeds below 2 km/h', () => {
      runProperty(
        fc.property(
          fc.double({ min: 0, max: 1.999, noNaN: true, noDefaultInfinity: true }),
          (speedKmh) => {
            expect(clampSpeed(speedKmh)).toBe(0.0)
          }
        )
      )
    })

    it('returns the original value for all speeds >= 2 km/h', () => {
      runProperty(
        fc.property(
          fc.double({ min: 2, max: 400, noNaN: true, noDefaultInfinity: true }),
          (speedKmh) => {
            expect(clampSpeed(speedKmh)).toBe(speedKmh)
          }
        )
      )
    })

    it('clampSpeed(2) === 2 (boundary value is not clamped)', () => {
      expect(clampSpeed(2)).toBe(2)
    })

    it('clampSpeed result is always non-negative', () => {
      runProperty(
        fc.property(
          fc.double({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true }),
          (speedKmh) => {
            expect(clampSpeed(speedKmh)).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })
  })

  describe('calculateSpeedKmh fallback calculation', () => {
    it('produces non-negative speed for any valid position pair with positive time delta', () => {
      runProperty(
        fc.property(
          arbValidatedPosition,
          arbValidatedPosition,
          (prev, curr) => {
            // Ensure curr timestamp is after prev timestamp
            const adjustedCurr = {
              latitude: curr.latitude,
              longitude: curr.longitude,
              timestamp: prev.timestamp + Math.abs(curr.timestamp - prev.timestamp) + 1,
            }
            const speed = calculateSpeedKmh(prev, adjustedCurr)
            expect(speed).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })

    it('returns 0 when time delta is zero or negative', () => {
      runProperty(
        fc.property(
          arbValidatedPosition,
          fc.integer({ min: -10000, max: 0 }),
          (prev, negativeDelta) => {
            const curr = {
              latitude: prev.latitude + 0.01,
              longitude: prev.longitude + 0.01,
              timestamp: prev.timestamp + negativeDelta,
            }
            const speed = calculateSpeedKmh(prev, curr)
            expect(speed).toBe(0)
          }
        )
      )
    })

    it('returns 0 when positions are identical', () => {
      runProperty(
        fc.property(
          arbValidatedPosition,
          fc.integer({ min: 1, max: 10000 }),
          (prev, timeDelta) => {
            const curr = {
              latitude: prev.latitude,
              longitude: prev.longitude,
              timestamp: prev.timestamp + timeDelta,
            }
            const speed = calculateSpeedKmh(prev, curr)
            expect(speed).toBe(0)
          }
        )
      )
    })
  })

  describe('Combined pipeline: conversion + clamping', () => {
    it('speeds below 2/3.6 m/s result in 0.0 after conversion and clamping', () => {
      const thresholdMs = 2 / 3.6 // ~0.5556 m/s

      runProperty(
        fc.property(
          fc.double({ min: 0, max: thresholdMs - 0.001, noNaN: true, noDefaultInfinity: true }),
          (speedMs) => {
            const converted = convertSpeedToKmh(speedMs)
            const clamped = clampSpeed(converted)
            expect(clamped).toBe(0.0)
          }
        )
      )
    })

    it('speeds at or above 2/3.6 m/s produce a positive value after conversion and clamping', () => {
      const thresholdMs = 2 / 3.6 // ~0.5556 m/s

      runProperty(
        fc.property(
          fc.double({ min: thresholdMs, max: 111.12, noNaN: true, noDefaultInfinity: true }),
          (speedMs) => {
            const converted = convertSpeedToKmh(speedMs)
            const clamped = clampSpeed(converted)
            expect(clamped).toBeGreaterThanOrEqual(2)
          }
        )
      )
    })
  })
})
