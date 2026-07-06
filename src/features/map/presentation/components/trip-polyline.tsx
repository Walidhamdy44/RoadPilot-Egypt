'use client';

/**
 * TripPolyline renders the GPS trace of an active or completed trip
 * as a blue polyline on the map using a GeoJSON line source.
 *
 * The component efficiently updates in real-time by replacing the GeoJSON
 * source data whenever new trace points are appended. MapLibre handles
 * the diff and re-render on the GPU.
 *
 * Requirements: 18.2
 */

import { useEffect, useRef } from 'react';
import { useMapInstance } from './map-context';
import type { GPSTracePoint } from '@/features/trip/domain/trip-types';

const POLYLINE_SOURCE_ID = 'trip-polyline-source';
const POLYLINE_LAYER_ID = 'trip-polyline-layer';

export interface TripPolylineProps {
  /** GPS trace points to render as a polyline */
  tracePoints: GPSTracePoint[];
}

/**
 * Convert an array of GPSTracePoints to a GeoJSON LineString Feature.
 * Returns null if fewer than 2 points (can't draw a line).
 */
function traceToGeoJSON(
  tracePoints: GPSTracePoint[]
): GeoJSON.Feature<GeoJSON.LineString> | GeoJSON.Feature<GeoJSON.Point> {
  if (tracePoints.length === 0) {
    // Return an empty point to avoid source errors
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0],
      },
      properties: {},
    };
  }

  if (tracePoints.length === 1) {
    // Single point — can't draw a line
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [tracePoints[0].lng, tracePoints[0].lat],
      },
      properties: {},
    };
  }

  const coordinates = tracePoints.map((point) => [point.lng, point.lat]);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {},
  };
}

export function TripPolyline({ tracePoints }: TripPolylineProps) {
  const map = useMapInstance();
  const sourceAddedRef = useRef(false);

  // Add source and layer when map is available
  useEffect(() => {
    if (!map) return;

    function addSourceAndLayer() {
      if (!map || sourceAddedRef.current) return;

      // Ensure map style is loaded before adding sources/layers
      if (!map.isStyleLoaded()) {
        map.once('styledata', addSourceAndLayer);
        return;
      }

      // Add GeoJSON source for the polyline
      map.addSource(POLYLINE_SOURCE_ID, {
        type: 'geojson',
        data: traceToGeoJSON(tracePoints),
      });

      // Add the line layer
      map.addLayer(
        {
          id: POLYLINE_LAYER_ID,
          type: 'line',
          source: POLYLINE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        },
        // Insert below position marker layers so the marker renders on top
        'current-position-pulse'
      );

      sourceAddedRef.current = true;
    }

    addSourceAndLayer();

    return () => {
      if (map && sourceAddedRef.current) {
        try {
          if (map.getLayer(POLYLINE_LAYER_ID)) {
            map.removeLayer(POLYLINE_LAYER_ID);
          }
          if (map.getSource(POLYLINE_SOURCE_ID)) {
            map.removeSource(POLYLINE_SOURCE_ID);
          }
        } catch {
          // Map may already be destroyed
        }
        sourceAddedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update polyline data in real-time when new trace points are appended
  useEffect(() => {
    if (!map || !sourceAddedRef.current) return;

    const source = map.getSource(POLYLINE_SOURCE_ID);
    if (source && 'setData' in source) {
      (source as maplibregl.GeoJSONSource).setData(traceToGeoJSON(tracePoints));
    }
  }, [map, tracePoints]);

  // This component doesn't render any DOM - it manages map layers
  return null;
}
