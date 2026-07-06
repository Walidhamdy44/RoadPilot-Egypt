# RoadPilot Egypt — App Guide

## What It Is

A mobile-first driving dashboard PWA for long-distance drivers in Egypt. It shows real-time speed, trip analytics, and navigation context — works offline on desert highways.

## Pages & Navigation

### `/login` — Login Page
- Email/password sign-in
- Google OAuth button
- Link to register
- Dark gradient background

### `/register` — Register Page
- Display name, email, password fields
- Google OAuth option
- Link to login

### `/` — Main Dashboard (Home)
- **No login required** — works in local-only mode
- If not logged in, shows a subtle "Sign in to sync" banner at the top

**Layout (top to bottom):**
1. **Speed Display** — Large 72px number showing current km/h (or "0.0" when stopped, "—" when acquiring GPS)
2. **Road Name** — Current road from Nominatim reverse geocoding (shows "cached" when offline)
3. **Map** — Minimized overlay showing position dot and trip polyline. Tap to expand full-screen
4. **Trip Metrics Grid** — 2-column grid:
   - Distance (km) | Elapsed Time
   - Driving Time | Stop Time
   - Avg Speed | Max Speed
   - Remaining Distance | ETA (only when destination set)
5. **Trip Controls** — Start/Stop trip button (large touch target)
6. **Compass + Coordinates** — Heading indicator with cardinal direction + lat/lng (tap to copy)

### `/analytics` — Analytics Page
- Weekly/Monthly toggle
- Summary cards: total distance, trips, driving time, stop time, avg speed
- Bar chart showing distance and trip count over time
- Empty state when no trips recorded

### `/trips/[id]` — Trip Summary Page
- Date and route name header
- Metric cards (same stats as dashboard but final values)
- Map with the trip's polyline route
- Speed-over-time line chart
- Omits visualizations if GPS trace < 10 points

## How a Trip Works

1. User taps **Start Trip**
2. GPS tracking begins (1Hz updates via Geolocation API)
3. Dashboard updates in real-time: speed, distance, time counters
4. Stop detection: if speed < 2 km/h for 30+ seconds, counts as a stop
5. Map shows live position dot and draws polyline as you drive
6. Road name updates every 3 seconds via Nominatim
7. User taps **Stop Trip**
8. Trip is saved to IndexedDB immediately
9. If logged in and online, trip syncs to server in the background

## Offline Behavior

- All core features work offline (GPS, trip recording, analytics)
- Map shows placeholder grid when no cached tiles
- Road name shows last cached value with "cached" indicator
- Trips accumulate in IndexedDB
- When connectivity returns (stable for 5 seconds), auto-syncs pending trips

## Local-Only vs Logged In

| Feature | Local-Only | Logged In |
|---------|-----------|-----------|
| Trip recording | ✅ | ✅ |
| GPS tracking | ✅ | ✅ |
| Analytics | ✅ (local data) | ✅ (local data) |
| Trip history | ✅ (local) | ✅ (local + server) |
| Cross-device sync | ❌ | ✅ |
| Cloud backup | ❌ | ✅ |

## Tech Stack (for reference)

- Next.js 16 (App Router)
- TypeScript strict
- Tailwind CSS (dark-mode-first)
- MapLibre GL JS (maps)
- Zustand (client state)
- IndexedDB via `idb` (local persistence)
- PostgreSQL/Neon (server, Drizzle ORM)
- Better Auth (authentication)
- Recharts (charts)
- Framer Motion (animations)
