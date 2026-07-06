/**
 * Sync API route handler for /api/sync
 *
 * POST - Batch synchronize trip records from client to server.
 *
 * Implements last-write-wins conflict resolution based on clientUpdatedAt.
 * Requires authentication. Returns synced IDs, conflicts with resolution,
 * and failed IDs with errors.
 *
 * **Validates: Requirements 12.2, 12.5, 20.4, 20.5**
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { apiGuard } from "@/lib/api-guard";

/**
 * Zod schema for a single trip record in the sync batch.
 */
const syncTripSchema = z.object({
  id: z.string().uuid(),
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
 * Zod schema for the POST /api/sync request body.
 * Accepts a batch of up to 10 trip records.
 */
const syncBatchSchema = z.object({
  trips: z.array(syncTripSchema).min(1).max(10),
});

/**
 * POST /api/sync
 *
 * Synchronizes a batch of trip records from the client.
 * For each trip:
 * - If it doesn't exist in DB: INSERT
 * - If it exists: compare clientUpdatedAt — last-write-wins
 *
 * Returns:
 * - synced: IDs successfully inserted or updated
 * - conflicts: IDs where server had a different version, with resolution outcome
 * - failed: IDs that failed with error details
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

  const validation = syncBatchSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return Response.json({ errors }, { status: 422 });
  }

  const { trips: tripBatch } = validation.data;
  const userId = guard.userId;

  const synced: string[] = [];
  const conflicts: Array<{ id: string; resolution: "client_wins" | "server_wins" }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const tripData of tripBatch) {
    try {
      // Check if trip already exists for this user
      const [existing] = await db
        .select({
          id: trips.id,
          clientUpdatedAt: trips.clientUpdatedAt,
        })
        .from(trips)
        .where(and(eq(trips.id, tripData.id), eq(trips.userId, userId)))
        .limit(1);

      if (!existing) {
        // Trip does not exist — INSERT
        await db.insert(trips).values({
          id: tripData.id,
          userId,
          startTimestamp: new Date(tripData.startTimestamp),
          endTimestamp: new Date(tripData.endTimestamp),
          totalDistanceKm: tripData.totalDistanceKm,
          drivingTimeMs: tripData.drivingTimeMs,
          stopTimeMs: tripData.stopTimeMs,
          averageSpeedKmh: tripData.averageSpeedKmh,
          maxSpeedKmh: tripData.maxSpeedKmh,
          maxSpeedTimestamp: tripData.maxSpeedTimestamp
            ? new Date(tripData.maxSpeedTimestamp)
            : null,
          maxSpeedLat: tripData.maxSpeedLat ?? null,
          maxSpeedLng: tripData.maxSpeedLng ?? null,
          startLocationName: tripData.startLocationName ?? null,
          endLocationName: tripData.endLocationName ?? null,
          startLat: tripData.startLat,
          startLng: tripData.startLng,
          endLat: tripData.endLat,
          endLng: tripData.endLng,
          gpsTrace: tripData.gpsTrace,
          stopEvents: tripData.stopEvents,
          numberOfStops: tripData.numberOfStops,
          clientUpdatedAt: new Date(tripData.clientUpdatedAt),
          syncedAt: new Date(),
        });

        synced.push(tripData.id);
      } else {
        // Trip exists — apply last-write-wins conflict resolution
        const clientTimestamp = new Date(tripData.clientUpdatedAt).getTime();
        const serverTimestamp = existing.clientUpdatedAt.getTime();

        if (clientTimestamp > serverTimestamp) {
          // Client has newer data — update server record
          await db
            .update(trips)
            .set({
              startTimestamp: new Date(tripData.startTimestamp),
              endTimestamp: new Date(tripData.endTimestamp),
              totalDistanceKm: tripData.totalDistanceKm,
              drivingTimeMs: tripData.drivingTimeMs,
              stopTimeMs: tripData.stopTimeMs,
              averageSpeedKmh: tripData.averageSpeedKmh,
              maxSpeedKmh: tripData.maxSpeedKmh,
              maxSpeedTimestamp: tripData.maxSpeedTimestamp
                ? new Date(tripData.maxSpeedTimestamp)
                : null,
              maxSpeedLat: tripData.maxSpeedLat ?? null,
              maxSpeedLng: tripData.maxSpeedLng ?? null,
              startLocationName: tripData.startLocationName ?? null,
              endLocationName: tripData.endLocationName ?? null,
              startLat: tripData.startLat,
              startLng: tripData.startLng,
              endLat: tripData.endLat,
              endLng: tripData.endLng,
              gpsTrace: tripData.gpsTrace,
              stopEvents: tripData.stopEvents,
              numberOfStops: tripData.numberOfStops,
              clientUpdatedAt: new Date(tripData.clientUpdatedAt),
              syncedAt: new Date(),
            })
            .where(and(eq(trips.id, tripData.id), eq(trips.userId, userId)));

          conflicts.push({ id: tripData.id, resolution: "client_wins" });
        } else {
          // Server has same or newer data — keep server version
          conflicts.push({ id: tripData.id, resolution: "server_wins" });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error during sync";
      failed.push({ id: tripData.id, error: message });
    }
  }

  return Response.json({ synced, conflicts, failed });
}
