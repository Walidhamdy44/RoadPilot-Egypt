'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/features/pwa/infrastructure/service-worker';

/**
 * Client component that registers the Service Worker on mount.
 * Renders nothing — purely a side-effect component.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Only register in production to avoid caching issues during development
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }
  }, []);

  return null;
}
