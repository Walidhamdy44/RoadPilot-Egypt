'use client';

/**
 * useInstallPrompt Hook
 *
 * Captures the `beforeinstallprompt` event for Android/Chrome install flow.
 * Tracks banner dismissal with a 7-day cooldown in localStorage.
 * Detects iOS devices for the manual "Add to Home Screen" guide.
 *
 * Returns:
 * - canInstall: whether the native install prompt is available (Android/Chrome)
 * - promptInstall: triggers the native install flow
 * - dismiss: records dismissal and hides the banner for 7 days
 * - isIOS: whether the user is on an iOS device (for iOS guide)
 *
 * Requirements: 16.2, 16.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isBannerSuppressed,
  isIOSDevice,
  recordDismissal,
} from '@/features/pwa/domain/install-prompt';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UseInstallPromptReturn {
  /** True when the native install prompt is available and banner is not suppressed */
  canInstall: boolean;
  /** Trigger the native browser install prompt */
  promptInstall: () => Promise<void>;
  /** Dismiss the banner (suppresses for 7 days) */
  dismiss: () => void;
  /** True if the device is iOS (show manual install guide) */
  isIOS: boolean;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS on mount
    setIsIOS(isIOSDevice());

    // If the banner is suppressed, don't listen for beforeinstallprompt
    if (isBannerSuppressed()) return;

    function handleBeforeInstallPrompt(event: Event) {
      // Prevent the default mini-infobar
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setCanInstall(false);
      deferredPromptRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    recordDismissal();
    setCanInstall(false);
    deferredPromptRef.current = null;
  }, []);

  return { canInstall, promptInstall, dismiss, isIOS };
}
