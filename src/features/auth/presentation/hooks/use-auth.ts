"use client";

/**
 * Custom hook wrapping Better Auth client for RoadPilot Egypt.
 *
 * Provides a unified interface for authentication operations:
 * - Session state (loading, authenticated, user data)
 * - Sign in with email/password or Google OAuth
 * - Sign up with email/password
 * - Sign out
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useSession,
  signIn,
  signUp,
  signOut,
} from "@/features/auth/infrastructure/auth-client";
import type { LoginSchema, RegisterSchema } from "@/features/auth/domain/auth-validator";

export interface AuthError {
  message: string;
  field?: string;
}

export function useAuth() {
  const router = useRouter();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(
    async (data: LoginSchema) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signIn.email({
          email: data.email,
          password: data.password,
        });
        if (result.error) {
          setError({
            message:
              result.error.message ?? "Authentication failed. Please check your credentials.",
          });
        } else {
          router.push("/");
        }
      } catch {
        setError({ message: "Authentication failed. Please check your credentials." });
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch {
      setError({ message: "Google sign-in failed. Please try again." });
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: RegisterSchema) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signUp.email({
          email: data.email,
          password: data.password,
          name: data.displayName,
        });
        if (result.error) {
          setError({
            message:
              result.error.message ??
              "Registration could not be completed. Please try again.",
          });
        } else {
          router.push("/");
        }
      } catch {
        setError({
          message: "Registration could not be completed. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      // Silently fail signout - user can retry
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    session: session.data,
    isPending: session.isPending,
    isAuthenticated: !!session.data?.user,
    user: session.data?.user ?? null,
    isLoading,
    error,
    clearError,
    login,
    loginWithGoogle,
    register,
    logout,
  };
}
