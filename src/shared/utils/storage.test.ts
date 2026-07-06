import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageQuota, isQuotaExceeded } from './storage';

describe('getStorageQuota', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns zeros when StorageManager is unavailable', async () => {
    // jsdom does not provide navigator.storage by default
    const originalStorage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();
    expect(result).toEqual({ used: 0, total: 0, percentage: 0 });

    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('returns quota info from StorageManager', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 500_000_000,
      quota: 1_000_000_000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();
    expect(result.used).toBe(500_000_000);
    expect(result.total).toBe(1_000_000_000);
    expect(result.percentage).toBe(50);
  });

  it('handles missing usage/quota fields', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({});

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    const result = await getStorageQuota();
    expect(result.used).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
  });
});

describe('isQuotaExceeded', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when usage exceeds default threshold (80%)', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 900_000_000,
      quota: 1_000_000_000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    expect(await isQuotaExceeded()).toBe(true);
  });

  it('returns false when usage is below threshold', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 500_000_000,
      quota: 1_000_000_000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    expect(await isQuotaExceeded()).toBe(false);
  });

  it('supports custom threshold', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 600_000_000,
      quota: 1_000_000_000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    expect(await isQuotaExceeded(50)).toBe(true);
    expect(await isQuotaExceeded(70)).toBe(false);
  });

  it('returns true at exact threshold boundary', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 800_000_000,
      quota: 1_000_000_000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      writable: true,
      configurable: true,
    });

    expect(await isQuotaExceeded(80)).toBe(true);
  });
});
