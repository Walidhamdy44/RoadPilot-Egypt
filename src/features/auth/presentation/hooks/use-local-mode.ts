"use client";

/**
 * Hook for managing local-only mode in RoadPilot Egypt.
 *
 * Provides:
 * - Whether the app is in local-only mode (no active session)
 * - A function to associate local trips with a user after authentication
 * - Session expiration detection that preserves local data
 *
 * The dashboard is fully usable in local-only mode. Authentication
 * only unlocks sync to server.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/presentation/hooks/use-auth";
import { associateTripsWithUser } from "@/features/auth/domain/trip-association";
import { isLocalOnlyMode, isSessionExpired } from "@/features/auth/domain/local-mode";

export interface UseLocalModeReturn {
  /** Whether the app is in local-only mode (no active session) */
  isLocalOnly: boolean;
  /** Whether the session check is still loading */
  isPending: boolean;
  /** Whether the session has expired (was authenticated, now isn't) */
  sessionExpired: boolean;
  /** Associate all local trips with the current user and queue for sync */
  associateLocalTrips: () => Promise<number>;
}

export function useLocalMode(): UseLocalModeReturn {
  const { isAuthenticated, isPending, user } = useAuth();
  const router = useRouter();
  const hadSessionRef = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hasAssociatedRef = useRef(false);

  // Track whether user was previously authenticated
  useEffect(() => {
    if (isAuthenticated) {
      hadSessionRef.current = true;
      setSessionExpired(false);
    }
  }, [isAuthenticated]);

  // Detect session expiration
  useEffect(() => {
    if (isSessionExpired(isPending, isAuthenticated, hadSessionRef.current)) {
      setSessionExpired(true);
      // Redirect to login but local data is preserved in IndexedDB
      router.push("/login");
    }
  }, [isPending, isAuthenticated, router]);

  // Auto-associate trips when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.id && !hasAssociatedRef.current) {
      hasAssociatedRef.current = true;
      associateTripsWithUser(user.id).catch(() => {
        // Silent fail — trips remain local, can be retried
        hasAssociatedRef.current = false;
      });
    }
  }, [isAuthenticated, user?.id]);

  const associateLocalTrips = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;
    return associateTripsWithUser(user.id);
  }, [user?.id]);

  return {
    isLocalOnly: isLocalOnlyMode(isAuthenticated),
    isPending,
    sessionExpired,
    associateLocalTrips,
  };
}
