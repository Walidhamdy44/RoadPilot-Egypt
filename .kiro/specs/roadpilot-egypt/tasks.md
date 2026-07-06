# Implementation Plan: RoadPilot Egypt

## Overview

RoadPilot Egypt is implemented as a Next.js 14+ App Router PWA with a feature-based Clean Architecture. The implementation is organized in dependency order: foundational infrastructure first, then core domain logic, then presentation layer, and finally integration/optimization. Each feature module (gps, trip, analytics, map, geocoding, auth, sync, pwa) is self-contained with domain, infrastructure, and presentation layers.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize Next.js project with TypeScript strict mode and configure tooling
    - Initialize Next.js 14+ with App Router and TypeScript strict configuration
    - Install all dependencies: drizzle-orm, better-auth, maplibre-gl, zustand, @tanstack/react-query, zod, framer-motion, recharts, tailwindcss, shadcn/ui, idb, fast-check, vitest
    - Configure `tsconfig.json` with strict: true, noImplicitAny: true, strictNullChecks: true
    - Configure ESLint with import restriction rules enforcing Clean Architecture layer boundaries
    - Configure ESLint max cyclomatic complexity (10) and max file lines (300)
    - Set up Tailwind CSS with dark-mode-first configuration
    - Set up path aliases for `@/features`, `@/shared`, `@/lib`
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

  - [x] 1.2 Create feature-based directory structure
    - Create the full directory structure: `src/features/{gps,trip,analytics,map,geocoding,auth,sync,pwa}/{domain,infrastructure,presentation}`
    - Create `src/shared/{types,utils,ui,hooks}` directories
    - Create `src/lib/{db,auth,idb}` directories
    - Create `src/app/(auth)`, `src/app/(dashboard)`, `src/app/api` route groups
    - Create `tests/{properties,unit,integration}` directories
    - _Requirements: 25.1, 25.6_

  - [x] 1.3 Configure Vitest and fast-check for testing
    - Install and configure Vitest with V8 coverage
    - Configure fast-check integration with Vitest (100 iterations minimum, seed-based reproducibility, shrinking enabled)
    - Set up test path aliases and mock configurations
    - Create test helper utilities for common test patterns
    - _Requirements: 25.5_

- [x] 2. Shared types, utilities, and validation schemas
  - [x] 2.1 Define core shared types and Zod validation schemas
    - Create `src/features/gps/domain/gps-types.ts` with GPSPosition, ValidatedPosition, GPSServiceState interfaces
    - Create `src/features/gps/domain/gps-validator.ts` with Zod schema: latitude [-90,90], longitude [-180,180], speed [0,400] km/h, heading [0,360], accuracy ≥ 0
    - Create `src/features/trip/domain/trip-types.ts` with TripState, GPSTracePoint, StopEvent, Destination, CompletedTrip interfaces
    - Create `src/features/trip/domain/trip-validator.ts` with Zod schema: non-empty trip ID, start timestamp not in future, distance ≥ 0, driving time ≥ 0
    - Create `src/features/auth/domain/auth-types.ts` and `auth-validator.ts` with Zod schema: valid email (RFC 5322 simplified), password 8-128 chars, display name 1-100 chars
    - Create `src/features/sync/domain/sync-types.ts` with SyncRecord, SyncConfig interfaces
    - _Requirements: 20.1, 20.3, 20.6_

  - [x] 2.2 Write property test for GPS position validation (Property 23)
    - **Property 23: GPS Position Validation**
    - Test that Zod schema accepts latitude in [-90,90], longitude in [-180,180], speed in [0,400], heading in [0,360], accuracy ≥ 0 and rejects all others
    - **Validates: Requirements 20.1**

  - [x] 2.3 Write property test for trip record validation (Property 24)
    - **Property 24: Trip Record Validation**
    - Test that Zod schema accepts non-empty trip ID, valid start timestamp, distance ≥ 0, driving time ≥ 0 and rejects all others
    - **Validates: Requirements 20.3, 20.4**

  - [x] 2.4 Write property test for auth input validation (Property 25)
    - **Property 25: Auth Input Validation**
    - Test that Zod schema accepts valid email, password 8-128 chars, display name 1-100 chars and rejects all others
    - **Validates: Requirements 20.6**

  - [x] 2.5 Create shared utility functions
    - Create `src/shared/utils/format.ts` with number formatting (decimal places), time formatting (HH:MM:SS), coordinate formatting (6 decimal places)
    - Create `src/shared/utils/date.ts` with date/time helpers, ISO 8601 conversion utilities
    - Create `src/shared/utils/storage.ts` with IndexedDB quota checking utilities
    - _Requirements: 7.2, 3.1, 5.3_

  - [x] 2.6 Write property test for time formatting (Property 11)
    - **Property 11: Time Formatting (HH:MM:SS)**
    - Test that for any non-negative duration 0 to 359,999,000 ms, formatting produces HH:MM:SS and round-trip parsing equals original value rounded to nearest second
    - **Validates: Requirements 7.2, 8.4**

  - [x] 2.7 Write property test for coordinate formatting (Property 5)
    - **Property 5: Coordinate Formatting**
    - Test that for any valid lat/lng, formatting produces 6 decimal places and parsed value is within 0.0000005 of original
    - **Validates: Requirements 3.1**

- [x] 3. Database schema and infrastructure
  - [x] 3.1 Create PostgreSQL schema with Drizzle ORM
    - Create `src/lib/db/schema.ts` with users, sessions, trips, and tripAnalytics tables matching the design specification
    - Add all indexes: trips_user_id_idx, trips_start_timestamp_idx, trips_user_start_idx, analytics_user_period_idx
    - Create `src/lib/db/index.ts` with Neon database connection configuration
    - Generate initial Drizzle migration files
    - _Requirements: 17.3, 12.1, 14.1_

  - [x] 3.2 Create IndexedDB schema and connection helper
    - Create `src/lib/idb/schema.ts` with RoadPilotDB interface defining trips, activeTrip, geocodeCache, and settings object stores
    - Create indexes: by-status, by-start-date, by-sync-status, by-distance for trips store; by-timestamp for geocodeCache
    - Create `src/lib/idb/index.ts` with getDB() helper using idb library
    - Implement IndexedDB version upgrade logic
    - _Requirements: 12.1, 12.3, 15.3_

- [x] 4. Authentication setup
  - [x] 4.1 Configure Better Auth server and client
    - Create `src/lib/auth/index.ts` with Better Auth server configuration (email/password + Google OAuth)
    - Configure session token with 30-day default expiration, httpOnly/Secure/SameSite=Strict cookie
    - Configure bcrypt password hashing with work factor 12
    - Create `src/features/auth/infrastructure/auth-client.ts` with Better Auth client setup
    - Create `src/app/api/auth/[...all]/route.ts` for Better Auth API routes
    - _Requirements: 17.1, 17.2, 17.4, 23.2, 23.7_

  - [x] 4.2 Implement auth UI components
    - Create `src/features/auth/presentation/components/login-form.tsx` with email/password and Google OAuth login
    - Create `src/features/auth/presentation/components/register-form.tsx` with email, password, display name fields and Zod validation
    - Create `src/features/auth/presentation/components/auth-guard.tsx` for protected route enforcement
    - Create `src/features/auth/presentation/hooks/use-auth.ts` hook wrapping Better Auth client
    - Create `src/app/(auth)/login/page.tsx` and `src/app/(auth)/register/page.tsx`
    - Implement inline error display for validation failures
    - _Requirements: 17.1, 17.2, 17.5, 17.6, 20.7_

  - [x] 4.3 Implement local-only mode and data association
    - Implement unauthenticated local-only mode allowing full dashboard usage with IndexedDB-only storage
    - Implement post-authentication trip association: enumerate untagged local trips, tag with userId, trigger sync
    - Handle session expiration: redirect to login, preserve unsynchronized local data
    - _Requirements: 17.7, 17.8, 17.9_

  - [x] 4.4 Implement rate limiting middleware
    - Create API middleware enforcing 100 requests/minute per authenticated user, 20 requests/minute per unauthenticated IP
    - Return 429 status with Retry-After header on limit exceeded
    - _Requirements: 23.3, 23.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. GPS Service implementation
  - [x] 6.1 Implement Haversine distance calculation
    - Create `src/features/gps/domain/haversine.ts` with haversineDistanceKm function using Earth radius 6371 km
    - Implement toRadians helper function
    - _Requirements: 5.1_

  - [x] 6.2 Write property test for Haversine distance accumulation (Property 8)
    - **Property 8: Haversine Distance Accumulation**
    - Test that cumulative distance equals sum of segments and positions with accuracy > 50m contribute zero distance
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.3 Implement GPS Service core with Geolocation API adapter
    - Create `src/features/gps/infrastructure/geolocation-adapter.ts` wrapping navigator.geolocation.watchPosition with enableHighAccuracy, maximumAge 1000ms, timeout 5000ms
    - Create `src/features/gps/domain/gps-service.ts` implementing the GPS acquisition and validation pipeline
    - Implement speed conversion (m/s × 3.6 = km/h), below-2-km/h clamping to 0.0
    - Implement fallback speed calculation from position delta when GPS speed is null
    - Track consecutive failures; set signalStatus to 'lost' after 3 failures
    - Implement 5-minute stale data timeout
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 1.8, 22.3_

  - [x] 6.4 Write property test for speed conversion and display (Property 1)
    - **Property 1: Speed Conversion and Display**
    - Test m/s × 3.6 correctness, below-2-km/h → "0.0", and fallback calculation produces non-negative speed
    - **Validates: Requirements 1.2, 1.4, 1.7**

  - [x] 6.5 Implement heading calculation and cardinal direction mapping
    - Create bearing calculation function in `src/features/gps/domain/haversine.ts` using atan2 formula
    - Implement headingToCardinal function with 45-degree segments: N (338–22), NE (23–67), E (68–112), SE (113–157), S (158–202), SW (203–247), W (248–292), NW (293–337)
    - Implement heading fallback: calculate from bearing between two positions separated by ≥ 5 meters
    - Implement heading suppression when speed < 2 km/h
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 6.6 Write property test for heading and cardinal direction (Property 6)
    - **Property 6: Heading Calculation and Cardinal Direction**
    - Test bearing produces [0, 360) and cardinal mapping assigns exactly one direction per 45-degree segment
    - **Validates: Requirements 4.1, 4.3**

  - [x] 6.7 Write property test for shortest rotational path (Property 7)
    - **Property 7: Shortest Rotational Path**
    - Test that for any pair of headings, the chosen rotation direction has absolute angular difference ≤ 180 degrees
    - **Validates: Requirements 4.2**

  - [x] 6.8 Create GPS Zustand store
    - Create `src/features/gps/presentation/hooks/use-gps-store.ts` with GPSStore interface
    - Implement setPosition, setSignalLost, setSignalDenied, reset actions
    - Track currentPosition, lastValidPosition, signalStatus, consecutiveFailures
    - _Requirements: 1.1, 1.5_

- [x] 7. Trip Engine implementation
  - [x] 7.1 Implement core Trip Engine with distance and time tracking
    - Create `src/features/trip/domain/trip-engine.ts` implementing TripEngine interface
    - Implement startTrip: initialize state, record start timestamp to IndexedDB
    - Implement processPosition: calculate Haversine distance (discard if accuracy > 50m), accumulate distance, update current speed
    - Implement endTrip: finalize metrics, return CompletedTrip
    - Implement elapsed time as current time minus persisted start timestamp
    - Persist cumulative distance every 100 meters of travel
    - _Requirements: 5.1, 5.2, 5.4, 7.1, 7.3, 7.4_

  - [x] 7.2 Implement stop detection state machine
    - Create `src/features/trip/domain/stop-detector.ts` with processSpeedReading function
    - Implement 3-state machine: 'driving' → 'maybe_stopped' → 'stopped'
    - Implement 30-second grace period with retroactive reclassification
    - Implement GPS signal loss pause: stop both counters when no speed data for > 10 seconds
    - Persist Driving_Time and Stop_Time to IndexedDB every 60 seconds
    - Persist stop event records (duration, coordinates) on confirmed stop end
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7_

  - [x] 7.3 Write property test for stop detection state machine (Property 12)
    - **Property 12: Stop Detection State Machine Invariant**
    - Test that DrivingTime + StopTime = elapsed time, periods ≥ 30s below threshold are StopTime, periods < 30s are DrivingTime
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 7.4 Implement speed calculations (average and maximum)
    - Create `src/features/trip/domain/speed-calculator.ts`
    - Implement average speed: totalDistanceKm / (drivingTimeMs / 3,600,000), recalculated every 5 seconds, capped at 999.9
    - Implement maximum speed tracking: discard readings with accuracy > 30m or speed > 250 km/h, record timestamp and coordinates on update
    - Persist max speed value every 60 seconds
    - _Requirements: 9.1, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 7.5 Write property test for average speed calculation (Property 13)
    - **Property 13: Average Speed Calculation**
    - Test distance/drivingTime formula, 999.9 cap, and zero driving time → 0.0
    - **Validates: Requirements 9.1, 9.3, 9.4**

  - [x] 7.6 Write property test for maximum speed tracking (Property 14)
    - **Property 14: Maximum Speed Tracking**
    - Test that max equals highest valid reading (accuracy ≤ 30m AND speed ≤ 250 km/h)
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [x] 7.7 Implement ETA calculation
    - Implement ETA as currentTime + (remainingKm / avgSpeedKmh) converted to ms
    - Prefer route-based ETA from OpenRouteService if received within last 5 minutes
    - Fall back to distance/speed calculation when route ETA is stale
    - Recalculate at maximum once every 30 seconds
    - Hide ETA when average speed < 5 km/h or no destination set
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 7.8 Write property test for ETA calculation (Property 15)
    - **Property 15: ETA Calculation**
    - Test ETA = currentTimestamp + (remainingKm / avgSpeedKmh) in ms, and formatted display is valid HH:MM 24-hour
    - **Validates: Requirements 11.1, 11.2**

  - [x] 7.9 Create Trip Zustand store
    - Create `src/features/trip/presentation/hooks/use-trip-store.ts` with TripStore interface
    - Implement startTrip, endTrip, updateFromPosition, setDestination, clearDestination, restoreTrip actions
    - Subscribe to GPS store for position updates
    - _Requirements: 7.1, 7.5_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Trip persistence and IndexedDB repository
  - [x] 9.1 Implement Trip Repository (IndexedDB)
    - Create `src/features/trip/infrastructure/trip-repository.ts`
    - Implement save/load/query operations for trip records in IndexedDB
    - Implement active trip checkpoint persistence (every 100m or 60s)
    - Implement trip recovery on app relaunch: restore from activeTrip store within 5 seconds
    - Implement storage quota monitoring: display banner at 80% capacity
    - Implement write retry logic: up to 3 retries, hold in memory on failure
    - Support querying by date range, distance, and duration via indexes
    - _Requirements: 12.1, 12.3, 12.4, 12.7, 22.1_

  - [x] 9.2 Implement Trip API routes
    - Create `src/app/api/trips/route.ts` with GET (paginated list with date range filters) and POST
    - Create `src/app/api/trips/[id]/route.ts` with GET and DELETE
    - Implement Zod validation on all request payloads (return 422 with field path/message on failure)
    - Enforce row-level authorization: users can only access their own trip data
    - Return indistinguishable 404 for unauthorized access attempts
    - _Requirements: 12.1, 20.4, 20.5, 23.5, 23.6_

- [x] 10. Geocoding and road name display
  - [x] 10.1 Implement Nominatim client with throttle controller
    - Create `src/features/geocoding/domain/throttle-controller.ts` enforcing maximum 1 request per 3 seconds, discarding intermediate positions
    - Create `src/features/geocoding/infrastructure/nominatim-client.ts` with proper User-Agent header
    - Create `src/features/geocoding/infrastructure/geocode-cache.ts` implementing LRU cache in IndexedDB geocodeCache store
    - Handle bilingual results: return name matching user's language preference (Arabic/English)
    - Handle offline: return cached road name with "cached" indicator
    - Handle no-result: display "Unknown Road" with coordinates in 6 decimal places
    - Truncate road names exceeding 60 characters with ellipsis
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 10.2 Write property test for geocoder throttle control (Property 2)
    - **Property 2: Geocoder Throttle Control**
    - Test that for any sequence of GPS updates, outbound requests are ≥ 3 seconds apart
    - **Validates: Requirements 2.1, 2.5**

  - [x] 10.3 Write property test for road name truncation (Property 3)
    - **Property 3: Road Name Truncation**
    - Test that names > 60 chars are truncated to 60 + ellipsis, and ≤ 60 chars are unchanged
    - **Validates: Requirements 2.2**

  - [x] 10.4 Write property test for bilingual name selection (Property 4)
    - **Property 4: Bilingual Name Selection**
    - Test that for any result with Arabic and English names, the returned name matches user language
    - **Validates: Requirements 2.7**

- [x] 11. Map integration
  - [x] 11.1 Implement MapLibre GL JS map container
    - Create `src/features/map/presentation/components/map-container.tsx` with MapLibre GL JS and OpenStreetMap tiles
    - Configure default zoom level 15, range 5-18
    - Implement pinch-to-zoom and pan gesture support
    - Implement tap-to-toggle between minimized overlay and full-screen (300ms transition)
    - Implement heading-aligned map rotation when destination is set
    - Handle offline: display placeholder grid with position marker if no cached tiles
    - _Requirements: 18.1, 18.3, 18.4, 18.5, 18.6_

  - [x] 11.2 Implement position marker and trip polyline
    - Create `src/features/map/presentation/components/position-marker.tsx` showing current GPS position
    - Create `src/features/map/presentation/components/trip-polyline.tsx` rendering GPS trace as polyline
    - Center map on user's current position during active trip
    - Append new GPS positions to polyline in real-time
    - _Requirements: 18.2_

  - [x] 11.3 Implement polyline point reduction algorithm
    - Create `src/features/map/domain/polyline-reducer.ts` implementing Douglas-Peucker or similar algorithm
    - Reduce GPS traces to maximum 500 points for rendering performance
    - Preserve first and last points of the original trace
    - _Requirements: 13.4_

  - [x] 11.4 Write property test for GPS trace point reduction (Property 19)
    - **Property 19: GPS Trace Point Reduction**
    - Test that output has ≤ 500 points and first/last points are preserved
    - **Validates: Requirements 13.4**

  - [x] 11.5 Implement route service (OpenRouteService)
    - Create `src/features/map/infrastructure/route-api.ts` as OpenRouteService client
    - Calculate remaining road-following distance from current position to destination
    - Implement recalculation triggers: every 2 minutes or every 5 km (whichever first)
    - Implement route deviation detection: trigger recalculation if > 1 km from route
    - Fall back to Haversine straight-line distance with "estimated" indicator when offline or on error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x] 11.6 Write property test for recalculation trigger logic (Property 9)
    - **Property 9: Recalculation Trigger Logic**
    - Test that recalculation triggers at 2 minutes OR 5 km (whichever first) and not more frequently
    - **Validates: Requirements 6.3**

  - [x] 11.7 Write property test for route deviation detection (Property 10)
    - **Property 10: Route Deviation Detection**
    - Test that recalculation triggers if and only if min distance to route exceeds 1 km
    - **Validates: Requirements 6.7**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Dashboard UI (presentation layer)
  - [x] 13.1 Implement speed display component
    - Create `src/features/gps/presentation/components/speed-display.tsx`
    - Display speed in 72px equivalent large font with 4.5:1 contrast ratio
    - Show "0.0" when speed < 2 km/h, "—" when acquiring GPS, stale indicator on signal loss
    - Update within 100ms of new GPS data via Zustand subscription
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

  - [x] 13.2 Implement coordinates display with copy functionality
    - Create `src/features/gps/presentation/components/coordinates-display.tsx`
    - Display lat/lng in decimal degrees with 6 decimal places
    - Implement tap-to-copy using Clipboard API with "latitude, longitude" format
    - Show confirmation indicator for 2 seconds after copy
    - Fall back to selectable text field if Clipboard API unavailable
    - Show stale indicator when GPS fix fails
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 13.3 Implement compass and heading display
    - Create `src/features/gps/presentation/components/compass.tsx`
    - Display heading as whole integer degrees (0-359) and cardinal direction label
    - Animate compass rotation via shortest rotational path with ≤ 300ms transition using Framer Motion
    - Show "—" and north orientation when insufficient position data
    - Respect reduced-motion preference
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 19.7_

  - [x] 13.4 Implement trip metrics grid
    - Create `src/features/trip/presentation/components/trip-metrics.tsx`
    - Display trip distance (km, 2 decimal places), elapsed time (HH:MM:SS), driving time, stop time
    - Display average speed (km/h, 1 decimal place), maximum speed (km/h, 1 decimal place)
    - Display remaining distance and ETA when destination set
    - Arrange in responsive grid for portrait orientation (360-428px width), no horizontal overflow
    - Use gradient backgrounds on metric cards, dark-mode-first design
    - _Requirements: 5.3, 7.2, 8.4, 9.2, 10.5, 6.2, 11.2, 19.1, 19.3_

  - [x] 13.5 Implement road name display component
    - Create `src/features/geocoding/presentation/components/road-name-display.tsx`
    - Display road name with "cached" indicator when offline
    - Display "Unknown Road" with coordinates when no name resolved
    - Truncate to 60 characters with ellipsis
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

  - [x] 13.6 Implement trip controls (start/stop)
    - Create `src/features/trip/presentation/components/trip-controls.tsx` with start/stop trip buttons
    - Minimum 44x44 CSS pixel touch targets with 8px spacing
    - Trigger trip start/end through Trip Zustand store
    - _Requirements: 7.5, 24.5_

  - [x] 13.7 Assemble main dashboard page
    - Create `src/app/(dashboard)/page.tsx` composing SpeedDisplay, TripMetrics, MapOverlay, TripControls, RoadNameDisplay, CoordinatesDisplay, Compass
    - Ensure all primary metrics visible without scrolling in portrait
    - Implement responsive layout (360-428px width mobile)
    - Connect GPS hook to start GPS tracking on active trip
    - _Requirements: 19.3, 21.3_

- [x] 14. Analytics engine
  - [x] 14.1 Implement trip summary generation
    - Create `src/features/analytics/domain/analytics-engine.ts`
    - Generate trip summary on trip end: distance, elapsed time, driving/stop time, avg/max speed, stops count, start/end location names
    - Implement speed-over-time chart data generation with max 30-second interval between points
    - Omit map view and speed chart if GPS trace has < 10 points
    - _Requirements: 13.1, 13.5, 13.6_

  - [x] 14.2 Write property test for trip summary generation (Property 18)
    - **Property 18: Trip Summary Generation**
    - Test that summary metrics are consistent: distance = sum of segments, driving + stop = elapsed, avg = distance/drivingTime
    - **Validates: Requirements 13.1**

  - [x] 14.3 Write property test for speed chart downsampling (Property 20)
    - **Property 20: Speed Chart Downsampling**
    - Test that max interval between adjacent chart points does not exceed 30 seconds
    - **Validates: Requirements 13.5**

  - [x] 14.4 Implement aggregate analytics (weekly/monthly)
    - Compute weekly (Monday-start) and monthly aggregate metrics: total distance, total driving time, avg trip speed, trip count, total stop time
    - Support custom date range up to 365 days with results within 3 seconds
    - Handle corrupted/missing trip data: display partial results with indication
    - Display empty state when no trips exist for selected period
    - _Requirements: 14.1, 14.3, 14.5, 14.6_

  - [x] 14.5 Write property test for analytics aggregation (Property 21)
    - **Property 21: Analytics Aggregation**
    - Test that aggregate total distance = sum of individual distances, total driving time = sum of individual, etc.
    - **Validates: Requirements 14.1, 14.3**

  - [x] 14.6 Implement route proximity clustering
    - Create `src/features/analytics/domain/route-clustering.ts`
    - Group trips by start/end coordinate proximity (500m radius using Haversine)
    - Return top 5 routes with minimum 3 trips per route
    - _Requirements: 14.4_

  - [x] 14.7 Write property test for route proximity clustering (Property 22)
    - **Property 22: Route Proximity Clustering**
    - Test that trips within 500m are grouped and only groups with ≥ 3 trips are returned
    - **Validates: Requirements 14.4**

  - [x] 14.8 Implement analytics UI
    - Create `src/app/(dashboard)/analytics/page.tsx` with numeric summaries and time-series chart (Recharts)
    - Create `src/features/analytics/presentation/components/speed-chart.tsx` for speed-over-time line chart
    - Create `src/features/analytics/presentation/components/distance-chart.tsx` for distance/trip count over time
    - Create trip summary screen `src/app/(dashboard)/trips/[id]/page.tsx` with map polyline (MapLibre) and speed chart
    - Display trip summary within 3 seconds of trip completion
    - _Requirements: 13.2, 13.3, 13.4, 14.2_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Sync engine
  - [x] 16.1 Implement connectivity monitor
    - Create `src/features/sync/infrastructure/connectivity-monitor.ts`
    - Detect online/offline state changes
    - Require 5 consecutive seconds of stable connection before triggering sync
    - Create `src/features/sync/presentation/hooks/use-sync-store.ts` Zustand store
    - _Requirements: 15.4_

  - [x] 16.2 Implement sync engine with exponential backoff
    - Create `src/features/sync/domain/sync-engine.ts` orchestrating sync operations
    - Process max 10 trip records per batch
    - Implement exponential backoff with jitter: initial 5s, max 5 minutes, max 10 retries
    - Mark records as 'sync_failed' after retry exhaustion; reattempt on next connectivity event
    - Create `src/features/sync/domain/conflict-resolver.ts` implementing last-write-wins on clientUpdatedAt
    - _Requirements: 12.2, 12.5, 12.6, 12.8, 22.2_

  - [x] 16.3 Write property test for sync batch size (Property 16)
    - **Property 16: Sync Batch Size**
    - Test that every batch contains between 1 and 10 records (or 0 if no pending)
    - **Validates: Requirements 12.2**

  - [x] 16.4 Write property test for conflict resolution (Property 17)
    - **Property 17: Conflict Resolution (Last-Write-Wins)**
    - Test that the record with the later clientUpdatedAt wins
    - **Validates: Requirements 12.5**

  - [x] 16.5 Write property test for exponential backoff (Property 26)
    - **Property 26: Exponential Backoff Calculation**
    - Test that backoff is between initialDelay × 2^n × 0.5 and min(initialDelay × 2^n, maxDelay)
    - **Validates: Requirements 22.2**

  - [x] 16.6 Implement sync API route
    - Create `src/app/api/sync/route.ts` handling POST with batch trip sync
    - Validate payload with Zod (return 422 on failure)
    - Implement last-write-wins conflict resolution on server side
    - Return synced IDs, conflicts with resolution, and failed IDs with errors
    - Enforce authenticated-only access
    - _Requirements: 12.2, 12.5, 20.4, 20.5_

  - [x] 16.7 Implement sync indicator UI
    - Create `src/features/sync/presentation/components/sync-indicator.tsx`
    - Show sync status, pending count, last sync timestamp
    - Show "sync_failed" indicator on trip entries in history list
    - _Requirements: 12.8_

- [x] 17. PWA and offline support
  - [x] 17.1 Implement Service Worker with caching strategies
    - Create `public/sw.js` (or build pipeline for `src/app/sw.ts`)
    - Implement cache-first strategy for static assets (HTML shell, CSS, JS, fonts, icons)
    - Implement network-first strategy for API calls with 5-second timeout fallback to cache
    - Implement map tile caching with 200MB max, 30-day TTL, background refresh
    - Register Service Worker in root layout
    - _Requirements: 15.1, 16.4_

  - [x] 17.2 Implement Web App Manifest
    - Create `src/app/manifest.ts` with display: "standalone", icons (192x192, 512x512 PNG + maskable), theme color, app name
    - _Requirements: 16.1_

  - [x] 17.3 Implement PWA install prompt and iOS guide
    - Create `src/features/pwa/domain/install-prompt.ts` handling beforeinstallprompt event
    - Create `src/features/pwa/presentation/components/install-banner.tsx` with custom install prompt, 7-day dismiss suppression
    - Create `src/features/pwa/presentation/components/ios-install-guide.tsx` with instructional overlay for iOS Safari
    - _Requirements: 16.2, 16.5_

  - [x] 17.4 Implement Screen Wake Lock
    - Create `src/features/pwa/infrastructure/wake-lock.ts` acquiring Screen Wake Lock during active trips
    - Create `src/features/pwa/presentation/hooks/use-wake-lock.ts` hook
    - Display persistent notification if Wake Lock API unsupported or denied
    - _Requirements: 16.6, 16.7_

  - [x] 17.5 Implement offline indicator and feature degradation
    - Create `src/features/pwa/presentation/components/offline-indicator.tsx` visible in fixed position during offline
    - Disable network-dependent features with text labels when offline
    - _Requirements: 15.6, 15.7_

  - [x] 17.6 Implement map tile pre-caching
    - Create `src/features/map/domain/tile-cache-strategy.ts` for tile pre-caching logic
    - Create `src/features/map/infrastructure/map-tile-cache.ts`
    - Pre-cache tiles for zoom levels 10-15 within 50km radius (configurable 10-100km), max 200MB
    - Refresh stale tiles (>30 days) in background when online
    - _Requirements: 15.5, 15.8_

- [x] 18. Premium UI, theme, and accessibility
  - [x] 18.1 Implement theme system and design tokens
    - Configure Tailwind CSS with dark-mode-first design tokens (backgrounds luminance < 10%)
    - Implement dark/light mode toggle persisted to localStorage, default dark
    - Apply theme within 100ms without full page reload
    - Use system font stack with minimum sizes: 14px labels, 24px secondary, 72px primary speed
    - _Requirements: 19.1, 19.4, 19.6, 19.8_

  - [x] 18.2 Implement shadcn/ui components and accessibility
    - Set up shadcn/ui as foundation for all interactive elements
    - Ensure minimum 44x44 CSS pixel touch targets with 8px spacing
    - Implement proper ARIA roles, labels, and states for all interactive elements
    - Implement ARIA live regions for critical metric changes (speed warnings, trip start/end, connectivity changes)
    - Implement reduced-motion support: disable non-essential animations when OS preference set
    - Ensure contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text in both themes
    - _Requirements: 19.5, 19.7, 24.1, 24.2, 24.3, 24.5_

  - [x] 18.3 Implement Framer Motion animations
    - Configure Framer Motion for metric update transitions (max 500ms duration, 60fps minimum)
    - Implement compass rotation animation (≤ 300ms via shortest path)
    - Implement map toggle transition (300ms)
    - Respect prefers-reduced-motion media query
    - _Requirements: 19.2, 4.2, 18.4_

  - [x] 18.4 Implement responsive layout and orientation handling
    - Implement responsive grid layout for portrait (360-428px) ensuring all primary metrics visible without scrolling
    - Handle orientation changes: reflow content without horizontal scrolling or loss of functionality
    - No zoom required for content access
    - _Requirements: 19.3, 24.4_

- [x] 19. Trip history UI
  - [x] 19.1 Implement trip history list page
    - Create `src/app/(dashboard)/trips/page.tsx` with paginated trip list
    - Create `src/features/trip/presentation/hooks/use-trip-history.ts` using TanStack Query
    - Support date range, distance, and duration filtering
    - Show sync status indicator on each trip entry
    - Display storage banner when IndexedDB > 80% capacity
    - _Requirements: 12.3, 12.4, 12.8, 13.3_

- [x] 20. Performance optimization
  - [x] 20.1 Optimize bundle size and loading performance
    - Implement code splitting per route and feature module
    - Lazy-load MapLibre GL JS, Recharts, and non-critical feature modules
    - Target ≤ 300KB compressed JavaScript bundle for initial load
    - Achieve LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1 under simulated 4G
    - _Requirements: 21.1, 21.2, 21.6_

  - [x] 20.2 Optimize runtime performance for long trips
    - Ensure GPS processing + UI update within 100ms of position receipt
    - Limit memory consumption to ≤ 50MB during 12-hour trips
    - Maintain ≤ 5% frame drops over any 10-second window (targeting 60fps)
    - Implement GPS trace compression for memory efficiency during long trips
    - _Requirements: 21.3, 21.4, 21.5, 22.5_

- [x] 21. Final integration and wiring
  - [x] 21.1 Wire all providers and layout composition
    - Create `src/app/layout.tsx` with provider hierarchy: AuthProvider → ThemeProvider → QueryProvider → PWAProvider
    - Create `src/app/(dashboard)/layout.tsx` with OfflineIndicator, navigation, auth guard
    - Ensure GPS Service starts on active trip and feeds data through the entire pipeline
    - Wire trip end → analytics generation → summary display flow
    - _Requirements: 19.1, 15.7_

  - [x] 21.2 Implement GPS permission flow
    - Display explanation of why location data is needed before requesting permission
    - Handle permission denial: show message that trip recording unavailable, disable GPS Service
    - _Requirements: 23.8, 23.9_

  - [x] 21.3 Implement crash recovery flow
    - On app launch, check IndexedDB activeTrip store for unfinished trips
    - Restore trip state and resume recording within 5 seconds
    - Display notification indicating previous trip has been resumed
    - _Requirements: 22.1, 22.6_

  - [x] 21.4 Write integration tests for critical flows
    - Test trip recording end-to-end: start → GPS updates → stop → persistence
    - Test offline operation: trip continues without network
    - Test sync flow: pending records sync when connectivity restored
    - Test auth flow: register, login, local data association
    - _Requirements: 22.1, 15.2, 15.4, 17.8_

- [x] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major implementation phases
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The implementation order ensures each task builds on previous work with no orphaned code
- Feature modules are self-contained: changes within one module don't break others
- TypeScript strict mode and ESLint rules enforce architectural boundaries at build time

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.5"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.7", "3.1", "3.2"] },
    { "id": 4, "tasks": ["4.1", "6.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "6.2", "6.3", "6.5"] },
    { "id": 6, "tasks": ["6.4", "6.6", "6.7", "6.8"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.4"] },
    { "id": 8, "tasks": ["7.3", "7.5", "7.6", "7.7", "7.9"] },
    { "id": 9, "tasks": ["7.8", "9.1"] },
    { "id": 10, "tasks": ["9.2", "10.1"] },
    { "id": 11, "tasks": ["10.2", "10.3", "10.4", "11.1", "11.5"] },
    { "id": 12, "tasks": ["11.2", "11.3", "11.6", "11.7"] },
    { "id": 13, "tasks": ["11.4", "13.1", "13.2", "13.3", "13.5", "13.6"] },
    { "id": 14, "tasks": ["13.4", "13.7"] },
    { "id": 15, "tasks": ["14.1", "14.4", "14.6"] },
    { "id": 16, "tasks": ["14.2", "14.3", "14.5", "14.7", "14.8"] },
    { "id": 17, "tasks": ["16.1"] },
    { "id": 18, "tasks": ["16.2", "16.6"] },
    { "id": 19, "tasks": ["16.3", "16.4", "16.5", "16.7"] },
    { "id": 20, "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5", "17.6"] },
    { "id": 21, "tasks": ["18.1", "18.2", "18.3", "18.4"] },
    { "id": 22, "tasks": ["19.1"] },
    { "id": 23, "tasks": ["20.1", "20.2"] },
    { "id": 24, "tasks": ["21.1", "21.2", "21.3"] },
    { "id": 25, "tasks": ["21.4"] }
  ]
}
```
