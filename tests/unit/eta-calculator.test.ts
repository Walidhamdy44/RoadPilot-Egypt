import { describe, it, expect, beforeEach } from 'vitest';
import { createETACalculator, ETACalculator } from '@/features/trip/domain/eta-calculator';

describe('ETACalculator', () => {
  let calculator: ETACalculator;

  beforeEach(() => {
    calculator = createETACalculator();
  });

  describe('calculate', () => {
    it('returns null when average speed is below 5 km/h', () => {
      const now = Date.now();
      expect(calculator.calculate(100, 4.9, now)).toBeNull();
      expect(calculator.calculate(100, 0, now)).toBeNull();
      expect(calculator.calculate(100, -1, now)).toBeNull();
    });

    it('returns null when remaining distance is zero or negative', () => {
      const now = Date.now();
      expect(calculator.calculate(0, 60, now)).toBeNull();
      expect(calculator.calculate(-5, 60, now)).toBeNull();
    });

    it('calculates ETA as currentTime + (remainingKm / avgSpeedKmh) in ms', () => {
      const now = 1_700_000_000_000; // fixed timestamp
      // 100 km at 100 km/h = 1 hour = 3_600_000 ms
      const eta = calculator.calculate(100, 100, now);
      expect(eta).toBe(now + 3_600_000);
    });

    it('calculates ETA correctly for fractional speeds', () => {
      const now = 1_700_000_000_000;
      // 50 km at 25 km/h = 2 hours = 7_200_000 ms
      const eta = calculator.calculate(50, 25, now);
      expect(eta).toBe(now + 7_200_000);
    });

    it('calculates ETA for short distances', () => {
      const now = 1_700_000_000_000;
      // 5 km at 60 km/h = 5 minutes = 300_000 ms
      const eta = calculator.calculate(5, 60, now);
      expect(eta).toBe(now + 300_000);
    });

    it('throttles recalculation to max once every 30 seconds', () => {
      const now = 1_700_000_000_000;
      // First calculation
      const eta1 = calculator.calculate(100, 100, now);
      expect(eta1).toBe(now + 3_600_000);

      // Within 30 seconds - should return cached result even with different inputs
      const eta2 = calculator.calculate(200, 50, now + 15_000);
      expect(eta2).toBe(eta1); // Still the cached value

      // After 30 seconds - should recalculate
      const eta3 = calculator.calculate(200, 50, now + 30_000);
      // 200 km at 50 km/h = 4 hours = 14_400_000 ms
      expect(eta3).toBe(now + 30_000 + 14_400_000);
    });

    it('allows recalculation after exactly 30 seconds', () => {
      const now = 1_700_000_000_000;
      calculator.calculate(100, 100, now);

      // Exactly at 30s boundary - should recalculate
      const eta = calculator.calculate(50, 100, now + 30_000);
      expect(eta).toBe(now + 30_000 + 1_800_000); // 50km/100kmh = 0.5h = 1_800_000ms
    });

    it('resets throttle when speed drops below threshold', () => {
      const now = 1_700_000_000_000;
      // First calc at valid speed
      calculator.calculate(100, 100, now);

      // Speed drops below 5 - returns null, updates timestamp
      const result = calculator.calculate(100, 3, now + 10_000);
      expect(result).toBeNull();

      // Speed returns above threshold within 30s of the null calc
      // Should still be throttled from the null calculation
      const eta = calculator.calculate(100, 100, now + 20_000);
      // Since last calc returned null and lastCalculatedEta is null, throttle check won't trigger
      // (the throttle only returns cached if lastCalculatedEta is not null)
      expect(eta).toBe(now + 20_000 + 3_600_000);
    });
  });

  describe('updateRouteETA', () => {
    it('prefers route-based ETA when received within 5 minutes', () => {
      const now = 1_700_000_000_000;
      const routeEta = now + 5_000_000; // some future ETA

      calculator.updateRouteETA(routeEta, now);

      // Within 5 minutes of receiving route ETA
      const eta = calculator.calculate(100, 100, now + 60_000);
      expect(eta).toBe(routeEta);
    });

    it('uses route ETA up to just under 5 minutes old', () => {
      const now = 1_700_000_000_000;
      const routeEta = now + 10_000_000;

      calculator.updateRouteETA(routeEta, now);

      // At 4 minutes 59 seconds - still fresh
      const justUnder5Min = now + (5 * 60 * 1000 - 1);
      const eta = calculator.calculate(100, 100, justUnder5Min);
      expect(eta).toBe(routeEta);
    });

    it('falls back to distance/speed when route ETA is older than 5 minutes', () => {
      const now = 1_700_000_000_000;
      const routeEta = now + 10_000_000;

      calculator.updateRouteETA(routeEta, now);

      // At exactly 5 minutes - stale
      const staleTime = now + 5 * 60 * 1000;
      const eta = calculator.calculate(100, 100, staleTime);
      // Falls back to distance/speed: 100/100 = 1h = 3_600_000ms
      expect(eta).toBe(staleTime + 3_600_000);
    });

    it('uses the most recent route ETA update', () => {
      const now = 1_700_000_000_000;
      const routeEta1 = now + 5_000_000;
      const routeEta2 = now + 3_000_000;

      calculator.updateRouteETA(routeEta1, now);
      calculator.updateRouteETA(routeEta2, now + 60_000);

      // Should use the second (most recent) route ETA
      // Need to bypass throttle - use timestamp > 30s from last calc
      const eta = calculator.calculate(100, 100, now + 120_000);
      expect(eta).toBe(routeEta2);
    });

    it('still returns null if speed < 5 even with route ETA available', () => {
      const now = 1_700_000_000_000;
      calculator.updateRouteETA(now + 5_000_000, now);

      const eta = calculator.calculate(100, 4, now + 1000);
      expect(eta).toBeNull();
    });

    it('still returns null if remaining distance is 0 even with route ETA available', () => {
      const now = 1_700_000_000_000;
      calculator.updateRouteETA(now + 5_000_000, now);

      const eta = calculator.calculate(0, 60, now + 1000);
      expect(eta).toBeNull();
    });
  });

  describe('getFormattedETA', () => {
    it('returns null when ETA cannot be computed', () => {
      const now = Date.now();
      expect(calculator.getFormattedETA(100, 4, now)).toBeNull();
      expect(calculator.getFormattedETA(0, 60, now)).toBeNull();
    });

    it('returns HH:MM format for valid ETA', () => {
      // Use a known timestamp: 2024-01-15 10:00:00 UTC
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      // 60 km at 60 km/h = 1 hour → ETA = 11:00
      const formatted = calculator.getFormattedETA(60, 60, now);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it('formats ETA correctly for a specific calculation', () => {
      // Start at midnight local time
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const now = midnight.getTime();

      // 120 km at 60 km/h = 2 hours → ETA = 02:00
      const formatted = calculator.getFormattedETA(120, 60, now);
      expect(formatted).toBe('02:00');
    });

    it('formats ETA with route-based ETA', () => {
      // Route ETA timestamp for 15:30
      const today = new Date();
      today.setHours(15, 30, 0, 0);
      const routeEta = today.getTime();

      const now = new Date();
      now.setHours(14, 0, 0, 0);
      const currentTime = now.getTime();

      calculator.updateRouteETA(routeEta, currentTime);

      const formatted = calculator.getFormattedETA(100, 60, currentTime);
      expect(formatted).toBe('15:30');
    });

    it('returns HH:MM format matching 24-hour clock pattern', () => {
      // Use a timestamp that produces afternoon time
      const afternoon = new Date();
      afternoon.setHours(12, 0, 0, 0);
      const now = afternoon.getTime();

      // 5 hours at 100 km/h from noon → 17:00
      const formatted = calculator.getFormattedETA(500, 100, now);
      expect(formatted).toBe('17:00');
    });
  });

  describe('throttle edge cases', () => {
    it('does not throttle first calculation', () => {
      const now = 1_700_000_000_000;
      const eta = calculator.calculate(100, 50, now);
      // 100/50 = 2h = 7_200_000ms
      expect(eta).toBe(now + 7_200_000);
    });

    it('throttle applies independently for each calculator instance', () => {
      const calc1 = createETACalculator();
      const calc2 = createETACalculator();
      const now = 1_700_000_000_000;

      calc1.calculate(100, 100, now);
      calc2.calculate(200, 100, now);

      // Both throttled independently - different cached values
      const eta1 = calc1.calculate(999, 999, now + 10_000);
      const eta2 = calc2.calculate(999, 999, now + 10_000);

      expect(eta1).toBe(now + 3_600_000); // 100/100 = 1h
      expect(eta2).toBe(now + 7_200_000); // 200/100 = 2h
    });
  });
});
