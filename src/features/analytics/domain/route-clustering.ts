/**
 * Route proximity clustering module.
 *
 * Groups completed trips by start/end coordinate proximity using the Haversine
 * formula. Trips whose start AND end coordinates are both within 500m of an
 * existing cluster centroid are added to that cluster. Otherwise, a new cluster
 * is created.
 *
 * @module route-clustering
 */

import type { CompletedTrip } from '../../trip/domain/trip-types';
import { haversineDistanceKm } from '../../gps/domain/haversine';

/** A cluster of trips sharing similar start and end locations. */
export interface RouteCluster {
  /** Average start coordinates of all trips in the cluster */
  centroidStart: { lat: number; lng: number };
  /** Average end coordinates of all trips in the cluster */
  centroidEnd: { lat: number; lng: number };
  /** Trips belonging to this cluster */
  trips: CompletedTrip[];
  /** Number of trips in the cluster */
  tripCount: number;
}

/** Proximity radius in kilometers for clustering (500m). */
const CLUSTER_RADIUS_KM = 0.5;

/** Minimum number of trips required for a cluster to be included in results. */
const MIN_TRIPS_PER_CLUSTER = 3;

/** Maximum number of top clusters to return. */
const MAX_CLUSTERS = 5;

/**
 * Checks whether a trip's start and end coordinates are both within the
 * cluster radius of an existing cluster's centroid.
 */
function isWithinCluster(
  trip: CompletedTrip,
  cluster: RouteCluster
): boolean {
  const startDistance = haversineDistanceKm(
    trip.startCoordinates.lat,
    trip.startCoordinates.lng,
    cluster.centroidStart.lat,
    cluster.centroidStart.lng
  );

  if (startDistance > CLUSTER_RADIUS_KM) {
    return false;
  }

  const endDistance = haversineDistanceKm(
    trip.endCoordinates.lat,
    trip.endCoordinates.lng,
    cluster.centroidEnd.lat,
    cluster.centroidEnd.lng
  );

  return endDistance <= CLUSTER_RADIUS_KM;
}

/**
 * Recalculates the centroid of a cluster after adding a new trip.
 * The centroid is the average of all trip start/end coordinates in the cluster.
 */
function updateCentroid(cluster: RouteCluster): void {
  const count = cluster.trips.length;

  cluster.centroidStart = {
    lat: cluster.trips.reduce((sum, t) => sum + t.startCoordinates.lat, 0) / count,
    lng: cluster.trips.reduce((sum, t) => sum + t.startCoordinates.lng, 0) / count,
  };

  cluster.centroidEnd = {
    lat: cluster.trips.reduce((sum, t) => sum + t.endCoordinates.lat, 0) / count,
    lng: cluster.trips.reduce((sum, t) => sum + t.endCoordinates.lng, 0) / count,
  };

  cluster.tripCount = count;
}

/**
 * Groups completed trips into route clusters based on start/end coordinate
 * proximity (500m radius using Haversine distance).
 *
 * For each trip, the algorithm checks if its start AND end coordinates are
 * both within 500m of an existing cluster centroid. If yes, the trip is added
 * to that cluster and the centroid is recalculated. If no matching cluster is
 * found, a new cluster is created.
 *
 * Returns the top 5 clusters (sorted by trip count descending) that have at
 * least 3 trips each.
 *
 * @param trips - Array of completed trips to cluster
 * @returns Array of up to 5 RouteCluster objects, sorted by tripCount descending
 *
 * @example
 * ```ts
 * const clusters = clusterRoutes(completedTrips);
 * // clusters[0] has the most frequently traveled route
 * ```
 */
export function clusterRoutes(trips: CompletedTrip[]): RouteCluster[] {
  const clusters: RouteCluster[] = [];

  for (const trip of trips) {
    let matched = false;

    for (const cluster of clusters) {
      if (isWithinCluster(trip, cluster)) {
        cluster.trips.push(trip);
        updateCentroid(cluster);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        centroidStart: { lat: trip.startCoordinates.lat, lng: trip.startCoordinates.lng },
        centroidEnd: { lat: trip.endCoordinates.lat, lng: trip.endCoordinates.lng },
        trips: [trip],
        tripCount: 1,
      });
    }
  }

  return clusters
    .filter((cluster) => cluster.tripCount >= MIN_TRIPS_PER_CLUSTER)
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, MAX_CLUSTERS);
}
