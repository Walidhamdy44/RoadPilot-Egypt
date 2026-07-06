/**
 * Zod validation schemas for trip records.
 *
 * Validates trip data for persistence and sync operations:
 * - Non-empty trip ID
 * - Start timestamp not in the future
 * - Distance ≥ 0
 * - Driving time ≥ 0
 */

import { z } from "zod";

/** Schema for GPS trace point validation. */
export const gpsTracePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKmh: z.number().min(0),
  timestamp: z.number(),
});

/** Schema for stop event validation. */
export const stopEventSchema = z.object({
  startTimestamp: z.number(),
  durationMs: z.number().min(0),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

/** Schema for destination validation. */
export const destinationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().min(1),
});

/** Schema for coordinates pair. */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Zod schema for trip record validation.
 * Validates completed trip data for persistence.
 */
export const tripRecordSchema = z.object({
  id: z.string().min(1),
  startTimestamp: z.number().refine(
    (ts) => ts <= Date.now() + 60_000, // Allow 1 minute clock drift
    { message: "Start timestamp must not be in the future" }
  ),
  endTimestamp: z.number(),
  totalDistanceKm: z.number().min(0),
  drivingTimeMs: z.number().min(0),
  stopTimeMs: z.number().min(0),
  averageSpeedKmh: z.number().min(0),
  maxSpeedKmh: z.number().min(0),
  maxSpeedTimestamp: z.number().nullable(),
  maxSpeedCoordinates: coordinatesSchema.nullable(),
  numberOfStops: z.number().int().min(0),
  startLocationName: z.string().nullable(),
  endLocationName: z.string().nullable(),
  startCoordinates: coordinatesSchema,
  endCoordinates: coordinatesSchema,
  gpsTrace: z.array(gpsTracePointSchema),
  stopEvents: z.array(stopEventSchema),
});

/** TypeScript type inferred from tripRecordSchema */
export type TripRecordSchema = z.infer<typeof tripRecordSchema>;

/**
 * Zod schema for active trip state validation (used for checkpointing).
 */
export const tripStateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["idle", "active", "paused", "completed"]),
  startTimestamp: z.number().refine(
    (ts) => ts <= Date.now() + 60_000,
    { message: "Start timestamp must not be in the future" }
  ),
  endTimestamp: z.number().nullable(),
  totalDistanceKm: z.number().min(0),
  drivingTimeMs: z.number().min(0),
  stopTimeMs: z.number().min(0),
  averageSpeedKmh: z.number().min(0),
  maxSpeedKmh: z.number().min(0),
  maxSpeedTimestamp: z.number().nullable(),
  maxSpeedCoordinates: coordinatesSchema.nullable(),
  currentSpeedKmh: z.number().min(0),
  gpsTrace: z.array(gpsTracePointSchema),
  stopEvents: z.array(stopEventSchema),
  destination: destinationSchema.nullable(),
  remainingDistanceKm: z.number().min(0).nullable(),
  etaTimestamp: z.number().nullable(),
});

/** TypeScript type inferred from tripStateSchema */
export type TripStateSchema = z.infer<typeof tripStateSchema>;
