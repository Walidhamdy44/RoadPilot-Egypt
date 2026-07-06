/**
 * Trip domain types for RoadPilot Egypt.
 *
 * Defines the state, trace, events, and final persistence structures
 * for trip recording and analytics.
 */

/** A single point on the GPS trace recorded during a trip. */
export interface GPSTracePoint {
  /** Latitude in degrees */
  lat: number;
  /** Longitude in degrees */
  lng: number;
  /** Speed in km/h at this point */
  speedKmh: number;
  /** Unix epoch timestamp in milliseconds */
  timestamp: number;
}

/** A detected stop event during a trip. */
export interface StopEvent {
  /** Unix epoch timestamp when the stop began */
  startTimestamp: number;
  /** Duration of the stop in milliseconds */
  durationMs: number;
  /** Coordinates where the stop occurred */
  coordinates: { lat: number; lng: number };
}

/** A destination set for route/ETA calculations. */
export interface Destination {
  /** Latitude in degrees */
  lat: number;
  /** Longitude in degrees */
  lng: number;
  /** Human-readable name of the destination */
  name: string;
}

/** Active trip state maintained in memory and persisted incrementally. */
export interface TripState {
  /** Unique trip identifier */
  id: string;
  /** Current trip status */
  status: "idle" | "active" | "paused" | "completed";
  /** Unix epoch timestamp when trip started (ms) */
  startTimestamp: number;
  /** Unix epoch timestamp when trip ended (ms), null if still active */
  endTimestamp: number | null;
  /** Total distance traveled in kilometers */
  totalDistanceKm: number;
  /** Total driving time in milliseconds */
  drivingTimeMs: number;
  /** Total stop time in milliseconds */
  stopTimeMs: number;
  /** Average speed in km/h (distance / driving time) */
  averageSpeedKmh: number;
  /** Maximum speed recorded during the trip in km/h */
  maxSpeedKmh: number;
  /** Timestamp of the max speed event, null if no max recorded */
  maxSpeedTimestamp: number | null;
  /** Coordinates where max speed was recorded */
  maxSpeedCoordinates: { lat: number; lng: number } | null;
  /** Current instantaneous speed in km/h */
  currentSpeedKmh: number;
  /** Full GPS trace of the trip */
  gpsTrace: GPSTracePoint[];
  /** All detected stop events */
  stopEvents: StopEvent[];
  /** Active destination, if set */
  destination: Destination | null;
  /** Remaining distance to destination in km, null if no destination */
  remainingDistanceKm: number | null;
  /** Estimated time of arrival (Unix epoch ms), null if unavailable */
  etaTimestamp: number | null;
}

/** Completed trip record ready for persistence and sync. */
export interface CompletedTrip {
  /** Unique trip identifier */
  id: string;
  /** Unix epoch timestamp when trip started (ms) */
  startTimestamp: number;
  /** Unix epoch timestamp when trip ended (ms) */
  endTimestamp: number;
  /** Total distance traveled in kilometers */
  totalDistanceKm: number;
  /** Total driving time in milliseconds */
  drivingTimeMs: number;
  /** Total stop time in milliseconds */
  stopTimeMs: number;
  /** Average speed in km/h */
  averageSpeedKmh: number;
  /** Maximum speed in km/h */
  maxSpeedKmh: number;
  /** Timestamp of max speed event */
  maxSpeedTimestamp: number | null;
  /** Coordinates of max speed event */
  maxSpeedCoordinates: { lat: number; lng: number } | null;
  /** Number of stops during the trip */
  numberOfStops: number;
  /** Human-readable start location name */
  startLocationName: string | null;
  /** Human-readable end location name */
  endLocationName: string | null;
  /** Start coordinates */
  startCoordinates: { lat: number; lng: number };
  /** End coordinates */
  endCoordinates: { lat: number; lng: number };
  /** Full GPS trace */
  gpsTrace: GPSTracePoint[];
  /** All stop events */
  stopEvents: StopEvent[];
}
