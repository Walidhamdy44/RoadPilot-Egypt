'use client';

/**
 * IOSInstallGuide Component
 *
 * Shows an instructional overlay for iOS Safari users explaining
 * how to manually add the app to their home screen.
 *
 * Features:
 * - Step-by-step: "Tap Share → Add to Home Screen"
 * - Dismissable with 7-day cooldown (shares cooldown key with install banner)
 * - Only shown on iOS devices that are NOT in standalone mode
 * - Dark-mode-first design
 * - 44px minimum touch targets
 *
 * Requirements: 16.5
 */

import { useCallback, useEffect, useState } from 'react';
import {
  isBannerSuppressed,
  isIOSDevice,
  recordDismissal,
} from '@/features/pwa/domain/install-prompt';

export function IOSInstallGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS when not suppressed
    if (isIOSDevice() && !isBannerSuppressed()) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    recordDismissal();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add to Home Screen instructions"
    >
      <div className="mb-4 mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-5 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            Install RoadPilot Egypt
          </h2>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            aria-label="Close install guide"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="mt-2 text-sm text-zinc-400">
          Add this app to your home screen for a full-screen experience.
        </p>

        <div className="mt-4 space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200"
              aria-hidden="true"
            >
              1
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-zinc-200">
                Tap the{' '}
                <strong className="text-zinc-100">Share</strong>{' '}
                button
              </span>
              {/* iOS Share icon */}
              <ShareIcon />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200"
              aria-hidden="true"
            >
              2
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-zinc-200">
                Scroll down and tap{' '}
                <strong className="text-zinc-100">Add to Home Screen</strong>
              </span>
              {/* Plus icon */}
              <PlusSquareIcon />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200"
              aria-hidden="true"
            >
              3
            </div>
            <span className="pt-1 text-sm text-zinc-200">
              Tap{' '}
              <strong className="text-zinc-100">Add</strong>{' '}
              in the top-right corner
            </span>
          </div>
        </div>

        {/* Arrow pointing to Safari share button position */}
        <div className="mt-4 flex justify-center" aria-hidden="true">
          <svg
            className="h-6 w-6 animate-bounce text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
            />
          </svg>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full rounded-lg bg-zinc-700/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 active:bg-zinc-600 min-h-[44px]"
          aria-label="Dismiss install guide"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

/** iOS-style share icon (square with arrow up) */
function ShareIcon() {
  return (
    <svg
      className="h-5 w-5 text-blue-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-label="Share icon"
      role="img"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3v11.25"
      />
    </svg>
  );
}

/** Plus-in-square icon representing "Add to Home Screen" */
function PlusSquareIcon() {
  return (
    <svg
      className="h-5 w-5 text-blue-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-label="Add to Home Screen icon"
      role="img"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}
