/**
 * Trip API route handlers for /api/trips
 *
 * GET  - Paginated list of trips with date range filters
 * POST - Create a new trip record (for sync purposes)
 *
 * All routes require authentication and enforce row-level authorization.
 *
 * **Validates: Requirements 12.1, 20.4, 20.5, 23.5, 23.6**
 */

import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { apiGuard } from "@/lib/api-guard";

/**
 * Zod schema for POST /api/trips request body.
 * Validates all required trip fields for creation.
 */
const createTripSchema = z.object({
  id: z.string().uuid().optional(),
  startTimestamp: z.string().datetime(),
  endTimestamp: z.string().datetime(),
  totalDistanceKm: z.number().min(0),
  drivingTimeMs: z.number().int().min(0),
  stopTimeMs: z.number().int().min(0),
  averageSpeedKmh: z.number().min(0),
  maxSpeedKmh: z.number().min(0),
  maxSpeedTimestamp: z.string().datetime().nullable().optional(),
  maxSpeedLat: z.number().min(-90).max(90).nullable().optional(),
  maxSpeedLng: z.number().min(-180).max(180).nullable().optional(),
  startLocationName: z.string().nullable().optional(),
  endLocationName: z.string().nullable().optional(),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  gpsTrace: z.array(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      speedKmh: z.number().min(0),
      timestamp: z.number(),
    })
  ),
  stopEvents: z.array(
    z.object({
      startTimestamp: z.number(),
      durationMs: z.number().min(0),
      coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    })
  ),
  numberOfStops: z.number().int().min(0),
  clientUpdatedAt: z.string().datetime(),
});

/**
 * GET /api/trips
 *
 * Returns a paginated list of the authenticated user's trips.
 * Supports optional query params: page, limit, from, to (ISO date strings).
 */
export async function GET(request: Request) {
  const guard = await apiGuard(request);
  if (guard.error) return guard.error;

  // Require authentication
  if (!guard.userId) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
  );
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const offset = (page - 1) * limit;

  // Build conditions array
  const conditions = [eq(trips.userId, guard.userId)];

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(trips.startTimestamp, fromDate));
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      conditions.push(lte(trips.startTimestamp, toDate));
    }
  }

  const whereClause = and(...conditions);

  // Query trips with pagination
  const results = await db
    .select()
    .from(trips)
    .where(whereClause)
    .orderBy(desc(trips.startTimestamp))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination metadata
  const countResult = await db
    .select({ id: trips.id })
    .from(trips)
    .where(whereClause);

  const total = countResult.length;
  const totalPages = Math.ceil(total / limit);

  return Response.json({
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

/**
 * POST /api/trips
 *
 * Creates a new trip record for the authenticated user.
 * Validates request body with Zod; returns 422 on validation failure.
 */
export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard.error) return guard.error;

  // Require authentication
  if (!guard.userId) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: [{ path: "body", message: "Invalid JSON body" }] },
      { status: 422 }
    );
  }

  const validation = createTripSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return Response.json({ errors }, { status: 422 });
  }

  const data = validation.data;

  const [created] = await db
    .insert(trips)
    .values({
      ...(data.id ? { id: data.id } : {}),
      userId: guard.userId,
      startTimestamp: new Date(data.startTimestamp),
      endTimestamp: new Date(data.endTimestamp),
      totalDistanceKm: data.totalDistanceKm,
      drivingTimeMs: data.drivingTimeMs,
      stopTimeMs: data.stopTimeMs,
      averageSpeedKmh: data.averageSpeedKmh,
      maxSpeedKmh: data.maxSpeedKmh,
      maxSpeedTimestamp: data.maxSpeedTimestamp
        ? new Date(data.maxSpeedTimestamp)
        : null,
      maxSpeedLat: data.maxSpeedLat ?? null,
      maxSpeedLng: data.maxSpeedLng ?? null,
      startLocationName: data.startLocationName ?? null,
      endLocationName: data.endLocationName ?? null,
      startLat: data.startLat,
      startLng: data.startLng,
      endLat: data.endLat,
      endLng: data.endLng,
      gpsTrace: data.gpsTrace,
      stopEvents: data.stopEvents,
      numberOfStops: data.numberOfStops,
      clientUpdatedAt: new Date(data.clientUpdatedAt),
    })
    .returning();

  return Response.json({ data: created }, { status: 201 });
}
