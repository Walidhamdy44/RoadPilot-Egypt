/**
 * Unit tests for rate limiting utility.
 *
 * Tests the sliding window rate limiter for both authenticated
 * and unauthenticated clients.
 *
 * **Validates: Requirements 23.3, 23.4**
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimitStore,
  getRateLimitConfig,
} from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("authenticated users (100 requests/minute)", () => {
    it("should allow up to 100 requests within one minute", () => {
      const userId = "user-123";

      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(userId, true);
        expect(result.success).toBe(true);
        expect(result.limit).toBe(100);
        expect(result.remaining).toBe(99 - i);
      }
    });

    it("should reject the 101st request within one minute", () => {
      const userId = "user-456";

      for (let i = 0; i < 100; i++) {
        checkRateLimit(userId, true);
      }

      const result = checkRateLimit(userId, true);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.reset).toBeGreaterThan(0);
    });

    it("should allow requests again after the window expires", () => {
      const userId = "user-789";

      for (let i = 0; i < 100; i++) {
        checkRateLimit(userId, true);
      }

      // Advance time past the 1-minute window
      vi.advanceTimersByTime(61_000);

      const result = checkRateLimit(userId, true);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("should use a sliding window (partial expiry)", () => {
      const userId = "user-sliding";

      // Make 50 requests at time 0
      for (let i = 0; i < 50; i++) {
        checkRateLimit(userId, true);
      }

      // Advance 30 seconds
      vi.advanceTimersByTime(30_000);

      // Make 50 more requests at t=30s
      for (let i = 0; i < 50; i++) {
        checkRateLimit(userId, true);
      }

      // Now at 100 — next should fail
      const blocked = checkRateLimit(userId, true);
      expect(blocked.success).toBe(false);

      // Advance 31 more seconds (total 61s from start) — first 50 expire
      vi.advanceTimersByTime(31_000);

      const allowed = checkRateLimit(userId, true);
      expect(allowed.success).toBe(true);
      expect(allowed.remaining).toBe(49); // 50 from second batch still active, plus this new one = 51 used
    });
  });

  describe("unauthenticated IPs (20 requests/minute)", () => {
    it("should allow up to 20 requests within one minute", () => {
      const ip = "192.168.1.1";

      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit(ip, false);
        expect(result.success).toBe(true);
        expect(result.limit).toBe(20);
        expect(result.remaining).toBe(19 - i);
      }
    });

    it("should reject the 21st request within one minute", () => {
      const ip = "10.0.0.1";

      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip, false);
      }

      const result = checkRateLimit(ip, false);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.reset).toBeGreaterThan(0);
    });

    it("should allow requests again after the window expires", () => {
      const ip = "172.16.0.1";

      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip, false);
      }

      vi.advanceTimersByTime(61_000);

      const result = checkRateLimit(ip, false);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(19);
    });
  });

  describe("isolation between identifiers", () => {
    it("should track limits independently per user", () => {
      const user1 = "user-a";
      const user2 = "user-b";

      // Exhaust user1's limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(user1, true);
      }

      // user2 should still be allowed
      const result = checkRateLimit(user2, true);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("should track limits independently per IP", () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip1, false);
      }

      const result = checkRateLimit(ip2, false);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(19);
    });
  });

  describe("Retry-After header value (reset)", () => {
    it("should return reset in seconds when rate limited", () => {
      const userId = "user-retry";

      for (let i = 0; i < 100; i++) {
        checkRateLimit(userId, true);
      }

      const result = checkRateLimit(userId, true);
      expect(result.success).toBe(false);
      // Reset should be between 1 and 60 seconds
      expect(result.reset).toBeGreaterThanOrEqual(1);
      expect(result.reset).toBeLessThanOrEqual(60);
    });

    it("should return decreasing reset time as window moves forward", () => {
      const userId = "user-decreasing";

      // Fill the limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(userId, true);
      }

      const result1 = checkRateLimit(userId, true);
      expect(result1.success).toBe(false);

      // Advance 30 seconds
      vi.advanceTimersByTime(30_000);

      const result2 = checkRateLimit(userId, true);
      expect(result2.success).toBe(false);
      // Reset should be smaller now (about 30s less)
      expect(result2.reset).toBeLessThan(result1.reset);
    });
  });

  describe("configuration", () => {
    it("should expose correct rate limit configuration", () => {
      const config = getRateLimitConfig();
      expect(config.windowMs).toBe(60_000);
      expect(config.authenticatedLimit).toBe(100);
      expect(config.unauthenticatedLimit).toBe(20);
    });
  });
});
