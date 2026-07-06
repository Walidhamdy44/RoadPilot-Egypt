'use client';

/**
 * PositionMarker renders the user's current GPS position on the map
 * as a pulsing blue dot using MapLibre's GeoJSON source + circle layer approach.
 *
 * This is more performant than HTML markers for real-time updates since it
 * avoids DOM manipulation on every position change — only the GeoJSON source
 * data is updated, and the GPU handles rendering.
 *
 * Requirements: 18.2
 */

import { useEffect, useRef } from 'react';
import { useMapInstance } from './map-context';
import type { ValidatedPosition } from '@/features/gps/domain/gps-types';

const POSITION_SOURCE_ID = 'current-position-source';
const POSITION_CIRCLE_LAYER_ID = 'current-position-circle';
const POSITION_PULSE_LAYER_ID = 'current-position-pulse';

export interface PositionMarkerProps {
  /** Current validated GPS position, null if no position available */
  position: ValidatedPosition | null;
  /** Whether to center the map on this position (during active trip) */
  centerOnPosition?: boolean;
}

export function PositionMarker({
  position,
  centerOnPosition = false,
}: PositionMarkerProps) {
  const map = useMapInstance();
  const sourceAddedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Add source and layers when map is available
  useEffect(() => {
    if (!map) return;

    function addSourceAndLayers() {
      if (!map || sourceAddedRef.current) return;

      // Ensure map style is loaded before adding sources/layers
      if (!map.isStyleLoaded()) {
        map.once('styledata', addSourceAndLayers);
        return;
      }

      // Add GeoJSON source for position
      map.addSource(POSITION_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
          properties: {},
        },
      });

      // Pulse ring layer (rendered below the dot)
      map.addLayer({
        id: POSITION_PULSE_LAYER_ID,
        type: 'circle',
        source: POSITION_SOURCE_ID,
        paint: {
          'circle-radius': 20,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.3,
          'circle-stroke-width': 0,
        },
      });

      // Solid circle layer (the dot itself)
      map.addLayer({
        id: POSITION_CIRCLE_LAYER_ID,
        type: 'circle',
        source: POSITION_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': '#3b82f6',
          'circle-opacity': 1,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      sourceAddedRef.current = true;

      // Start pulse animation
      startPulseAnimation();
    }

    addSourceAndLayers();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (map && sourceAddedRef.current) {
        try {
          if (map.getLayer(POSITION_CIRCLE_LAYER_ID)) {
            map.removeLayer(POSITION_CIRCLE_LAYER_ID);
          }
          if (map.getLayer(POSITION_PULSE_LAYER_ID)) {
            map.removeLayer(POSITION_PULSE_LAYER_ID);
          }
          if (map.getSource(POSITION_SOURCE_ID)) {
            map.removeSource(POSITION_SOURCE_ID);
          }
        } catch {
          // Map may already be destroyed
        }
        sourceAddedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Animate the pulse ring
  function startPulseAnimation() {
    if (!map) return;

    let start: number | null = null;
    const duration = 1500; // ms for one pulse cycle

    function animate(timestamp: number) {
      if (!map || !sourceAddedRef.current) return;

      if (start === null) start = timestamp;
      const elapsed = (timestamp - start) % duration;
      const progress = elapsed / duration;

      // Pulse radius: oscillates between 12 and 24
      const radius = 12 + 12 * Math.sin(progress * Math.PI);
      // Pulse opacity: fades out as it expands
      const opacity = 0.4 * (1 - progress * 0.7);

      try {
        if (map.getLayer(POSITION_PULSE_LAYER_ID)) {
          map.setPaintProperty(POSITION_PULSE_LAYER_ID, 'circle-radius', radius);
          map.setPaintProperty(POSITION_PULSE_LAYER_ID, 'circle-opacity', opacity);
        }
      } catch {
        // Layer may have been removed
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  // Update position data when position changes
  useEffect(() => {
    if (!map || !position || !sourceAddedRef.current) return;

    const source = map.getSource(POSITION_SOURCE_ID);
    if (source && 'setData' in source) {
      (source as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: {},
      });
    }

    // Center map on position during active trip
    if (centerOnPosition) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        duration: 500,
      });
    }
  }, [map, position, centerOnPosition]);

  // This component doesn't render any DOM - it manages map layers
  return null;
}
