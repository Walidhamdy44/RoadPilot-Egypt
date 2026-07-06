'use client';

/**
 * GPS Permission Prompt component for RoadPilot Egypt.
 *
 * Shown conditionally when a user tries to start a trip but GPS
 * permission hasn't been granted. Guides the user through enabling
 * location access with clear explanations and accessible design.
 *
 * States:
 * - prompt: Explains why GPS is needed, offers "Enable Location" button
 * - requesting: Shows loading state while browser permission dialog is open
 * - denied: Shows helpful instructions for enabling GPS in device/browser settings
 *
 * Uses 'use client', accessible design, 44px minimum touch targets.
 *
 * **Validates: Requirements 1.1, 22.3**
 */

import { useState, useCallback } from 'react';

export type GPSPermissionPromptState = 'prompt' | 'requesting' | 'denied';

interface GPSPermissionPromptProps {
  /** Called when the user successfully grants GPS permission */
  onPermissionGranted: () => void;
  /** Called when the user dismisses the prompt without granting permission */
  onDismiss: () => void;
}

export function GPSPermissionPrompt({
  onPermissionGranted,
  onDismiss,
}: GPSPermissionPromptProps) {
  const [state, setState] = useState<GPSPermissionPromptState>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState('denied');
      setErrorMessage(
        'Your browser does not support GPS location. Please use a modern mobile browser.'
      );
      return;
    }

    setState('requesting');

    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted successfully
        setState('prompt');
        onPermissionGranted();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState('denied');
          setErrorMessage(
            'Location permission was denied. You need to enable it in your browser or device settings.'
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          // Permission was granted but position is unavailable (GPS off, etc.)
          setState('denied');
          setErrorMessage(
            'GPS is not available on your device. Please enable location services in your device settings.'
          );
        } else {
          // Timeout — permission may have been granted but GPS took too long
          setState('prompt');
          onPermissionGranted();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [onPermissionGranted]);

  const handleRetry = useCallback(() => {
    setState('prompt');
    setErrorMessage(null);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-prompt-title"
      aria-describedby="gps-prompt-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-[360px] rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
        {state === 'requesting' && <RequestingState />}
        {state === 'prompt' && (
          <PromptState
            onRequestPermission={handleRequestPermission}
            onDismiss={onDismiss}
          />
        )}
        {state === 'denied' && (
          <DeniedState
            errorMessage={errorMessage}
            onRetry={handleRetry}
            onDismiss={onDismiss}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Prompt State ──────────────────────────────────────────── */

function PromptState({
  onRequestPermission,
  onDismiss,
}: {
  onRequestPermission: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
        <LocationPinIcon className="h-8 w-8 text-blue-400" />
      </div>

      {/* Title + Description */}
      <div className="space-y-2">
        <h2
          id="gps-prompt-title"
          className="text-lg font-semibold text-zinc-100"
        >
          Enable Location Access
        </h2>
        <p
          id="gps-prompt-description"
          className="text-sm text-zinc-400 leading-relaxed"
        >
          RoadPilot needs your GPS location to track speed, distance, and trip
          analytics in real time. Your data stays on your device.
        </p>
      </div>

      {/* Enable Location Button — 44px min touch target */}
      <button
        type="button"
        onClick={onRequestPermission}
        className="inline-flex min-h-[44px] min-w-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
      >
        <LocationPinIcon className="h-4 w-4" />
        Enable Location
      </button>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
      >
        Not Now
      </button>

      {/* Privacy note */}
      <p className="text-xs text-zinc-600">
        Location data is processed locally and never shared without your
        consent.
      </p>
    </div>
  );
}

/* ─── Requesting State ──────────────────────────────────────── */

function RequestingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
      <p className="text-sm text-zinc-300">
        Waiting for location permission…
      </p>
      <p className="text-xs text-zinc-500">
        Please allow location access in the browser dialog.
      </p>
    </div>
  );
}

/* ─── Denied State ──────────────────────────────────────────── */

function DeniedState({
  errorMessage,
  onRetry,
  onDismiss,
}: {
  errorMessage: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Error icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
        <LocationOffIcon className="h-8 w-8 text-red-400" />
      </div>

      {/* Title + Error Message */}
      <div className="space-y-2">
        <h2
          id="gps-prompt-title"
          className="text-lg font-semibold text-zinc-100"
        >
          Location Access Denied
        </h2>
        {errorMessage && (
          <p
            id="gps-prompt-description"
            role="alert"
            className="text-sm text-zinc-400 leading-relaxed"
          >
            {errorMessage}
          </p>
        )}
      </div>

      {/* Settings instructions */}
      <div className="w-full rounded-xl bg-zinc-800/70 border border-zinc-700/50 p-4 text-left">
        <p className="text-xs font-medium text-zinc-300 mb-2.5">
          How to enable location:
        </p>

        <div className="space-y-3">
          {/* Android/Chrome instructions */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">
              Chrome (Android):
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-zinc-500">
              <li>Tap the lock icon in the address bar</li>
              <li>Tap &ldquo;Permissions&rdquo;</li>
              <li>Enable &ldquo;Location&rdquo;</li>
            </ol>
          </div>

          {/* iOS/Safari instructions */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">
              Safari (iOS):
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-zinc-500">
              <li>Open Settings → Safari → Location</li>
              <li>Set to &ldquo;Ask&rdquo; or &ldquo;Allow&rdquo;</li>
              <li>Return and refresh this page</li>
            </ol>
          </div>

          {/* Device-level */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">
              Device Settings:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-zinc-500">
              <li>Open device Settings → Location</li>
              <li>Ensure Location Services are turned on</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] min-w-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function LocationOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18"
      />
    </svg>
  );
}
