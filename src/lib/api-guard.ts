/**
 * API Guard utility combining authentication check and rate limiting.
 *
 * Usage in API route handlers:
 *
 * ```ts
 * import { apiGuard } from '@/lib/api-guard';
 *
 * export async function GET(request: Request) {
 *   const guard = await apiGuard(request);
 *   if (guard.error) return guard.error;
 *   // guard.session is available if user is authenticated
 *   // guard.userId is the user ID (if authenticated)
 * }
 * ```
 *
 * **Validates: Requirements 23.3, 23.4**
 */

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkRateLimit, type RateLimitResult } from "@/lib/rate-limit";

export interface GuardSuccess {
  error: null;
  session: { user: { id: string; email: string; name: string } } | null;
  userId: string | null;
  rateLimit: RateLimitResult;
}

export interface GuardError {
  error: Response;
  session: null;
  userId: null;
  rateLimit: RateLimitResult | null;
}

export type GuardResult = GuardSuccess | GuardError;

/**
 * Extract the client IP from a request.
 * Checks standard proxy headers, falls back to "unknown".
 */
function getClientIp(request: Request): string {
  // Check forwarded headers (common in reverse proxy setups like Vercel)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; the first is the client
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Perform auth check + rate limiting on an incoming API request.
 *
 * Returns either a success result (with session info) or an error Response
 * that should be returned immediately from the route handler.
 */
export async function apiGuard(request: Request): Promise<GuardResult> {
  // 1. Attempt to get the session from Better Auth
  let session: { user: { id: string; email: string; name: string } } | null =
    null;

  try {
    const reqHeaders = await headers();
    const result = await auth.api.getSession({ headers: reqHeaders });
    if (result?.user) {
      session = result as { user: { id: string; email: string; name: string } };
    }
  } catch {
    // Session retrieval failed — treat as unauthenticated
    session = null;
  }

  // 2. Determine the rate limit identifier
  const isAuthenticated = session !== null;
  const identifier = isAuthenticated ? session!.user.id : getClientIp(request);

  // 3. Check rate limit
  const rateLimitResult = checkRateLimit(identifier, isAuthenticated);

  // 4. If rate limited, return 429 response
  if (!rateLimitResult.success) {
    const response = new Response(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: rateLimitResult.reset,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.reset),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.reset),
        },
      }
    );

    return {
      error: response,
      session: null,
      userId: null,
      rateLimit: rateLimitResult,
    };
  }

  // 5. Success — return session info and rate limit metadata
  return {
    error: null,
    session,
    userId: session?.user.id ?? null,
    rateLimit: rateLimitResult,
  };
}

/**
 * Create a rate-limited response with standard rate limit headers.
 * Utility for adding rate limit headers to successful responses.
 */
export function withRateLimitHeaders(
  response: Response,
  rateLimit: RateLimitResult
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Limit", String(rateLimit.limit));
  newHeaders.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  newHeaders.set("X-RateLimit-Reset", String(rateLimit.reset));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
