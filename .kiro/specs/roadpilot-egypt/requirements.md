# Requirements Document

## Introduction

RoadPilot Egypt is a production-ready Progressive Web Application (PWA) designed as a mobile-first advanced driving dashboard. It combines navigation context with detailed real-time driving analytics for drivers traveling long distances across Egypt. This document defines the complete requirements for the initial release.

## Product Vision

RoadPilot Egypt is a production-ready Progressive Web Application (PWA) that serves as a mobile-first advanced driving dashboard combining navigation context with detailed real-time driving analytics. It is purpose-built for drivers traveling long distances across Egypt's highways and roads. RoadPilot Egypt is NOT a replacement for Google Maps — it is a complementary dashboard providing precision speed monitoring, trip analytics, and driving insights that navigation apps lack.

The application delivers a premium user experience inspired by Tesla Dashboard, Apple Maps, and modern iOS design language, while operating reliably in Egypt's connectivity-challenged environments through offline-first architecture.

## Goals

1. Provide drivers with accurate, real-time speed and trip analytics during long-distance travel across Egypt
2. Deliver a premium, native-like mobile experience through PWA technology
3. Ensure reliable operation in low-connectivity and offline scenarios
4. Enable drivers to track, save, and analyze their trip history over time
5. Establish a scalable foundation for future advanced features (AI assistant, OBD-II, dashcam)

## Problem Statement

Drivers in Egypt who travel long distances on highways (Cairo-Alexandria, Cairo-Hurghada, Cairo-Aswan) lack a dedicated tool for monitoring driving performance and trip analytics. Existing navigation apps focus on routing but do not provide:
- Precision speed monitoring with road context
- Detailed trip analytics (average speed, driving vs. stop time, distance tracking)
- Trip history and summaries for expense reporting or personal records
- Offline reliability in areas with poor cellular coverage (desert highways, remote roads)

## User Personas

### Persona 1: Long-Distance Commuter (Ahmed)
- **Role**: Business professional commuting between Egyptian cities weekly
- **Needs**: Accurate ETA, trip summaries for expense reports, speed monitoring for safety
- **Pain Points**: Unreliable connectivity on desert highways, no record of trips for reimbursement

### Persona 2: Ride-Share / Delivery Driver (Mostafa)
- **Role**: Professional driver operating daily across Cairo and intercity routes
- **Needs**: Trip logging, driving time vs. stop time tracking, daily/weekly analytics
- **Pain Points**: No way to accurately track actual driving hours, fuel cost estimation

### Persona 3: Road Trip Enthusiast (Sara)
- **Role**: Recreational driver exploring Egypt's scenic routes
- **Needs**: Trip recording, distance tracking, route memory, beautiful UI experience
- **Pain Points**: Losing trip data when offline, no consolidated trip history

## Glossary

- **Dashboard**: The primary screen of RoadPilot Egypt displaying real-time driving metrics
- **GPS_Service**: The module responsible for obtaining device GPS position, speed, and heading data via the Geolocation API
- **Trip_Engine**: The module responsible for calculating and maintaining trip metrics (distance, time, speed statistics)
- **Trip_Recorder**: The module responsible for persisting trip data locally and syncing to the server
- **Analytics_Engine**: The module responsible for generating trip summaries and driving analytics
- **Reverse_Geocoder**: The module responsible for resolving GPS coordinates to road names and locations using Nominatim
- **Route_Service**: The module responsible for calculating remaining distance and ETA using OpenRouteService
- **Offline_Manager**: The module responsible for caching data, managing service workers, and ensuring offline operation
- **Map_Renderer**: The module responsible for rendering the map view using MapLibre GL JS with OpenStreetMap tiles
- **Auth_Service**: The module responsible for user authentication and session management using Better Auth
- **Sync_Service**: The module responsible for synchronizing locally-stored trip data with the server when connectivity is restored
- **PWA_Shell**: The Progressive Web Application shell providing native-like behavior including install prompts, full-screen mode, and push notifications
- **Trip**: A recorded journey from start to end, containing all metrics and GPS trace data
- **Active_Trip**: A trip currently being recorded
- **ETA**: Estimated Time of Arrival at the destination
- **Heading**: The compass direction the device is moving, measured in degrees from true north
- **Stop_Time**: Duration during which the vehicle speed is below 2 km/h during an active trip
- **Driving_Time**: Duration during which the vehicle speed is at or above 2 km/h during an active trip

---

## Requirements

### Requirement 1: GPS Speed Display

**User Story:** As a driver, I want to see my current GPS speed displayed prominently and accurately, so that I can monitor my driving speed in real-time.

#### Acceptance Criteria

1. WHILE an Active_Trip is in progress, THE GPS_Service SHALL obtain the device position at a minimum frequency of once per second
2. WHEN a new GPS position is received, THE Dashboard SHALL display the current speed in km/h with a precision of one decimal place, converting from the Geolocation API's meters-per-second value by multiplying by 3.6
3. WHEN a new GPS position is received with a speed value, THE Dashboard SHALL update the speed display within 100 milliseconds of receiving the data
4. WHEN the GPS_Service reports a speed below 2 km/h, THE Dashboard SHALL display "0.0" as the current speed
5. IF the GPS_Service fails to obtain a position fix for 3 or more consecutive attempts, THEN THE Dashboard SHALL display a "No GPS Signal" indicator and retain the last known speed value with a stale-data indicator until a new valid position is received or 5 minutes elapse, whichever comes first
6. THE Dashboard SHALL display the speed in a large, high-contrast font with a minimum contrast ratio of 4.5:1 against the background and a minimum effective size of 72px equivalent
7. IF a new GPS position is received but the speed property is null or undefined, THEN THE Dashboard SHALL calculate the speed from the distance between the current and previous positions divided by the elapsed time, or display "0.0" if no previous position exists
8. WHEN an Active_Trip is started and no GPS position has yet been received, THE Dashboard SHALL display "—" as the speed value and a "Acquiring GPS" indicator until the first valid position with speed data is received

---

### Requirement 2: Current Road Display

**User Story:** As a driver, I want to see the name of the road or highway I am currently on, so that I have geographic context without switching to a navigation app.

#### Acceptance Criteria

1. WHEN the throttle interval of 3 seconds has elapsed since the last Nominatim request AND a new GPS position is received, THE Reverse_Geocoder SHALL resolve the coordinates to a road name or, if no road name is available, a locality name using Nominatim
2. WHEN the Reverse_Geocoder successfully resolves a road name, THE Dashboard SHALL display the road name within 2 seconds of the position update, truncated to a maximum of 60 characters with an ellipsis if the name exceeds that length
3. IF the Reverse_Geocoder fails to resolve a road name due to network unavailability, THEN THE Dashboard SHALL display the last known road name with a "cached" indicator
4. IF the Reverse_Geocoder returns a successful response that contains no road name and no locality name, THEN THE Dashboard SHALL display "Unknown Road" with the current GPS coordinates in decimal degrees format with six decimal places
5. THE Reverse_Geocoder SHALL throttle requests to Nominatim to a maximum of one request per 3 seconds, discarding intermediate GPS positions without queuing them
6. IF the Reverse_Geocoder fails to resolve a road name and no cached name exists, THEN THE Dashboard SHALL display "Unknown Road" with the current GPS coordinates in decimal degrees format with six decimal places
7. WHEN the Reverse_Geocoder receives a bilingual result containing both Arabic and English road names, THE Dashboard SHALL display the name matching the user's selected application language preference

---

### Requirement 3: GPS Coordinates Display

**User Story:** As a driver, I want to see my current GPS coordinates, so that I can share my exact location or reference it for navigation purposes.

#### Acceptance Criteria

1. WHILE an Active_Trip is in progress, THE Dashboard SHALL display the current latitude and longitude in decimal degrees format with six decimal places of precision
2. WHEN a new GPS position is received, THE Dashboard SHALL update the displayed coordinates within 100 milliseconds of receiving the position data
3. WHEN the user taps the copy action, THE Dashboard SHALL copy the current coordinates to the device clipboard in the format "latitude, longitude" (e.g., "30.044420, 31.235712") and display a confirmation indicator for 2 seconds
4. IF the GPS_Service fails to obtain a position fix, THEN THE Dashboard SHALL retain the last known coordinates with a stale-data indicator
5. IF the clipboard API is unavailable or the copy operation fails, THEN THE Dashboard SHALL display an error indicator and present the coordinates in a selectable text field for manual copying

---

### Requirement 4: Heading and Compass Display

**User Story:** As a driver, I want to see my current heading and a compass indicator, so that I know my direction of travel.

#### Acceptance Criteria

1. WHEN a new GPS position is received with heading data, THE Dashboard SHALL display the heading as a whole integer in degrees (0–359) and as a cardinal/intercardinal direction label using 45-degree segments: N (338–22), NE (23–67), E (68–112), SE (113–157), S (158–202), SW (203–247), W (248–292), NW (293–337)
2. WHEN a new GPS heading is received, THE Dashboard SHALL animate the compass indicator to the new heading via the shortest rotational path using a transition duration of no more than 300 milliseconds
3. IF the GPS_Service does not provide heading data AND the two most recent GPS positions are separated by at least 5 meters, THEN THE GPS_Service SHALL calculate the heading from the bearing between those two positions
4. IF fewer than two GPS positions are available OR the two most recent positions are separated by less than 5 meters and no GPS heading is provided, THEN THE Dashboard SHALL display "—" for the heading value and orient the compass indicator to 0 degrees (North) with no rotation animation
5. WHILE the current speed is below 2 km/h during an Active_Trip, THE Dashboard SHALL retain and display the last known heading value and suppress compass updates until speed reaches or exceeds 2 km/h

---

### Requirement 5: Trip Distance Tracking

**User Story:** As a driver, I want to track the total distance of my trip, so that I can know how far I have traveled.

#### Acceptance Criteria

1. WHEN a new GPS position is received during an Active_Trip, THE Trip_Engine SHALL calculate the distance from the previous position using the Haversine formula and add it to the cumulative trip distance
2. THE Trip_Engine SHALL discard distance increments calculated from GPS positions with an accuracy radius greater than 50 meters
3. WHILE an Active_Trip is in progress, THE Dashboard SHALL display the total trip distance in kilometers with two decimal places
4. THE Trip_Engine SHALL persist the cumulative trip distance to local storage after every 100 meters of travel to prevent data loss on unexpected termination

---

### Requirement 6: Remaining Distance Display

**User Story:** As a driver, I want to see the remaining distance to my destination, so that I can plan my driving time and fuel stops.

#### Acceptance Criteria

1. WHEN a destination is set for an Active_Trip, THE Route_Service SHALL calculate the remaining road-following distance from the current position to the destination using OpenRouteService and return the result within 10 seconds
2. WHEN the remaining distance is calculated, THE Dashboard SHALL display the value in kilometers with one decimal place
3. WHILE an Active_Trip is in progress AND a destination is set, THE Route_Service SHALL recalculate the remaining distance every 2 minutes or every 5 kilometers of travel, whichever occurs first
4. IF the Route_Service cannot reach OpenRouteService due to network unavailability, THEN THE Dashboard SHALL display the remaining distance estimated using straight-line (Haversine) distance with an "estimated" indicator
5. IF OpenRouteService returns a non-network error (such as no route found between the points), THEN THE Dashboard SHALL display the remaining distance estimated using straight-line (Haversine) distance with an "estimated" indicator and an error message indicating that route calculation is unavailable
6. IF no destination is set, THEN THE Dashboard SHALL hide the remaining distance metric
7. WHEN the driver deviates more than 1 kilometer from the last calculated route, THE Route_Service SHALL trigger an immediate recalculation of the remaining distance

---

### Requirement 7: Elapsed Trip Time

**User Story:** As a driver, I want to see the total elapsed time since I started my trip, so that I can track how long I have been traveling.

#### Acceptance Criteria

1. WHEN a trip is started, THE Trip_Engine SHALL record the trip start timestamp to local storage immediately and begin tracking total elapsed time calculated as the difference between the current device time and the persisted trip start timestamp
2. WHILE an Active_Trip is in progress, THE Dashboard SHALL display the elapsed trip time in HH:MM:SS format (supporting display up to 99:59:59), updating every second with a maximum drift of 1 second from actual elapsed time
3. WHILE an Active_Trip is in progress, THE Trip_Engine SHALL calculate elapsed time as the difference between the current device time and the trip start timestamp, ensuring accurate tracking regardless of whether the application is in the foreground, background, or the screen is off
4. IF the application is terminated unexpectedly during an Active_Trip, THEN THE Trip_Engine SHALL restore the elapsed time from the persisted trip start timestamp and resume display within 5 seconds of application relaunch
5. WHEN a trip is ended by the user, THE Dashboard SHALL stop updating the elapsed time display and show the final elapsed duration

---

### Requirement 8: Driving Time and Stop Time Detection

**User Story:** As a driver, I want to see my actual driving time separately from stop time, so that I can understand how much of my trip was spent moving versus stopped.

#### Acceptance Criteria

1. WHILE an Active_Trip is in progress AND the current speed is at or above 2 km/h, THE Trip_Engine SHALL increment the Driving_Time counter every second
2. WHILE an Active_Trip is in progress AND the current speed is below 2 km/h for a continuous duration of at least 30 seconds, THE Trip_Engine SHALL increment the Stop_Time counter every second and retroactively add the preceding 30-second grace period to Stop_Time
3. WHILE an Active_Trip is in progress AND the current speed is below 2 km/h for less than 30 continuous seconds, THE Trip_Engine SHALL classify those seconds as Driving_Time
4. WHILE an Active_Trip is in progress, THE Dashboard SHALL display both Driving_Time and Stop_Time in HH:MM:SS format, updating every second
5. WHEN a speed transition from below 2 km/h to at or above 2 km/h occurs after a confirmed stop (duration of at least 30 seconds below 2 km/h), THE Trip_Engine SHALL persist a stop event record to local storage containing the stop duration in seconds and the GPS coordinates at the start of the stop
6. WHILE an Active_Trip is in progress, THE Trip_Engine SHALL persist Driving_Time and Stop_Time values to local storage every 60 seconds
7. IF the GPS_Service fails to provide speed data for more than 10 seconds during an Active_Trip, THEN THE Trip_Engine SHALL pause both Driving_Time and Stop_Time counters and resume classification when speed data becomes available again

---

### Requirement 9: Average Speed Calculation

**User Story:** As a driver, I want to see my average speed, so that I can gauge my overall pace during the trip.

#### Acceptance Criteria

1. WHILE an Active_Trip is in progress, THE Trip_Engine SHALL recalculate the average speed every 5 seconds as the total trip distance (in kilometers) divided by the Driving_Time (in hours)
2. WHILE an Active_Trip is in progress, THE Dashboard SHALL display the current average speed in km/h with one decimal place, showing values from 0.0 to 999.9
3. IF the Driving_Time is zero, THEN THE Dashboard SHALL display "0.0" for the average speed
4. IF the calculated average speed exceeds 999.9 km/h, THEN THE Trip_Engine SHALL cap the displayed average speed at 999.9 km/h

---

### Requirement 10: Maximum Speed Tracking

**User Story:** As a driver, I want to see the maximum speed I have reached during the trip, so that I can be aware of my peak driving speed.

#### Acceptance Criteria

1. WHEN a trip is started, THE Trip_Engine SHALL initialize the maximum speed value to 0.0 km/h
2. WHEN a new GPS speed reading is received during an Active_Trip, THE Trip_Engine SHALL compare the speed to the current maximum and update the maximum if the new speed exceeds it
3. IF the GPS accuracy radius is greater than 30 meters at the time of a speed reading, THEN THE Trip_Engine SHALL discard that reading for maximum speed evaluation
4. IF a GPS speed reading exceeds 250 km/h, THEN THE Trip_Engine SHALL discard that reading as a sensor anomaly and not update the maximum speed
5. WHILE an Active_Trip is in progress, THE Dashboard SHALL display the maximum speed in km/h with one decimal place
6. WHEN the maximum speed is updated, THE Trip_Engine SHALL record the timestamp in ISO 8601 format and the GPS coordinates of the maximum speed event
7. THE Trip_Engine SHALL persist the current maximum speed value and its associated timestamp and coordinates to local storage every 60 seconds during an Active_Trip

---

### Requirement 11: ETA Calculation and Display

**User Story:** As a driver, I want to see an estimated time of arrival at my destination, so that I can plan my schedule.

#### Acceptance Criteria

1. WHEN a destination is set AND the remaining distance is known AND the average speed is at or above 5 km/h, THE Trip_Engine SHALL calculate the ETA as the current time plus the remaining distance divided by the current average speed
2. THE Dashboard SHALL display the ETA as an absolute time in HH:MM format (24-hour clock)
3. WHEN the average speed or remaining distance values are updated, THE Trip_Engine SHALL recalculate the ETA at a maximum frequency of once every 30 seconds
4. IF the average speed is below 5 km/h OR no destination is set, THEN THE Dashboard SHALL hide the ETA display
5. WHEN the Route_Service provides a route-based duration estimate, THE Trip_Engine SHALL use the route-based ETA in preference to the distance-divided-by-speed calculation, provided the route-based estimate was received within the last 5 minutes
6. IF the route-based duration estimate is older than 5 minutes AND the Route_Service cannot provide an updated estimate, THEN THE Trip_Engine SHALL fall back to the distance-divided-by-speed calculation

---

### Requirement 12: Trip History Persistence

**User Story:** As a driver, I want my trips to be saved automatically, so that I can review them later.

#### Acceptance Criteria

1. WHEN a trip is ended by the user, THE Trip_Recorder SHALL persist the trip record to IndexedDB including: total distance, elapsed time, driving time, stop time, average speed, maximum speed, start and end timestamps, all stop events with duration and coordinates, and the full GPS trace
2. WHEN network connectivity is available, THE Sync_Service SHALL synchronize all locally-stored trip records with a sync status of "pending" to the PostgreSQL database via the server API, processing a maximum of 10 trip records per sync batch
3. THE Trip_Recorder SHALL store trip records in IndexedDB with a structured schema that supports querying by date range, distance, and duration
4. IF local storage exceeds 80% of the available IndexedDB quota, THEN THE Trip_Recorder SHALL display a persistent in-app banner notifying the user and recommending syncing or clearing old data
5. THE Sync_Service SHALL use a last-write-wins conflict resolution strategy based on the trip end timestamp for trip records synced from multiple devices
6. WHEN a trip record is successfully synced to the server, THE Sync_Service SHALL mark the local record as synced and retain it locally for offline access until the local storage exceeds 80% of the IndexedDB quota
7. IF the Trip_Recorder fails to write the trip record to IndexedDB, THEN THE Trip_Recorder SHALL retry the write operation up to 3 times and, if all retries fail, SHALL display an error message indicating the trip could not be saved and hold the trip data in memory until a subsequent write attempt succeeds or the user dismisses the error
8. IF a sync operation fails for a trip record after the Sync_Service has exhausted all retry attempts, THEN THE Sync_Service SHALL mark the record as "sync_failed" and display an indicator on the trip entry in the trip history list

---

### Requirement 13: Trip Summary Generation

**User Story:** As a driver, I want to view a summary of each completed trip, so that I can review my driving performance and trip details.

#### Acceptance Criteria

1. WHEN a trip is ended, THE Analytics_Engine SHALL generate a trip summary containing: total distance (km, two decimal places), elapsed time (HH:MM:SS), driving time (HH:MM:SS), stop time (HH:MM:SS), average speed (km/h, one decimal place), maximum speed (km/h, one decimal place), number of stops, start location name, and end location name
2. WHEN a trip summary is generated, THE Dashboard SHALL display the trip summary on a dedicated summary screen within 3 seconds of trip completion
3. WHEN a user selects a trip from the trip history list, THE Dashboard SHALL display the trip summary on the same dedicated summary screen
4. WHEN a trip summary is generated, THE Analytics_Engine SHALL render a map view of the trip route as a polyline from the GPS trace using MapLibre GL JS, applying point reduction to display a maximum of 500 coordinate points for rendering performance
5. WHEN a trip summary is generated, THE Analytics_Engine SHALL produce a speed-over-time line chart using Recharts with the time axis labeled in minutes from trip start and the speed axis labeled in km/h, plotting data points at a maximum interval of 30 seconds
6. IF the trip GPS trace contains fewer than 10 position points, THEN THE Analytics_Engine SHALL generate the trip summary metrics but omit the map view and speed chart, displaying a message indicating insufficient data for visualizations

---

### Requirement 14: Driving Analytics

**User Story:** As a driver, I want to view aggregated analytics across my trips, so that I can understand my driving patterns over time.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute weekly (starting Monday) and monthly (calendar month) aggregate metrics: total distance, total driving time, average trip speed, number of trips, and total stop time
2. THE Dashboard SHALL display the aggregate analytics on a dedicated analytics screen showing numeric summaries and at least one time-series chart (distance or trip count over time) rendered using Recharts
3. WHEN the user selects a custom date range of up to 365 days, THE Analytics_Engine SHALL recompute aggregate metrics for the selected period and display results within 3 seconds
4. THE Analytics_Engine SHALL identify the user's most frequent routes based on start and end location proximity clustering (within 500 meters radius) and display up to the top 5 routes, each requiring a minimum of 3 trips to qualify
5. IF no trips exist for the selected period, THEN THE Dashboard SHALL display an empty state message indicating no trip data is available for the chosen time range
6. IF the Analytics_Engine cannot complete the aggregation due to corrupted or missing trip data, THEN THE Dashboard SHALL display the partial results that could be computed along with an indication that some trip data was excluded

---

### Requirement 15: Offline Operation

**User Story:** As a driver, I want the application to work reliably without internet connectivity, so that I can use it on desert highways and in areas with poor coverage.

#### Acceptance Criteria

1. THE Offline_Manager SHALL cache the application shell, static assets, and all JavaScript bundles required for trip recording, speed display, and trip history viewing using a Service Worker so that the application loads and operates without network connectivity
2. WHILE the device is offline, THE GPS_Service SHALL continue to obtain GPS positions at the same frequency as when online, and THE Trip_Engine SHALL continue all trip calculations with no degradation in update interval or accuracy
3. WHILE the device is offline, THE Trip_Recorder SHALL persist all trip data to IndexedDB, retaining up to 50 trip records or 80 MB of storage (whichever is reached first) before prompting the user to sync or delete old records
4. WHEN connectivity is restored after an offline period, THE Sync_Service SHALL automatically synchronize all pending trip records to the server within 60 seconds of detecting a stable connection (defined as network available for at least 5 consecutive seconds)
5. WHEN connectivity is available, THE Offline_Manager SHALL pre-cache map tiles for zoom levels 10 through 15 within a radius of 50 km (configurable between 10 km and 100 km) around the user's last known position, consuming no more than 200 MB of storage for cached tiles
6. IF a feature requires network access and the device is offline, THEN THE Dashboard SHALL display a persistent offline indicator visible on all screens, disable the unavailable feature's interactive elements, and display a text label identifying the feature as unavailable due to offline status
7. WHILE the device is offline, THE Dashboard SHALL display a visible offline status indicator in a fixed position on the Dashboard screen for the entire duration of the offline period
8. IF the Offline_Manager detects that cached map tiles are older than 30 days AND connectivity is available, THEN THE Offline_Manager SHALL refresh the stale tiles in the background without interrupting the user's current activity

---

### Requirement 16: Progressive Web Application Behavior

**User Story:** As a driver, I want the application to behave like a native mobile application, so that I have a seamless full-screen experience without browser chrome.

#### Acceptance Criteria

1. THE PWA_Shell SHALL provide a valid Web App Manifest with display mode set to "standalone", icons in PNG format at 192x192 and 512x512 pixels (including at least one maskable icon), theme color, and application name
2. WHEN the browser fires the beforeinstallprompt event, THE PWA_Shell SHALL display a custom install banner prompting the user to install the application, and IF the user dismisses the banner, THEN THE PWA_Shell SHALL not re-display the banner for at least 7 days
3. WHEN launched from the home screen, THE PWA_Shell SHALL display the application in full-screen standalone mode without browser navigation controls
4. THE PWA_Shell SHALL register a Service Worker that implements a cache-first strategy for static assets (HTML shell, CSS, JavaScript bundles, icons, and fonts) and a network-first strategy for API calls with a network timeout of 5 seconds before falling back to the cached response
5. THE PWA_Shell SHALL support the "Add to Home Screen" flow on Android (Chrome) via the native install prompt and on iOS (Safari) by displaying an in-app instructional overlay guiding the user through the manual "Add to Home Screen" steps in the share menu
6. WHILE an Active_Trip is in progress, THE PWA_Shell SHALL acquire a Screen Wake Lock to prevent the device screen from turning off
7. IF the Screen Wake Lock API is not supported by the browser or the wake lock request is denied, THEN THE PWA_Shell SHALL display a persistent notification informing the user that automatic screen-on is unavailable and recommending manual device display settings adjustment

---

### Requirement 17: User Authentication

**User Story:** As a user, I want to create an account and log in securely, so that my trip data is associated with my profile and accessible across devices.

#### Acceptance Criteria

1. THE Auth_Service SHALL support email/password registration and login using Better Auth
2. THE Auth_Service SHALL support OAuth login via Google as a social provider
3. WHEN a user registers with email/password, THE Auth_Service SHALL create a user profile in the PostgreSQL database with a unique identifier, email, display name (1 to 100 characters), and creation timestamp
4. WHEN a user logs in successfully, THE Auth_Service SHALL issue a session token with a configurable expiration (default 30 days)
5. IF an authentication request fails due to invalid credentials, THEN THE Auth_Service SHALL return an error message indicating that authentication failed without revealing whether the email exists in the system
6. IF a user attempts to register with an email address already associated with an existing account, THEN THE Auth_Service SHALL reject the registration and return an error message indicating that registration could not be completed, without confirming the email is already in use
7. WHILE a user is unauthenticated, THE Auth_Service SHALL allow the user to use the dashboard in local-only mode with no limit on the number of trips, but trip data SHALL be stored only in local storage and SHALL NOT be synchronized to the server
8. WHEN a user in local-only mode completes registration or login, THE Auth_Service SHALL associate any locally-stored trip data with the newly authenticated user profile and synchronize it to the server
9. IF a session token expires, THEN THE Auth_Service SHALL redirect the user to the login screen and preserve any unsynchronized trip data in local storage until the user re-authenticates

---

### Requirement 18: Map Display

**User Story:** As a driver, I want to see a map showing my current position and trip route, so that I have visual geographic context.

#### Acceptance Criteria

1. THE Map_Renderer SHALL display an interactive map using MapLibre GL JS with OpenStreetMap tiles at a default zoom level of 15, supporting zoom levels from 5 (regional) to 18 (street-level)
2. WHILE an Active_Trip is in progress, THE Map_Renderer SHALL center the map on the user's current GPS position and draw the trip route as a polyline from the GPS trace, appending each new GPS position to the polyline as it is received
3. THE Map_Renderer SHALL support pinch-to-zoom and pan gestures for touch interaction on mobile devices, maintaining a minimum rendering rate of 30 frames per second during gesture interactions
4. WHEN the user taps the map, THE Map_Renderer SHALL toggle between a minimized map overlay on the dashboard and a full-screen map view with a transition completing within 300 milliseconds
5. WHILE an Active_Trip is in progress AND a destination is set, THE Map_Renderer SHALL rotate the map to align with the user's heading as reported by the GPS_Service
6. IF map tiles are unavailable due to offline status and no cached tiles exist, THEN THE Map_Renderer SHALL display a placeholder grid with the user's position marker and trip polyline rendered on a blank canvas

---

### Requirement 19: Premium UI and Design System

**User Story:** As a user, I want a visually premium and modern interface, so that using the application feels delightful and professional.

#### Acceptance Criteria

1. THE Dashboard SHALL implement a dark-mode-first design with dark backgrounds (luminance below 10%), high-contrast metric text meeting a minimum 4.5:1 contrast ratio against the background, and gradient backgrounds on metric cards
2. THE Dashboard SHALL use animations and transitions powered by Framer Motion with a maximum animation duration of 500 milliseconds for metric updates, maintaining a minimum of 60 frames per second during transitions
3. THE Dashboard SHALL arrange metrics in a responsive grid layout for portrait orientation on mobile devices (360px - 428px width) such that all primary metrics (speed, distance, time) are visible without scrolling and no horizontal overflow occurs
4. THE Dashboard SHALL support both dark mode and light mode with a user-togglable preference persisted to local storage, defaulting to dark mode on first visit when no stored preference exists
5. THE Dashboard SHALL use the shadcn/ui component library as the foundation for all interactive elements with a minimum touch target size of 44x44 CSS pixels for all tappable controls
6. THE Dashboard SHALL render all text using a system font stack with a minimum font size of 14px for labels, 24px for secondary metrics, and 72px equivalent for the primary speed display
7. IF the user has enabled a reduced-motion preference at the operating system level, THEN THE Dashboard SHALL disable all non-essential animations and use instant transitions instead of animated ones
8. WHEN the user toggles between dark mode and light mode, THE Dashboard SHALL apply the new theme within 100 milliseconds without a full page reload

---

### Requirement 20: Data Validation

**User Story:** As a developer, I want all data inputs and outputs to be validated, so that the application maintains data integrity.

#### Acceptance Criteria

1. THE GPS_Service SHALL validate all incoming GPS position data using Zod schemas, rejecting positions with latitude outside -90 to 90, longitude outside -180 to 180, speed below 0 km/h or above 400 km/h, heading outside 0 to 360 degrees, or accuracy radius below 0 meters
2. IF the GPS_Service rejects a position due to validation failure, THEN THE GPS_Service SHALL discard the invalid position, retain the last valid position for display, and log the rejection reason without interrupting an Active_Trip
3. THE Trip_Recorder SHALL validate trip records against a Zod schema before persisting to IndexedDB or sending to the server API, requiring at minimum: a non-empty trip identifier, a valid start timestamp not in the future, a total distance of 0 or greater, and a driving time of 0 or greater
4. WHEN the server API receives a trip sync request, THE server SHALL validate the request payload using Zod against the trip record schema
5. IF the server API payload validation fails, THEN THE server SHALL return a 422 status with a response body containing an array of objects each identifying the invalid field path and a description of the constraint violated
6. THE Auth_Service SHALL validate registration and login payloads using Zod schemas, enforcing a valid email address format per RFC 5322 simplified pattern, a minimum password length of 8 characters, a maximum password length of 128 characters, and a display name between 1 and 100 characters for registration
7. IF any client-side Zod validation fails on user-submitted input, THEN THE Dashboard SHALL display an inline error message adjacent to the invalid field indicating the specific constraint that was not met

---

## Non-Functional Requirements

### Requirement 21: Performance

**User Story:** As a driver, I want the application to be fast and responsive, so that I can glance at metrics while driving safely.

#### Acceptance Criteria

1. THE Dashboard SHALL achieve a Largest Contentful Paint (LCP) of 2.5 seconds or less as measured by Lighthouse using simulated 4G throttling (9 Mbps download, 1.5 Mbps upload, 150 ms RTT) on a mid-range mobile device profile
2. THE Dashboard SHALL achieve a First Input Delay (FID) of 100 milliseconds or less and a Cumulative Layout Shift (CLS) score of 0.1 or less as measured by Lighthouse under the same simulated 4G throttling conditions as criterion 1
3. WHEN a new GPS position is received from the Geolocation API, THE GPS_Service SHALL process the position and THE Dashboard SHALL update the displayed metrics within 100 milliseconds
4. WHILE an Active_Trip is in progress, THE Dashboard SHALL maintain a rendering rate where no more than 5% of frames are dropped over any 10-second window (targeting 60 frames per second) on devices with at least 4 GB of RAM
5. WHILE an Active_Trip is in progress, THE Trip_Engine SHALL consume no more than 50 MB of device memory during a trip of up to 12 hours duration
6. THE Dashboard SHALL load with a total JavaScript bundle size of no more than 300 KB (compressed/transferred) to ensure acceptable parse and execution time on mid-range mobile devices

---

### Requirement 22: Reliability

**User Story:** As a driver, I want the application to be reliable and not lose my data, so that I can trust it for long trips.

#### Acceptance Criteria

1. WHEN the application restarts after an unexpected termination during an Active_Trip, THE Trip_Engine SHALL recover the trip state (cumulative distance, elapsed time, Driving_Time, Stop_Time, maximum speed, GPS trace, and stop events) from local storage and resume recording within 5 seconds of application launch
2. IF a synchronization attempt to the server fails, THEN THE Sync_Service SHALL retry with exponential backoff (initial delay 5 seconds, maximum delay 5 minutes, maximum 10 retries), and IF all 10 retries are exhausted, THEN THE Sync_Service SHALL mark the record as pending and reattempt synchronization on the next connectivity change event
3. IF the GPS_Service detects signal loss (no position fix for 10 consecutive seconds), THEN THE GPS_Service SHALL maintain the last known position, speed, and heading values, display a "GPS Signal Lost" indicator on the Dashboard, and resume tracking automatically when signal returns within 5 minutes
4. IF GPS signal loss exceeds 5 continuous minutes, THEN THE GPS_Service SHALL mark the trip segment as interrupted, stop accumulating distance, and WHEN signal returns, THE GPS_Service SHALL resume tracking from the new position without connecting the gap to the previous trace
5. WHILE an Active_Trip is in progress for up to 12 continuous hours, THE application SHALL maintain GPS update processing within 100 milliseconds, consume no more than 50 MB of memory, and sustain a 60 frames-per-second rendering rate on devices with at least 4 GB of RAM
6. WHEN the Trip_Engine successfully recovers an Active_Trip after unexpected termination, THE Dashboard SHALL display a notification indicating that the previous trip has been resumed

---

### Requirement 23: Security

**User Story:** As a user, I want my data to be secure, so that my location history and personal information are protected.

#### Acceptance Criteria

1. THE server SHALL enforce HTTPS for all API communications and redirect any HTTP request to the equivalent HTTPS URL
2. WHEN a user registers or changes their password, THE Auth_Service SHALL hash the password using bcrypt with a minimum work factor of 12 before persisting it
3. THE server SHALL implement rate limiting of 100 requests per minute per authenticated user and 20 requests per minute per unauthenticated IP address
4. IF a client exceeds the rate limit, THEN THE server SHALL reject further requests with a rate-limit-exceeded error response and include a Retry-After header indicating the number of seconds until the limit resets
5. THE server SHALL ensure that trip data is accessible only to the authenticated user who owns it (row-level authorization)
6. IF an authenticated user requests trip data belonging to another user, THEN THE server SHALL return an authorization error response that is indistinguishable from a not-found response
7. WHEN a user logs in successfully, THE Auth_Service SHALL store the session token in an httpOnly, Secure, SameSite=Strict cookie and SHALL NOT expose session tokens to client-side JavaScript
8. IF GPS permissions have not been granted, THEN THE application SHALL display an explanation of why location data is needed (trip recording and speed monitoring) and prompt the user to grant permission before activating the GPS_Service
9. IF the user denies GPS permission, THEN THE application SHALL display a message indicating that trip recording is unavailable without location access and SHALL NOT activate the GPS_Service

---

### Requirement 24: Accessibility

**User Story:** As a user with varying abilities, I want the application to be accessible, so that I can use it effectively.

#### Acceptance Criteria

1. THE Dashboard SHALL achieve WCAG 2.1 Level AA compliance for all interactive elements, including correct ARIA roles, labels, and states
2. THE Dashboard SHALL maintain a minimum contrast ratio of 4.5:1 for normal-size metric text (below 18pt) and 3:1 for large-size metric text (18pt and above) against background colors in both dark mode and light mode
3. WHEN a critical metric change occurs (speed exceeding a warning threshold, trip start, trip end, or connectivity status change), THE Dashboard SHALL announce the change to assistive technologies via an ARIA live region within 2 seconds of the event
4. WHEN the device orientation changes between landscape and portrait, THE Dashboard SHALL reflow all content to fit the viewport without horizontal scrolling, without loss of content or functionality, and without requiring the user to zoom
5. THE Dashboard SHALL ensure all interactive elements (buttons, toggles, map controls) have a minimum touch target size of 44 by 44 CSS pixels with at least 8 CSS pixels of spacing between adjacent targets

---

### Requirement 25: Scalability and Maintainability

**User Story:** As a development team, I want the codebase to be well-organized and scalable, so that we can add features efficiently over time.

#### Acceptance Criteria

1. THE application SHALL follow a feature-based architecture where each feature module contains its own components, hooks, stores, types, and API routes, and no feature module SHALL import directly from another feature module's internal files
2. THE application SHALL enforce strict TypeScript configuration with no implicit any types and strict null checks enabled, and the build SHALL produce zero type errors
3. THE application SHALL implement Clean Architecture within each feature module by enforcing ESLint import restriction rules that prevent the presentation layer from importing directly from the infrastructure layer, and the domain layer from importing from either presentation or infrastructure layers
4. THE application SHALL maintain a maximum cyclomatic complexity of 10 per function and a maximum of 300 lines per file as enforced by ESLint rules
5. THE application SHALL achieve a minimum of 80% code coverage on domain layer modules and Trip_Engine calculation functions via automated tests, as measured by the configured coverage tool
6. THE application SHALL provide a shared module containing common types, utilities, and UI components that any feature module may import, while feature modules SHALL remain prohibited from importing one another's internals

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| GPS Speed Accuracy | Within 2 km/h of actual speed | Comparison with vehicle speedometer in field tests |
| Trip Distance Accuracy | Within 2% of actual distance | Comparison with vehicle odometer on known routes |
| App Load Time (cached) | Under 1 second | Lighthouse performance audit |
| Offline Reliability | 100% trip recording without data loss when offline | Automated test suite simulating offline scenarios |
| User Retention (30-day) | 40% of registered users active after 30 days | Analytics tracking |
| PWA Install Rate | 25% of returning visitors install the PWA | Install event tracking |
| Trip Completion Rate | 95% of started trips successfully saved | Error tracking and trip state monitoring |

## Assumptions

1. Users will have GPS-capable smartphones (Android 8+ or iOS 14+) with functional GPS hardware
2. Users will grant location permissions to the application
3. The Nominatim API will remain freely available with the stated rate limits (1 request per second per client)
4. OpenRouteService free tier will provide sufficient quota for routing calculations (40 requests/minute)
5. Users will have occasional internet connectivity for initial app loading, authentication, and data synchronization
6. The Screen Wake Lock API is supported on the target mobile browsers (Chrome Android, Safari iOS 16.4+)
7. IndexedDB storage of up to 100 MB will be available on target devices
8. Neon PostgreSQL free/paid tier will provide adequate performance for the expected user base

## Constraints

1. The application must operate within Nominatim's usage policy (maximum 1 request per second, meaningful User-Agent header)
2. The application must operate within OpenRouteService free tier limits or the project must budget for a paid plan
3. GPS accuracy is inherently limited by device hardware and environmental conditions (urban canyons, tunnels)
4. PWA capabilities vary across browsers; iOS Safari has limited Service Worker and background execution support
5. The application must comply with Egypt's data privacy regulations regarding location data storage
6. Vercel serverless function execution is limited to 10 seconds on the free tier (60 seconds on Pro)
7. MapLibre GL JS requires WebGL support in the user's browser

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GPS accuracy degradation in desert/rural areas | Medium — inaccurate speed and distance | High | Filter readings by accuracy radius; discard low-quality fixes |
| Nominatim rate limiting or unavailability | Low — road name display fails | Medium | Cache road names aggressively; display coordinates as fallback |
| IndexedDB storage limits hit on long trips | High — trip data loss | Low | Monitor storage usage; compress GPS traces; alert user at 80% |
| iOS Safari PWA limitations | Medium — degraded offline experience | High | Document limitations; implement workarounds; test extensively on iOS |
| Battery drain from continuous GPS usage | Medium — users abandon app | High | Optimize GPS polling frequency; provide battery usage guidance |
| OpenRouteService quota exhaustion | Low — ETA calculation unavailable | Medium | Cache route calculations; fall back to Haversine estimation |
| Screen Wake Lock API not supported | Medium — screen turns off during trip | Low | Implement fallback using NoSleep.js library |

## Future Roadmap

The following features are planned for future releases and are NOT in scope for the initial version:

1. **Offline Maps** — Download and cache map tile regions for fully offline map display
2. **Trip Replay** — Animated playback of completed trips on the map with speed visualization
3. **Weather Integration** — Display current weather conditions and forecasts along the route
4. **Driving Score** — AI-powered scoring of driving behavior (acceleration, braking, cornering)
5. **AI Driving Assistant** — Intelligent suggestions for rest stops, fuel stations, and route optimization
6. **Voice Alerts** — Audio notifications for speed warnings, trip milestones, and navigation prompts
7. **OBD-II Integration** — Connect to vehicle diagnostics for RPM, fuel consumption, and engine data
8. **Dashcam Support** — Record and associate video with trip data
9. **Community Road Reports** — Crowdsourced road condition and hazard reporting
10. **Speed Camera Alerts** — Database of speed camera locations with proximity warnings
11. **Emergency Sharing** — Real-time location sharing with emergency contacts during trips
12. **Crash Detection** — Accelerometer-based crash detection with automatic emergency notifications
