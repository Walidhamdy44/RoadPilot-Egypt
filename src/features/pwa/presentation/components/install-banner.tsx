'use client';

/**
 * InstallBanner Component
 *
 * Displays a custom install banner when the `beforeinstallprompt` event fires
 * (Android/Chrome). Prompts the user to install RoadPilot Egypt as a PWA.
 *
 * Features:
 * - "Install RoadPilot Egypt" prompt with Install and Dismiss buttons
 * - 44px minimum touch targets for accessibility
 * - 7-day cooldown after dismissal
 * - Dark-mode-first design with gradient background
 *
 * Requirements: 16.2, 16.5
 */

import { useInstallPrompt } from '@/features/pwa/presentation/hooks/use-install-prompt';

export function InstallBanner() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 shadow-2xl shadow-black/40"
      role="alert"
      aria-label="Install application prompt"
    >
      <div className="flex items-center gap-3">
        {/* App icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700"
          aria-hidden="true"
        >
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            Install RoadPilot Egypt
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Add to home screen for the best experience
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={promptInstall}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 min-h-[44px]"
          aria-label="Install RoadPilot Egypt app"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex-1 rounded-lg bg-zinc-700/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 active:bg-zinc-600 min-h-[44px]"
          aria-label="Dismiss install prompt"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
