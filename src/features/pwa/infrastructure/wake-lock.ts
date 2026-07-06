/**
 * Screen Wake Lock infrastructure layer.
 *
 * Provides low-level access to the Screen Wake Lock API for preventing
 * the device screen from turning off during active trips.
 *
 * **Validates: Requirements 16.6, 16.7**
 */

/**
 * Check if the Screen Wake Lock API is supported by the current browser.
 */
export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

/**
 * Request a screen wake lock to prevent the display from turning off.
 *
 * Returns the WakeLockSentinel on success, or an error description on failure.
 */
export async function requestWakeLock(): Promise<{
  success: boolean;
  wakeLock?: WakeLockSentinel;
  error?: string;
}> {
  if (!isWakeLockSupported()) {
    return {
      success: false,
      error: 'Screen Wake Lock API is not supported by this browser.',
    };
  }

  try {
    const sentinel = await navigator.wakeLock.request('screen');
    return { success: true, wakeLock: sentinel };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Wake lock request denied.';
    return { success: false, error: message };
  }
}

/**
 * Release an active wake lock sentinel.
 */
export async function releaseWakeLock(
  sentinel: WakeLockSentinel
): Promise<void> {
  try {
    await sentinel.release();
  } catch {
    // Sentinel may already be released (e.g., page was hidden).
  }
}
