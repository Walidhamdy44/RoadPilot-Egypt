/**
 * IndexedDB storage quota checking utilities for the RoadPilot Egypt dashboard.
 * These functions interact with the browser's StorageManager API.
 */

/**
 * Storage quota information returned by getStorageQuota.
 */
export interface StorageQuotaInfo {
  /** Bytes currently used */
  used: number;
  /** Total bytes available (quota) */
  total: number;
  /** Percentage of quota used (0 to 100) */
  percentage: number;
}

/**
 * Retrieves the current storage quota usage from the StorageManager API.
 * Returns zeros if the StorageManager API is unavailable.
 *
 * @returns Promise resolving to storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    !navigator.storage.estimate
  ) {
    return { used: 0, total: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const total = estimate.quota ?? 0;

  const percentage = total > 0 ? (used / total) * 100 : 0;

  return {
    used,
    total,
    percentage,
  };
}

/**
 * Checks whether the storage usage has exceeded a given threshold percentage.
 * Used to determine when to show storage warnings to the user (Requirement 12.4).
 *
 * @param threshold - Percentage threshold (0-100, default 80)
 * @returns Promise resolving to true if usage exceeds the threshold
 */
export async function isQuotaExceeded(threshold: number = 80): Promise<boolean> {
  const { percentage } = await getStorageQuota();
  return percentage >= threshold;
}

/** Type for the getStorageQuota function */
export type GetStorageQuotaFn = typeof getStorageQuota;

/** Type for the isQuotaExceeded function */
export type IsQuotaExceededFn = typeof isQuotaExceeded;
