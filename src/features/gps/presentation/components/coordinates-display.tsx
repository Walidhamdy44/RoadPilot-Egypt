'use client';

/**
 * Coordinates display component with tap-to-copy functionality.
 *
 * Features:
 * - Displays lat/lng in decimal degrees with 6 decimal places
 * - Tap-to-copy using Clipboard API with "latitude, longitude" format
 * - 2-second confirmation indicator after successful copy
 * - Falls back to selectable text field if Clipboard API unavailable
 * - Shows stale indicator when GPS fix fails
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import { formatCoordinates, formatLatitude, formatLongitude } from '@/shared/utils/format';

type CopyState = 'idle' | 'copied' | 'error';

export function CoordinatesDisplay() {
  const position = useGPSStore((s) => s.position);
  const lastValidPosition = useGPSStore((s) => s.lastValidPosition);
  const signalStatus = useGPSStore((s) => s.signalStatus);

  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [clipboardAvailable, setClipboardAvailable] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine which position to display
  const displayPosition = position ?? lastValidPosition;
  const isStale = signalStatus === 'lost' && !position && !!lastValidPosition;

  // Check Clipboard API availability on mount
  useEffect(() => {
    const available =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function';
    setClipboardAvailable(available);
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!displayPosition) return;

    const text = formatCoordinates(displayPosition.latitude, displayPosition.longitude);

    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('error');
      setClipboardAvailable(false);
    }

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Reset state after 2 seconds
    timerRef.current = setTimeout(() => {
      setCopyState('idle');
    }, 2000);
  }, [displayPosition]);

  // No position data at all
  if (!displayPosition) {
    return (
      <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <CoordinatesIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Acquiring coordinates…</span>
        </div>
      </div>
    );
  }

  const formattedLat = formatLatitude(displayPosition.latitude);
  const formattedLng = formatLongitude(displayPosition.longitude);
  const formattedCoords = formatCoordinates(displayPosition.latitude, displayPosition.longitude);

  // Fallback: selectable text field when Clipboard API unavailable
  if (!clipboardAvailable) {
    return (
      <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <CoordinatesIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Coordinates
          </span>
          {isStale && <StaleIndicator />}
          {copyState === 'error' && <ErrorIndicator />}
        </div>
        <input
          type="text"
          readOnly
          value={formattedCoords}
          aria-label="GPS coordinates"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground select-all focus:outline-none focus:ring-2 focus:ring-ring"
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy coordinates to clipboard"
      className="w-full rounded-lg border border-border bg-card/60 px-4 py-3 text-left transition-colors hover:bg-card/80 active:bg-card focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CoordinatesIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Coordinates
          </span>
          {isStale && <StaleIndicator />}
        </div>
        <CopyStateIndicator state={copyState} />
      </div>

      <div className="mt-1.5 font-mono text-sm text-foreground">
        <span aria-label="Latitude">{formattedLat}</span>
        <span className="text-muted-foreground">,&nbsp;</span>
        <span aria-label="Longitude">{formattedLng}</span>
      </div>
    </button>
  );
}

/** Visual indicator for the copy state */
function CopyStateIndicator({ state }: { state: CopyState }) {
  if (state === 'copied') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400" role="status">
        <CheckIcon className="h-3.5 w-3.5" />
        Copied
      </span>
    );
  }

  if (state === 'error') {
    return <ErrorIndicator />;
  }

  // Idle: show tap-to-copy hint
  return (
    <span className="text-xs text-muted-foreground">
      <CopyIcon className="h-3.5 w-3.5 inline-block" />
    </span>
  );
}

/** Stale data indicator shown when GPS fix is lost */
function StaleIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400"
      role="status"
      aria-label="Stale coordinates"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
      Stale
    </span>
  );
}

/** Error indicator for failed copy operations */
function ErrorIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
      role="alert"
    >
      <AlertIcon className="h-3.5 w-3.5" />
      Copy failed
    </span>
  );
}

/** Coordinates/location pin icon */
function CoordinatesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

/** Checkmark icon for successful copy */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Copy/clipboard icon */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

/** Alert/warning icon */
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
