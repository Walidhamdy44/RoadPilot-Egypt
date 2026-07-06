/**
 * Zod validation schemas for GPS position data.
 *
 * The GPS position schema validates raw Geolocation API output:
 * - speed is in m/s [0, ~111.11 m/s ≈ 400 km/h], nullable
 * - heading is in degrees [0, 360], nullable
 * - latitude [-90, 90], longitude [-180, 180]
 * - accuracy ≥ 0
 */

import { z } from "zod";

/** Maximum speed in m/s (≈ 400 km/h) */
const MAX_SPEED_MS = 400 / 3.6; // ~111.11 m/s

/**
 * Zod schema for raw GPS position from the Geolocation API.
 * Speed is in m/s, heading in degrees.
 */
export const gpsPositionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(MAX_SPEED_MS).nullable(),
  heading: z.number().min(0).max(360).nullable(),
  accuracy: z.number().min(0),
  altitude: z.number().nullable(),
  timestamp: z.number(),
});

/** TypeScript type inferred from gpsPositionSchema */
export type GPSPositionSchema = z.infer<typeof gpsPositionSchema>;

/**
 * Zod schema for validated position (post-conversion).
 * Speed is in km/h [0, 400].
 */
export const validatedPositionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(400),
  heading: z.number().min(0).max(360).nullable(),
  accuracy: z.number().min(0),
  timestamp: z.number(),
});

/** TypeScript type inferred from validatedPositionSchema */
export type ValidatedPositionSchema = z.infer<typeof validatedPositionSchema>;
