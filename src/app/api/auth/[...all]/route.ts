/**
 * Better Auth catch-all API route handler.
 *
 * Handles all authentication-related requests at /api/auth/*:
 * - POST /api/auth/sign-up (email/password registration)
 * - POST /api/auth/sign-in/email (email/password login)
 * - POST /api/auth/sign-in/social (OAuth login via Google)
 * - POST /api/auth/sign-out (session termination)
 * - GET  /api/auth/session (current session)
 * - GET  /api/auth/callback/* (OAuth callbacks)
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
