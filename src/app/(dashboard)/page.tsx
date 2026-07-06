'use client';

/**
 * Main dashboard page for RoadPilot Egypt.
 *
 * Composes all primary driving widgets in a portrait-optimized vertical
 * stack layout for mobile devices (360-428px width). All primary metrics
 * are visible without scrolling in portrait orientation.
 *
 * Layout (top to bottom):
 * 1. Speed display (large, prominent)
 * 2. Road name
 * 3. Map (minimized overlay by default)
 * 4. Trip metrics grid
 * 5. Trip controls (start/stop)
 * 6. Compass + coordinates (bottom area)
 *
 * GPS tracking is started automatically when a trip is active.
 * Wrapped in AuthGuard for local-only mode support.
 *
 * **Validates: Requirements 19.3, 21.3**
 */

import { useEffect, useRef, useState, useCallback } from 'react';

import { GPSPermission } from '@/features/gps/presentation/components/gps-permission';
import { SpeedDisplay } from '@/features/gps/presentation/components/speed-display';
import { CoordinatesDisplay } from '@/features/gps/presentation/components/coordinates-display';
import { Compass } from '@/features/gps/presentation/components/compass';
import { TripMetrics } from '@/features/trip/presentation/components/trip-metrics';
import { TripControls } from '@/features/trip/presentation/components/trip-controls';
import { RoadNameDisplay } from '@/features/geocoding/presentation/components/road-name-display';
import { MapContainer } from '@/features/map/presentation/components/map-container';
import { PositionMarker } from '@/features/map/presentation/components/position-marker';
import { TripPolyline } from '@/features/map/presentation/components/trip-polyline';

import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import { useTripStore } from '@/features/trip/presentation/hooks/use-trip-store';
import { createGeolocationAdapter } from '@/features/gps/infrastructure/geolocation-adapter';
import { createGPSService, type GPSService } from '@/features/gps/domain/gps-service';
import { ReverseGeocoderService } from '@/features/geocoding/domain/reverse-geocoder';
import type { GeocodeResult } from '@/features/geocoding/domain/geocoder-types';

export default function DashboardPage() {
  return (
    <GPSPermission>
      <DashboardContent />
    </GPSPermission>
  );
}

function DashboardContent() {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);

  const position = useGPSStore((s) => s.position);
  const isActive = useTripStore((s) => s.isActive);
  const tripState = useTripStore((s) => s.tripState);

  const gpsServiceRef = useRef<GPSService | null>(null);
  const geocoderRef = useRef<ReverseGeocoderService | null>(null);

  const setPosition = useGPSStore((s) => s.setPosition);
  const setSignalLost = useGPSStore((s) => s.setSignalLost);
  const setSignalDenied = useGPSStore((s) => s.setSignalDenied);

  // Initialize geocoder
  useEffect(() => {
    geocoderRef.current = new ReverseGeocoderService();
  }, []);

  // Start/stop GPS tracking based on active trip state
  useEffect(() => {
    if (!isActive) {
      // Stop GPS when trip is not active
      if (gpsServiceRef.current) {
        gpsServiceRef.current.stop();
        gpsServiceRef.current = null;
      }
      return;
    }

    // Start GPS tracking when trip becomes active
    const adapter = createGeolocationAdapter();
    const service = createGPSService(adapter);
    gpsServiceRef.current = service;

    service.start({
      onPosition: (pos) => {
        setPosition(pos);
      },
      onError: (error) => {
        if (error.type === 'permission_denied') {
          setSignalDenied();
        } else {
          setSignalLost();
        }
      },
      onStateChange: () => {
        // State changes are propagated via onPosition/onError callbacks
      },
    });

    return () => {
      service.stop();
      gpsServiceRef.current = null;
    };
  }, [isActive, setPosition, setSignalLost, setSignalDenied]);

  // Reverse geocode on position updates (throttled internally by the service)
  useEffect(() => {
    if (!position || !geocoderRef.current) return;

    geocoderRef.current
      .resolve(position.latitude, position.longitude, 'en')
      .then((result) => {
        if (result) {
          setGeocodeResult(result);
        }
      })
      .catch(() => {
        // Geocoding failures are non-critical
      });
  }, [position]);

  const handleMapToggle = useCallback(() => {
    setMapExpanded((prev) => !prev);
  }, []);

  // Map center from current position or default (Cairo)
  const mapCenter: [number, number] = position
    ? [position.longitude, position.latitude]
    : [31.2357, 30.0444];

  const heading = position?.heading ?? 0;

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-3 max-w-[428px] mx-auto">
      {/* Speed Display — large and prominent */}
      <section className="flex justify-center py-4">
        <SpeedDisplay />
      </section>

      {/* Road Name */}
      <section className="px-1 pb-3">
        <RoadNameDisplay result={geocodeResult} />
      </section>

      {/* Map Overlay — minimized by default */}
      <section className="pb-3">
        <MapContainer
          center={mapCenter}
          heading={heading}
          expanded={mapExpanded}
          onToggle={handleMapToggle}
          hasDestination={!!tripState?.destination}
        >
          <PositionMarker
            position={position}
            centerOnPosition={isActive}
          />
          <TripPolyline
            tracePoints={tripState?.gpsTrace ?? []}
          />
        </MapContainer>
      </section>

      {/* Trip Metrics Grid */}
      <section className="pb-3">
        <TripMetrics />
      </section>

      {/* Trip Controls — start/stop */}
      <section className="flex justify-center pb-4">
        <TripControls />
      </section>

      {/* Bottom Area: Compass + Coordinates */}
      <section className="mt-auto flex items-end justify-between gap-4 pb-2">
        <div className="flex-1">
          <CoordinatesDisplay />
        </div>
        <div className="flex-shrink-0">
          <Compass />
        </div>
      </section>
    </main>
  );
}
