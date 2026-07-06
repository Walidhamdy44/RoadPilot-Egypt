/**
 * Zod validation schemas for authentication inputs.
 *
 * Validates registration and login payloads:
 * - Email: simplified RFC 5322 pattern
 * - Password: 8-128 characters
 * - Display name: 1-100 characters
 */

import { z } from "zod";

/**
 * Simplified RFC 5322 email regex.
 * Allows standard email formats: local@domain.tld
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Zod schema for email validation (simplified RFC 5322). */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .regex(EMAIL_REGEX, "Invalid email format");

/** Zod schema for password validation (8-128 characters). */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

/** Zod schema for display name validation (1-100 characters). */
export const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(100, "Display name must be at most 100 characters");

/** Zod schema for user registration request. */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

/** TypeScript type inferred from registerSchema */
export type RegisterSchema = z.infer<typeof registerSchema>;

/** Zod schema for user login request. */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** TypeScript type inferred from loginSchema */
export type LoginSchema = z.infer<typeof loginSchema>;
