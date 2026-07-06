/**
 * PostgreSQL schema definition for RoadPilot Egypt.
 *
 * Uses Drizzle ORM with Neon serverless Postgres.
 * Tables: users, sessions, trips, tripAnalytics
 */

import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  integer,
  json,
  uuid,
  index,
} from "drizzle-orm/pg-core";

import type { GPSTracePoint, StopEvent } from "@/features/trip/domain/trip-types";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Accounts (Better Auth social/OAuth providers) ───────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Verifications (Better Auth email verification tokens) ───────────────────

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Trips ───────────────────────────────────────────────────────────────────

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startTimestamp: timestamp("start_timestamp").notNull(),
    endTimestamp: timestamp("end_timestamp").notNull(),
    totalDistanceKm: doublePrecision("total_distance_km").notNull(),
    drivingTimeMs: integer("driving_time_ms").notNull(),
    stopTimeMs: integer("stop_time_ms").notNull(),
    averageSpeedKmh: doublePrecision("average_speed_kmh").notNull(),
    maxSpeedKmh: doublePrecision("max_speed_kmh").notNull(),
    maxSpeedTimestamp: timestamp("max_speed_timestamp"),
    maxSpeedLat: doublePrecision("max_speed_lat"),
    maxSpeedLng: doublePrecision("max_speed_lng"),
    startLocationName: text("start_location_name"),
    endLocationName: text("end_location_name"),
    startLat: doublePrecision("start_lat").notNull(),
    startLng: doublePrecision("start_lng").notNull(),
    endLat: doublePrecision("end_lat").notNull(),
    endLng: doublePrecision("end_lng").notNull(),
    gpsTrace: json("gps_trace").$type<GPSTracePoint[]>().notNull(),
    stopEvents: json("stop_events").$type<StopEvent[]>().notNull(),
    numberOfStops: integer("number_of_stops").notNull(),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    clientUpdatedAt: timestamp("client_updated_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("trips_user_id_idx").on(table.userId),
    index("trips_start_timestamp_idx").on(table.startTimestamp),
    index("trips_user_start_idx").on(table.userId, table.startTimestamp),
  ]
);

// ─── Trip Analytics ──────────────────────────────────────────────────────────

export const tripAnalytics = pgTable(
  "trip_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodType: text("period_type").notNull(), // 'weekly' | 'monthly'
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    totalDistanceKm: doublePrecision("total_distance_km").notNull(),
    totalDrivingTimeMs: integer("total_driving_time_ms").notNull(),
    totalStopTimeMs: integer("total_stop_time_ms").notNull(),
    averageTripSpeedKmh: doublePrecision("average_trip_speed_kmh").notNull(),
    numberOfTrips: integer("number_of_trips").notNull(),
    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (table) => [
    index("analytics_user_period_idx").on(
      table.userId,
      table.periodType,
      table.periodStart
    ),
  ]
);
