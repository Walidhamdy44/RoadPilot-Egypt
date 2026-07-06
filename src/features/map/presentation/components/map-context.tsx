'use client';

/**
 * MapContext provides the MapLibre GL JS map instance to child components.
 *
 * Components like PositionMarker and TripPolyline need access to the map
 * instance to add/update GeoJSON sources and layers. This context avoids
 * prop drilling and allows any descendant to interact with the map.
 */

import { createContext, useContext } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';

export interface MapContextValue {
  /** The MapLibre map instance, null until the map is loaded */
  map: MaplibreMap | null;
}

export const MapContext = createContext<MapContextValue>({ map: null });

/**
 * Hook to access the MapLibre map instance from context.
 * Returns null if the map is not yet loaded or the component is not
 * within a MapContext provider.
 */
export function useMapInstance(): MaplibreMap | null {
  const { map } = useContext(MapContext);
  return map;
}
