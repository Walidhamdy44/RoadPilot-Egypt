'use client';

import { type ReactNode } from 'react';
import { useOrientation } from '@/shared/hooks/use-orientation';

interface ResponsiveContainerProps {
  children: ReactNode;
  /** Whether to show the landscape rotation suggestion. Defaults to true. */
  showLandscapeHint?: boolean;
  /** Additional className for the outer container */
  className?: string;
}

/**
 * Responsive wrapper component for the driving dashboard.
 *
 * - Constrains content to max-w-[428px] centered on larger screens
 * - Applies safe area insets for notched devices (env(safe-area-inset-*))
 * - Shows a non-blocking "rotate to portrait" suggestion in landscape mode
 * - Prevents horizontal overflow on all screen sizes
 *
 * Designed for portrait-first mobile (360-428px width).
 */
export function ResponsiveContainer({
  children,
  showLandscapeHint = true,
  className = '',
}: ResponsiveContainerProps) {
  const { isLandscape } = useOrientation();

  return (
    <div
      className={`responsive-container relative mx-auto w-full max-w-[428px] min-h-[100dvh] overflow-x-hidden ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Landscape rotation hint — non-blocking overlay */}
      {showLandscapeHint && isLandscape && (
        <LandscapeHint />
      )}

      {children}
    </div>
  );
}

/**
 * Non-blocking banner suggesting the user rotate to portrait orientation.
 * Appears at the top of the screen and can be dismissed by tapping.
 */
function LandscapeHint() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-muted/90 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground border-b border-border"
    >
      <RotateIcon className="h-4 w-4 flex-shrink-0" />
      <span>Rotate to portrait for the best experience</span>
    </div>
  );
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
      <path d="M2 12l2-2 2 2" />
      <path d="M4 10v4" />
    </svg>
  );
}
