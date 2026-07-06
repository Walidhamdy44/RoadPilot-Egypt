'use client';

/**
 * Wrapper component that disables child content and displays an
 * "Unavailable offline" label when the device is offline and the
 * wrapped feature requires network access.
 *
 * Usage:
 * ```tsx
 * <FeatureUnavailable requiresNetwork>
 *   <SyncButton />
 * </FeatureUnavailable>
 * ```
 *
 * When online or when `requiresNetwork` is false, children render normally.
 * When offline and `requiresNetwork` is true, children are grayed out with
 * pointer events disabled and an overlay label is shown.
 *
 * Dark-mode-first design.
 *
 * **Validates: Requirements 15.6**
 */

import { useSyncStore } from '@/features/sync/presentation/hooks/use-sync-store';
import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

interface FeatureUnavailableProps {
  /** Content to render */
  children: ReactNode;
  /** Whether this feature requires network to function */
  requiresNetwork?: boolean;
}

export function FeatureUnavailable({
  children,
  requiresNetwork = false,
}: FeatureUnavailableProps) {
  const isOnline = useSyncStore((s) => s.isOnline);

  const isDisabled = requiresNetwork && !isOnline;

  if (!isDisabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative" aria-disabled="true">
      {/* Grayed-out children with no interaction */}
      <div className="pointer-events-none select-none opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Overlay label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-700">
          <WifiOff className="h-3 w-3" aria-hidden="true" />
          Unavailable offline
        </span>
      </div>
    </div>
  );
}
