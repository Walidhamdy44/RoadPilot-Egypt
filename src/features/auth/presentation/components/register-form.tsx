"use client";

/**
 * Registration form component with Zod validation.
 *
 * Features:
 * - Email, password, display name fields
 * - Zod schema validation with inline error messages
 * - Google OAuth sign-up option
 * - 44x44px minimum touch targets
 * - Accessible labels and aria attributes
 * - Dark-mode-first gradient design
 */

import { useState } from "react";
import Link from "next/link";
import { registerSchema, type RegisterSchema } from "@/features/auth/domain/auth-validator";
import { useAuth } from "@/features/auth/presentation/hooks/use-auth";

interface FieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
}

export function RegisterForm() {
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      displayName: formData.get("displayName") as string,
    };

    const result = registerSchema.safeParse(data);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    await register(result.data as RegisterSchema);
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start tracking your drives across Egypt
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Display name field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-display-name"
              className="block text-sm font-medium text-foreground"
            >
              Display Name
            </label>
            <input
              id="register-display-name"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              aria-invalid={!!fieldErrors.displayName}
              aria-describedby={
                fieldErrors.displayName ? "register-display-name-error" : undefined
              }
              className="block w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              placeholder="Your name"
              onChange={() => {
                if (fieldErrors.displayName)
                  setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
              }}
            />
            {fieldErrors.displayName && (
              <p
                id="register-display-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
              className="block w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              placeholder="you@example.com"
              onChange={() => {
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {fieldErrors.email && (
              <p id="register-email-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
              className="block w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              placeholder="At least 8 characters"
              onChange={() => {
                if (fieldErrors.password)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />
            {fieldErrors.password && (
              <p id="register-password-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* General error */}
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
            >
              {error.message}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
          </div>
        </div>

        {/* Google OAuth button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full min-h-[44px] rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Google
        </button>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
