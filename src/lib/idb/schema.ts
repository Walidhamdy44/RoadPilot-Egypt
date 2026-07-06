/**
 * IndexedDB schema definition for RoadPilot Egypt.
 *
 * Defines the RoadPilotDB interface used by the `idb` library for
 * type-safe IndexedDB access. Object stores:
 * - trips: completed trip records with sync status
 * - activeTrip: single-record store for the in-progress trip checkpoint
 * - geocodeCache: reverse geocoding results keyed by geohash
 * - settings: key-value application settings
 */

import type { DBSchema } from 'idb';
import type { GPSTracePoint, StopEvent } from '@/features/trip/domain/trip-types';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';

/** IndexedDB schema for the RoadPilot Egypt database. */
export interface RoadPilotDB extends DBSchema {
  trips: {
    key: string;
    value: {
      id: string;
      userId: string | null;
      status: 'active' | 'completed';
      startTimestamp: number;
      endTimestamp: number | null;
      totalDistanceKm: number;
      drivingTimeMs: number;
      stopTimeMs: number;
      averageSpeedKmh: number;
      maxSpeedKmh: number;
      maxSpeedTimestamp: number | null;
      maxSpeedCoordinates: { lat: number; lng: number } | null;
      startLocationName: string | null;
      endLocationName: string | null;
      startCoordinates: { lat: number; lng: number };
      endCoordinates: { lat: number; lng: number } | null;
      gpsTrace: GPSTracePoint[];
      stopEvents: StopEvent[];
      numberOfStops: number;
      syncStatus: 'pending' | 'syncing' | 'synced' | 'sync_failed';
      lastSyncAttempt: number | null;
      retryCount: number;
      updatedAt: number;
    };
    indexes: {
      'by-status': string;
      'by-start-date': number;
      'by-sync-status': string;
      'by-distance': number;
      'by-user-id': string;
    };
  };
  activeTrip: {
    key: 'current';
    value: {
      tripId: string;
      startTimestamp: number;
      totalDistanceKm: number;
      drivingTimeMs: number;
      stopTimeMs: number;
      maxSpeedKmh: number;
      maxSpeedTimestamp: number | null;
      maxSpeedCoordinates: { lat: number; lng: number } | null;
      lastPosition: ValidatedPosition | null;
      gpsTrace: GPSTracePoint[];
      stopEvents: StopEvent[];
      lastCheckpoint: number;
    };
  };
  geocodeCache: {
    key: string;
    value: {
      roadName: string | null;
      localityName: string | null;
      timestamp: number;
      coordinates: { lat: number; lng: number };
    };
    indexes: {
      'by-timestamp': number;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
}

/** Database name used for the RoadPilot Egypt IndexedDB instance. */
export const DB_NAME = 'roadpilot-egypt';

/** Current database schema version. */
export const DB_VERSION = 2;
