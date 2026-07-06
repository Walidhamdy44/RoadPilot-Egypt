'use client';

/**
 * Root providers wrapper for RoadPilot Egypt.
 *
 * Combines all client-side providers into a single component
 * to keep the root layout clean and server-renderable.
 *
 * Provider hierarchy:
 * - QueryProvider (TanStack Query for server state)
 * - ToastProvider (in-app notifications)
 * - ConnectivityBridge (wires navigator online/offline → sync store)
 */

import { QueryProvider } from '@/shared/providers/query-provider';
import { ToastProvider } from '@/shared/ui/toast';
import { ConnectivityBridge } from '@/features/sync/presentation/components/connectivity-bridge';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ConnectivityBridge />
        {children}
      </ToastProvider>
    </QueryProvider>
  );
}
