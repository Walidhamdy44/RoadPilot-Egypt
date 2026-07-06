/**
 * Trip API route handlers for /api/trips/[id]
 *
 * GET    - Get a single trip by ID
 * DELETE - Delete a single trip by ID
 *
 * All routes require authentication and enforce row-level authorization.
 * Returns indistinguishable 404 for unauthorized access attempts (not 403).
 *
 * **Validates: Requirements 12.1, 20.4, 20.5, 23.5, 23.6**
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { apiGuard } from "@/lib/api-guard";

/**
 * GET /api/trips/[id]
 *
 * Returns a single trip by ID.
 * Enforces row-level authorization: only the trip owner can access it.
 * Returns 404 (not 403) if the trip belongs to another user.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (guard.error) return guard.error;

  // Require authentication
  if (!guard.userId) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Query with userId filter for row-level authorization
  // This returns 404 regardless of whether the trip exists but belongs to
  // another user, or simply doesn't exist — indistinguishable response.
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, guard.userId)))
    .limit(1);

  if (!trip) {
    return Response.json(
      { error: "Not Found", message: "Trip not found" },
      { status: 404 }
    );
  }

  return Response.json({ data: trip });
}

/**
 * DELETE /api/trips/[id]
 *
 * Deletes a single trip by ID.
 * Enforces row-level authorization: only the trip owner can delete it.
 * Returns 404 (not 403) if the trip belongs to another user.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (guard.error) return guard.error;

  // Require authentication
  if (!guard.userId) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Delete with userId filter for row-level authorization
  // This returns 404 regardless of whether the trip exists but belongs to
  // another user, or simply doesn't exist — indistinguishable response.
  const deleted = await db
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, guard.userId)))
    .returning({ id: trips.id });

  if (deleted.length === 0) {
    return Response.json(
      { error: "Not Found", message: "Trip not found" },
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
