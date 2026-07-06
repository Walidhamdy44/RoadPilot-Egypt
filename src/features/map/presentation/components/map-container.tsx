"use client";

/**
 * MapLibre GL JS map container component.
 *
 * Features:
 * - Lazy-loads MapLibre GL JS via useEffect (SSR-safe)
 * - OpenStreetMap raster tiles with default zoom 15, range 5-18
 * - Pinch-to-zoom and pan gestures enabled by default
 * - Tap-to-toggle between minimized overlay and full-screen (300ms Framer Motion transition)
 * - Heading-aligned map rotation when destination is set
 * - Offline placeholder grid with position marker when tiles unavailable
 * - Dark-mode-first styling with dark overlay on map tiles
 *
 * Requirements: 18.1, 18.3, 18.4, 18.5, 18.6
 */

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MapContext } from "./map-context";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const TRANSITION_DURATION_MS = 300;
const TRANSITION_DURATION_S = TRANSITION_DURATION_MS / 1000;

export interface MapContainerProps {
  /** Map center as [lng, lat] */
  center: [number, number];
  /** Zoom level (default: 15, range 5-18) */
  zoom?: number;
  /** Current heading in degrees (0-360) for rotation, 0 means north */
  heading?: number;
  /** Whether the map is in full-screen (expanded) mode */
  expanded: boolean;
  /** Callback to toggle between minimized overlay and full-screen */
  onToggle: () => void;
  /** Whether a destination is set (enables heading-aligned rotation) */
  hasDestination?: boolean;
  /** Child components that need map access (PositionMarker, TripPolyline) */
  children?: ReactNode;
}

/** Framer Motion variants for minimize/expand animation */
const containerVariants = {
  minimized: {
    position: "relative" as const,
    height: "200px",
    width: "100%",
    inset: "auto",
    zIndex: 1,
    borderRadius: "0.75rem",
  },
  expanded: {
    position: "fixed" as const,
    height: "100vh",
    width: "100vw",
    inset: "0px",
    zIndex: 50,
    borderRadius: "0px",
  },
};

const containerTransition = {
  duration: TRANSITION_DURATION_S,
  ease: "easeInOut" as const,
};

export function MapContainer({
  center,
  zoom = DEFAULT_ZOOM,
  heading = 0,
  expanded,
  onToggle,
  hasDestination = false,
  children,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [maplibreModule, setMaplibreModule] =
    useState<typeof import("maplibre-gl") | null>(null);

  const [lng, lat] = center;

  // Detect offline status
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Lazy-load MapLibre GL JS (SSR guard — requires window)
  useEffect(() => {
    let cancelled = false;

    async function loadMapLibre() {
      try {
        const ml = await import("maplibre-gl");
        // Import CSS for MapLibre styles
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (!cancelled) {
          setMaplibreModule(ml);
        }
      } catch {
        if (!cancelled) {
          setIsOffline(true);
        }
      }
    }

    loadMapLibre();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map once MapLibre is loaded
  useEffect(() => {
    if (!maplibreModule || !mapContainerRef.current || mapInstanceRef.current)
      return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maplibregl: typeof import("maplibre-gl") =
      (maplibreModule as any).default ?? maplibreModule;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [OSM_TILE_URL],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: MIN_ZOOM,
            maxzoom: MAX_ZOOM,
          },
          // Dark overlay for dark-mode-first design
          {
            id: "dark-overlay",
            type: "background",
            paint: {
              "background-color": "rgba(0, 0, 0, 0.35)",
            },
          },
        ],
      },
      center: [lng, lat],
      zoom: zoom,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // Enable touch gestures (Requirement 18.3)
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: false,
    });

    // Pinch-to-zoom and pan gesture support
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();

    // Detect offline from tile load errors (Requirement 18.6)
    map.on("error", (e) => {
      if (
        e.error?.message?.includes("Failed to fetch") ||
        e.error?.message?.includes("NetworkError")
      ) {
        setIsOffline(true);
      }
    });

    map.on("load", () => {
      setIsMapLoaded(true);
      setMapInstance(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapInstance(null);
      setIsMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maplibreModule]);

  // Update center position
  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !isMapLoaded) return;

    map.setCenter([lng, lat]);
  }, [lng, lat, isMapLoaded]);

  // Update zoom level
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    map.setZoom(zoom);
  }, [zoom, isMapLoaded]);

  // Heading-aligned map rotation when destination is set (Requirement 18.5)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || !hasDestination) return;

    // Rotate map to align with heading (negative so map rotates, not icon)
    map.rotateTo(-heading, { duration: TRANSITION_DURATION_MS });
  }, [heading, hasDestination, isMapLoaded]);

  // Resize map after expand/collapse animation completes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const timeout = setTimeout(() => {
      map.resize();
    }, TRANSITION_DURATION_MS + 20);

    return () => clearTimeout(timeout);
  }, [expanded]);

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  // Offline placeholder (Requirement 18.6)
  if (isOffline && !isMapLoaded) {
    return (
      <motion.div
        className="relative overflow-hidden border border-border bg-neutral-900 cursor-pointer"
        variants={containerVariants}
        animate={expanded ? "expanded" : "minimized"}
        transition={containerTransition}
        onClick={handleToggle}
        role="img"
        aria-label="Map unavailable - offline"
      >
        {/* Placeholder grid pattern */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border border-neutral-700/40" />
          ))}
        </div>

        {/* Position marker */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
            <div className="absolute inset-0 h-4 w-4 rounded-full bg-blue-500 animate-ping opacity-40" />
          </div>
        </div>

        {/* Offline label */}
        <div className="absolute bottom-3 left-3 right-3 text-center">
          <span className="inline-block rounded-md bg-black/70 px-3 py-1.5 text-xs font-medium text-neutral-300 backdrop-blur-sm">
            Map offline — no cached tiles
          </span>
        </div>

        {/* Coordinates display */}
        <div className="absolute top-3 left-3">
          <span className="inline-block rounded-md bg-black/70 px-2 py-1 text-xs font-mono text-neutral-400 backdrop-blur-sm">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <MapContext.Provider value={{ map: mapInstance }}>
      <motion.div
        className="relative overflow-hidden border border-border"
        variants={containerVariants}
        animate={expanded ? "expanded" : "minimized"}
        transition={containerTransition}
      >
        {/* Map canvas */}
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          data-testid="map-container"
        />

        {/* Toggle button — tap to expand/collapse (Requirement 18.4) */}
        <button
          type="button"
          className="absolute top-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border border-neutral-600/50 hover:bg-black/80 transition-colors"
          onClick={handleToggle}
          aria-label={expanded ? "Minimize map" : "Expand map to full screen"}
        >
          {expanded ? <MinimizeIcon /> : <ExpandIcon />}
        </button>

        {/* Loading indicator */}
        {!isMapLoaded && maplibreModule && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </motion.div>

      {/* Child components (PositionMarker, TripPolyline) that need map access */}
      {children}
    </MapContext.Provider>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-200"
      aria-hidden="true"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-200"
      aria-hidden="true"
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
