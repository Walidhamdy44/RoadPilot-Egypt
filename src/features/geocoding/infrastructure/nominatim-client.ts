/**
 * Nominatim reverse geocoding client.
 *
 * Makes HTTP requests to the Nominatim API with a proper User-Agent header
 * and supports bilingual results (Arabic/English) via the accept-language param.
 */

import type {
  GeocodeResult,
  Language,
  NominatimResponse,
} from '../domain/geocoder-types';
import { truncateRoadName, buildUnknownRoadText } from '../domain/road-name-utils';

/** Base URL for the Nominatim reverse geocoding API. */
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

/** User-Agent header identifying this application per Nominatim usage policy. */
const USER_AGENT = 'RoadPilotEgypt/1.0';

/**
 * Extracts the road name from a Nominatim response.
 * Checks address.road, address.highway, then falls back to display_name.
 */
function extractRoadName(response: NominatimResponse): string | null {
  const address = response.address;
  if (address) {
    if (address.road) return address.road;
    if (address.highway) return address.highway;
    if (address.pedestrian) return address.pedestrian;
    if (address.path) return address.path;
  }
  return null;
}

/**
 * Extracts a locality name from a Nominatim response as fallback.
 */
function extractLocalityName(response: NominatimResponse): string | null {
  const address = response.address;
  if (address) {
    if (address.suburb) return address.suburb;
    if (address.village) return address.village;
    if (address.town) return address.town;
    if (address.city) return address.city;
    if (address.county) return address.county;
    if (address.state) return address.state;
  }
  // Fall back to display_name if no specific locality field found
  if (response.display_name) return response.display_name;
  return null;
}

/**
 * Builds the accept-language header value based on user preference.
 * The preferred language comes first, followed by the other.
 */
function buildAcceptLanguage(language: Language): string {
  return language === 'ar' ? 'ar,en' : 'en,ar';
}

/**
 * Performs a reverse geocode request to Nominatim.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @param language - User's preferred language ('ar' or 'en')
 * @returns GeocodeResult with road name and display text
 * @throws Error if the network request fails (caller handles offline fallback)
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  language: Language
): Promise<GeocodeResult> {
  const acceptLanguage = buildAcceptLanguage(language);
  const url = `${NOMINATIM_BASE_URL}?lat=${lat}&lon=${lng}&format=json&accept-language=${acceptLanguage}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }

  const data: NominatimResponse = await response.json();

  const roadName = extractRoadName(data);
  const localityName = extractLocalityName(data);

  // If we have a road name, truncate and return
  if (roadName) {
    const truncated = truncateRoadName(roadName);
    return {
      roadName: truncated,
      displayText: truncated,
      cached: false,
    };
  }

  // If we have a locality name but no road, use locality
  if (localityName) {
    const truncated = truncateRoadName(localityName);
    return {
      roadName: truncated,
      displayText: truncated,
      cached: false,
    };
  }

  // No result at all — display "Unknown Road" with coordinates
  return {
    roadName: null,
    displayText: buildUnknownRoadText(lat, lng),
    cached: false,
  };
}

/**
 * Exported for testing only — extracts road name from raw response.
 */
export const _internal = {
  extractRoadName,
  extractLocalityName,
  buildAcceptLanguage,
};
