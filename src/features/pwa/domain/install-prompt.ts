/**
 * PWA Install Prompt Domain Logic
 *
 * Handles the `beforeinstallprompt` event lifecycle and iOS detection.
 * Provides logic for 7-day banner dismissal cooldown stored in localStorage.
 *
 * Requirements: 16.2, 16.5
 */

const DISMISS_KEY = 'roadpilot_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if the install banner should be suppressed because the user
 * dismissed it within the last 7 days.
 */
export function isBannerSuppressed(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;

    const dismissedAt = parseInt(raw, 10);
    if (Number.isNaN(dismissedAt)) return false;

    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Record the dismissal timestamp to localStorage for the 7-day cooldown.
 */
export function recordDismissal(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage full or blocked — ignore
  }
}

/**
 * Detect if the current device is running iOS (iPhone, iPad, iPod).
 * Also checks that the app is NOT already in standalone mode.
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);

  // Check if already installed as a PWA (standalone mode)
  const isStandalone =
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  return isIOS && !isStandalone;
}

/**
 * Detect if the user is on iOS Safari specifically (not Chrome on iOS, etc.)
 * Safari on iOS is the only browser that supports Add to Home Screen natively.
 */
export function isIOSSafari(): boolean {
  if (!isIOSDevice()) return false;

  const ua = navigator.userAgent;
  // Safari on iOS: has "Safari" but not "CriOS" (Chrome), "FxiOS" (Firefox), "OPiOS" (Opera)
  return /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
}
