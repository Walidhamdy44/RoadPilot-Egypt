/**
 * Tile Cache Strategy
 *
 * Calculates which map tiles to pre-cache based on a center position,
 * radius, and zoom levels using the standard OSM tile coordinate formula.
 *
 * OSM tile formula:
 *   x = floor((lng + 180) / 360 * 2^z)
 *   y = floor((1 - ln(tan(lat_rad) + 1/cos(lat_rad)) / π) / 2 * 2^z)
 */

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

/**
 * Convert latitude/longitude to tile x coordinate at a given zoom level.
 */
export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}

/**
 * Convert latitude/longitude to tile y coordinate at a given zoom level.
 */
export function latToTileY(lat: number, z: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z)
  );
}

/**
 * Calculate the bounding box tile range for a given center and radius.
 * Returns min/max tile coordinates that cover the specified radius.
 */
function getBoundingTiles(
  lat: number,
  lng: number,
  radiusKm: number,
  z: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  // Approximate degree offsets for the radius
  // 1 degree latitude ≈ 111.32 km
  const latOffset = radiusKm / 111.32;
  // 1 degree longitude varies with latitude
  const lngOffset = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  const minLat = Math.max(-85.0511, lat - latOffset);
  const maxLat = Math.min(85.0511, lat + latOffset);
  const minLng = Math.max(-180, lng - lngOffset);
  const maxLng = Math.min(180, lng + lngOffset);

  const maxTile = Math.pow(2, z) - 1;

  const minX = Math.max(0, lngToTileX(minLng, z));
  const maxX = Math.min(maxTile, lngToTileX(maxLng, z));
  // Note: tile Y increases downward, so minLat gives maxY
  const minY = Math.max(0, latToTileY(maxLat, z));
  const maxY = Math.min(maxTile, latToTileY(minLat, z));

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate all tile coordinates to cache for a given center, radius, and zoom levels.
 *
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param radiusKm - Radius in kilometers (default 50)
 * @param zoomLevels - Array of zoom levels to cache (default [10, 11, 12, 13, 14, 15])
 * @returns Array of tile coordinates to cache
 */
export function calculateTilesToCache(
  lat: number,
  lng: number,
  radiusKm: number = 50,
  zoomLevels: number[] = [10, 11, 12, 13, 14, 15]
): TileCoordinate[] {
  const tiles: TileCoordinate[] = [];

  for (const z of zoomLevels) {
    const { minX, maxX, minY, maxY } = getBoundingTiles(lat, lng, radiusKm, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

/**
 * Generate the tile URL for an OSM tile.
 * Uses standard OpenStreetMap tile URL pattern.
 */
export function getTileUrl(tile: TileCoordinate): string {
  // Use subdomains a, b, c for load balancing
  const subdomain = ['a', 'b', 'c'][(tile.x + tile.y) % 3];
  return `https://${subdomain}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
}
