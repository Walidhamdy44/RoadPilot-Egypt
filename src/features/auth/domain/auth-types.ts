/**
 * Authentication domain types for RoadPilot Egypt.
 *
 * Defines user profile, session, and auth request/response structures.
 */

/** User profile stored in the database. */
export interface UserProfile {
  /** Unique user identifier (UUID) */
  id: string;
  /** User's email address */
  email: string;
  /** Display name (1-100 characters) */
  displayName: string;
  /** Google OAuth identifier, if linked */
  googleId: string | null;
  /** Account creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last profile update timestamp (ISO 8601) */
  updatedAt: string;
}

/** Active user session. */
export interface UserSession {
  /** Session token identifier */
  id: string;
  /** Associated user ID */
  userId: string;
  /** Session expiration timestamp (ISO 8601) */
  expiresAt: string;
  /** Session creation timestamp (ISO 8601) */
  createdAt: string;
}

/** Registration request payload. */
export interface RegisterRequest {
  /** User email (RFC 5322 simplified) */
  email: string;
  /** Password (8-128 characters) */
  password: string;
  /** Display name (1-100 characters) */
  displayName: string;
}

/** Login request payload. */
export interface LoginRequest {
  /** User email */
  email: string;
  /** User password */
  password: string;
}

/** Authentication result. */
export interface AuthResult {
  /** Whether authentication succeeded */
  success: boolean;
  /** Error message on failure, null on success */
  error: string | null;
  /** User profile on success, null on failure */
  user: UserProfile | null;
}
