/**
 * Service Worker Registration
 *
 * Registers the service worker from /sw.js and handles
 * registration lifecycle events (update available, controller change).
 */

export interface SWRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: string;
}

/**
 * Register the service worker.
 * Call this from a client component or script in the root layout.
 */
export async function registerServiceWorker(): Promise<SWRegistrationResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser environment' };
  }

  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service Worker not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates on registration
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'activated' &&
          navigator.serviceWorker.controller
        ) {
          // New service worker activated — optionally notify user
          console.log('[SW] New service worker activated');
        }
      });
    });

    // Handle controller change (e.g., new SW took over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed');
    });

    console.log('[SW] Service Worker registered successfully');
    return { success: true, registration };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown registration error';
    console.error('[SW] Registration failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Unregister all service workers (useful for development/testing).
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}
