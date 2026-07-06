/**
 * GPS domain types for RoadPilot Egypt.
 *
 * GPSPosition represents raw data from the Geolocation API.
 * ValidatedPosition is the cleaned/converted output of the validation pipeline.
 * GPSServiceState tracks the overall GPS acquisition state.
 */

/** Raw GPS position from the Geolocation API. */
export interface GPSPosition {
  /** Latitude in degrees, range [-90, 90] */
  latitude: number;
  /** Longitude in degrees, range [-180, 180] */
  longitude: number;
  /** Speed in m/s from Geolocation API, or null if unavailable */
  speed: number | null;
  /** Heading in degrees [0, 360], or null if unavailable */
  heading: number | null;
  /** Horizontal accuracy in meters, ≥ 0 */
  accuracy: number;
  /** Altitude in meters, or null if unavailable */
  altitude: number | null;
  /** Unix epoch timestamp in milliseconds */
  timestamp: number;
}

/** Validated and converted GPS position for use in the trip engine. */
export interface ValidatedPosition {
  /** Latitude in degrees, range [-90, 90] */
  latitude: number;
  /** Longitude in degrees, range [-180, 180] */
  longitude: number;
  /** Speed in km/h, converted and validated */
  speedKmh: number;
  /** Heading in degrees [0, 360], or null if unavailable */
  heading: number | null;
  /** Horizontal accuracy in meters */
  accuracy: number;
  /** Unix epoch timestamp in milliseconds */
  timestamp: number;
}

/** GPS service state tracking signal acquisition and failures. */
export interface GPSServiceState {
  /** Most recently validated position */
  currentPosition: ValidatedPosition | null;
  /** Last position that passed validation */
  lastValidPosition: ValidatedPosition | null;
  /** Current signal status */
  signalStatus: "acquiring" | "active" | "lost" | "denied";
  /** Number of consecutive position acquisition failures */
  consecutiveFailures: number;
}
