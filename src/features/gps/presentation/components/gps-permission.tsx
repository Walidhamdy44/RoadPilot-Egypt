'use client';

/**
 * GPS Permission component for RoadPilot Egypt.
 *
 * Checks GPS permission status and shows appropriate UI:
 * - If permission not yet requested: shows "Enable GPS" button with explanation
 * - If permission denied: shows instructions to enable in browser settings
 * - If permission granted: renders nothing (children pass through)
 *
 * **Validates: Requirements 1.1, 22.3**
 */

import { useEffect, useState, useCallback } from 'react';

type PermissionStatus = 'loading' | 'prompt' | 'granted' | 'denied';

interface GPSPermissionProps {
  children: React.ReactNode;
}

export function GPSPermission({ children }: GPSPermissionProps) {
  const [status, setStatus] = useState<PermissionStatus>('loading');

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    // Check if Geolocation API is available
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }

    // Use Permissions API if available for non-intrusive check
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setStatus(result.state as PermissionStatus);

        // Listen for permission changes
        result.addEventListener('change', () => {
          setStatus(result.state as PermissionStatus);
        });
        return;
      } catch {
        // Permissions API may not support geolocation query on all browsers
      }
    }

    // Fallback: assume prompt state if we can't determine
    setStatus('prompt');
  }

  const handleRequestPermission = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus('granted');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          // Position unavailable or timeout — permission was granted but GPS failed
          setStatus('granted');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
      </div>
    );
  }

  // Permission granted — render children
  if (status === 'granted') {
    return <>{children}</>;
  }

  // Permission prompt — show enable button
  if (status === 'prompt') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
          <LocationIcon className="h-10 w-10 text-blue-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-100">
            Enable GPS Location
          </h2>
          <p className="text-sm text-zinc-400 max-w-[280px]">
            RoadPilot needs access to your GPS to track speed, distance, and provide real-time driving analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRequestPermission}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LocationIcon className="h-4 w-4" />
          Enable GPS
        </button>

        <p className="text-xs text-zinc-500">
          Your location data stays on your device and is never shared without your consent.
        </p>
      </div>
    );
  }

  // Permission denied — show instructions
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
        <LocationOffIcon className="h-10 w-10 text-red-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-100">
          GPS Access Required
        </h2>
        <p className="text-sm text-zinc-400 max-w-[280px]">
          Location permission was denied. RoadPilot cannot function without GPS access.
        </p>
      </div>

      <div className="rounded-xl bg-zinc-800/60 p-4 text-left max-w-[320px]">
        <p className="text-xs font-medium text-zinc-300 mb-2">
          To enable GPS:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400">
          <li>Open your browser settings</li>
          <li>Navigate to Site Settings or Permissions</li>
          <li>Find Location permission for this site</li>
          <li>Change to &ldquo;Allow&rdquo;</li>
          <li>Refresh this page</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl bg-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Refresh Page
      </button>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function LocationIcon({ className }: { className?: string }) {
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
