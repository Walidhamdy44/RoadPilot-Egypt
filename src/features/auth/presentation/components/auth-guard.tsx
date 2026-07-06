"use client";

/**
 * Auth guard component for RoadPilot Egypt.
 *
 * Supports local-only mode: the dashboard is fully usable without login.
 * Authentication only unlocks server sync. When unauthenticated, a subtle
 * "Sign in to sync" banner is shown instead of redirecting to login.
 *
 * For routes that strictly require authentication (e.g. account settings),
 * set `requireAuth` prop to true for traditional redirect behavior.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalMode } from "@/features/auth/presentation/hooks/use-local-mode";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, strictly requires auth and redirects to login. Default: false (local-only allowed) */
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { isLocalOnly, isPending, sessionExpired } = useLocalMode();
  const router = useRouter();

  // Only redirect if strict auth is required
  useEffect(() => {
    if (requireAuth && !isPending && isLocalOnly) {
      router.push("/login");
    }
  }, [requireAuth, isPending, isLocalOnly, router]);

  if (isPending) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // If strict auth is required and user is not authenticated, render nothing (redirect in progress)
  if (requireAuth && isLocalOnly) {
    return null;
  }

  return (
    <>
      {isLocalOnly && <SyncBanner sessionExpired={sessionExpired} />}
      {children}
    </>
  );
}

/**
 * Subtle banner shown when user is in local-only mode.
 * Informs them that signing in enables cloud sync.
 */
function SyncBanner({ sessionExpired }: { sessionExpired: boolean }) {
  const router = useRouter();

  return (
    <div
      className="flex items-center justify-between gap-2 bg-muted/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span>
        {sessionExpired
          ? "Session expired — your data is saved locally."
          : "Using local mode."}
        {" "}
        <button
          onClick={() => router.push("/login")}
          className="inline-flex items-center underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          type="button"
        >
          Sign in to sync
        </button>
      </span>
    </div>
  );
}
