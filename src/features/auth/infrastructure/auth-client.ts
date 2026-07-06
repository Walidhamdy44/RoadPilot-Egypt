/**
 * Better Auth client configuration for RoadPilot Egypt.
 *
 * Provides React hooks and methods for client-side authentication:
 * - useSession: Access current session state
 * - signIn: Email/password and social login
 * - signUp: Email/password registration
 * - signOut: Session termination
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
